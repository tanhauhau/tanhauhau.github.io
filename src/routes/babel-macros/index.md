---
title: Babel macros
date: '2019-10-08T08:00:00Z'
series: Intermediate Babel
tags: 
  - JavaScript
  - babel
  - ast
  - transform
description: "Custom JavaScript syntax is hard to maintain, custom babel transform plugin is no better. That's why we need Babel macros."
---

In this article, I am going to talk about Babel macros.

## Motivation

In my previous post, ["Creating custom JavaScript syntax with Babel"](/creating-custom-javascript-syntax-with-babel), I've shown you detailed steps on how you can create a custom syntax and write transform plugin or polyfills so that the syntax can be run in browsers today.

However, it is purely educational, and I am not recommending you to create your custom JavaScript syntax for production projects for several reasons:

### Documentation and community support

If anything goes wrong, the great JavaScript community out there has no idea what is the `@@` ([the curry function syntax we created previously](/creating-custom-javascript-syntax-with-babel#overview)) means. Meaning the support that a new developer to the team can get is only as good as your documentation.

### Tooling

You need to make all the tooling you use to work. I mean eslint, prettier, Flowtype/TypeScript, your editor...

### Maintainability

If the forked version has a bug, do you have enough support to fix it?
If the babel upstream fixed a bug or added a feature, how often do you merge the upstream into your fork?

### Consistency of the syntax

This is the hardest part of creating a new syntax. An added syntax is an added mental concept for the language users, so the new mental model should be transferable to every scenario of the language.

Take our `@@` syntax, for example, if it works for a normal function declaration, it's expected to work for anonymous functions, arrow functions, class methods. Have you thought about how it would work with generator functions and async functions? If a curried function returns another function, does that make the returned function curried as well?

## Compile-time vs Runtime

I think you get my point. But the idea of having a magical syntax that keeps the code elegant and short is enticing.

Take [optional chaining](https://v8.dev/features/optional-chaining) for example, before having the optional chaining operator `?.`, we had a few ways to write `props?.user?.friends?.[0]?.friend`, which is:

**a mundane to write, not easy to read (less intentional), but most efficient possible:**

```js
const firstFriend =
  props.user && props.user.friends && props.user.friends[0]
    ? props.user.friends[0].friend
    : null;

// or with ternary
const firstFriend = props
  ? props.user
    ? props.user.friends
      ? props.user.friends
        ? props.user.friends[0]
          ? props.user.friends[0].friend
          : null
        : null
      : null
    : null
  : null;
```

**easy to write, easy to read, but with slightly more runtime overhead:**

```js
const firstFriend = idx(props, _ => _.user.friends[0].friend);

function idx(input, accessor) {
  try {
    return accessor(input);
  } catch (e) {
    return null;
  }
}
```

> <b>Note:</b> I've tried to search online whether a `try-catch` is more expensive, however the <a href="https://stackoverflow.com/questions/19727905/in-javascript-is-it-expensive-to-use-try-catch-blocks-even-if-an-exception-is-n">search result</a> <a href="https://news.ycombinator.com/item?id=3922963">is not</a> <a href="https://stackoverflow.com/questions/3217294/javascript-try-catch-performance-vs-error-checking-code">conclusive</a>. <a href="https://twitter.com/lihautan">Let me know</a> if you have a conclusive research on this.

Is there a third option that is **easy to read and write, yet without the try-catch runtime overhead?**

Well, if you look at the [`facebookincubator/idx`](https://github.com/facebookincubator/idx) library, it uses a [Babel plugin](https://github.com/facebookincubator/idx#babel-plugin) to search through require or imports of `idx` and replaces all its usages, for example when you write:

```js
import idx from 'idx';

function getFriends() {
  return idx(props, _ => _.user.friends[0].friends);
}
```

it gets transformed into:

```js
function getFriends() {
  return props.user == null
    ? props.user
    : props.user.friends == null
    ? props.user.friends
    : props.user.friends[0] == null
    ? props.user.friends[0]
    : props.user.friends[0].friends;
}
```

So your code is easy to read, and no runtime overhead. You get the best of both worlds!

Though nothing is perfect. Here, I wanted to point out some of my personal opinions about this approach:

> While maintaining a good developer experience (DX), we've shifted the runtime overhead to compile time.

You can keep the way you wanted to write the code while having the compiler to transform the code to something you are _"supposed"_ to write.

A win-win solution.

**How do we apply this technique to other similar situations?**

First, you need to [write a Babel plugin](/step-by-step-guide-for-writing-a-babel-transformation).

Secondly, you need a **marker** to target the transformation.

In this example, the default import from the `"idx"` module is the **marker**, all the usage of the default import would be transformed by the Babel plugin.

Thirdly, you need to update your babel configuration. For every new plugin, **you need to add them in**; **you need to make sure the order of plugin is correct**.

**What if there's a bug in the Babel plugin?**

This would be the most confusing part for the new developers on the codebase.

In this example, if the `idx` function has a bug, it is natural for developers to dig into the source code of `idx`. However, `"idx"` is nothing but a **marker** for the `babel-plugin-idx` to transform away. So if there's any bug, it should be inside `babel-plugin-idx` instead of `idx`.

Besides, the bug may be due to the configuration of the Babel plugin instead of the code logic itself. However if you change the configuration, it could affect all the usages of the `idx` function, because **babel configuration is global**.

---

To summarise, I think that this solution is a win-win for DX vs User Experience (UX), however, if we can make the transform plugin more accessible to all developers, eg: without having to update babel configuration for every new transform plugin, easier to debug, and a localized configuration.

Well, you are looking at [babel macros](https://github.com/kentcdodds/babel-plugin-macros). 👀

## Babel macros

So, here's how it would look like with babel macro:

**You add `babel-plugin-macro` to babel config**

And that's all the change you need for babel configuration.

```js
/// filename: babel.config.js
module.exports = {
  // highlight-next-line
  plugins: ['babel-plugin-macros'],
};
```

**You write your own macro**

```js
/// filename: src/utils/idx.macro.js
const { createMacro } = require('babel-plugin-macros');
module.exports = createMacro(({ state, references }) => {
  references.default.forEach(referencePath => {
    idx_transform(referencePath.parentPath, state);
  });
});
```

We'll talk about the code later, one thing to take away here is that your filename has to end with `.macro` or `.macro.js`.

**Use it**

```js
/// filename: src/index.js
import idx from './utils/idx.macro';

function getFriends() {
  return idx(props, _ => _.user.friends[0].friends);
}
```

As you can see here, if there's something wrong about `idx`, the user would know which file exactly to look at.

You don't get the disconnection between the module `idx` and the plugin `babel-plugin-idx`.

Besides, if you want to modify configuration, say for this usage, you can do it easily:

```js
/// filename: src/index.js
import idx from './utils/idx.macro';

function getFriends() {
  // highlight-next-line
  return idx(props, _ => _.user.friends[0].friends, { strict: false });
}
```

Simple and explicit. Isn't that great?

### So what is Babel macros again?

**Babel macros** is a concept from the [`babel-plugin-macros`](https://github.com/kentcdodds/babel-plugin-macros), which defines the standard interface between compile-time code transformation and your runtime code.

In compile-time, `babel-plugin-macros` will look for all `import` or `require` from modules ends with `.macro`, finds all references of the imported variables, and passes them to the `.macro` file to transform them.

The imported variables are not restricted to be a function, it can be a variable, a type from type system (Flow / TypeScript).

If it is a default export, you can name it any way you like, if it is a named export, you can reassign to another variable name too.

Cool, so how can I write my Babel macros?

## How to write Babel macros

[Kent C Dodds](http://kentcdodds.com) has written [a fantastic guide for macro authors](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md).

Please go read it.

If you insist to stay, I am going to show you how I wrote my Babel macros, in particular, the [mock.macro](https://www.npmjs.com/package/mock.macro). And hopefully, along the way, you learned how to write your Babel macros as well.

### mock.macro

**Motivation**

Usually, when working with a backend developer on a frontend application, I would use static type to define the API schema. For example, a user api would look like this:

```js
async function fetchUser(
  userId: number
): Response<{
  id: number,
  username: string,
  email: string,
  address: string,
}> {}
```

However while waiting for the backend developer to develop the API, I would have to use mock data for development:

```js
async function fetchUser(userId: number): Response<{ ... }> {
  // highlight-start
  return {
    id: 1,
    username: 'tanhauhau',
    email: 'tanhauhau@foo.bar',
    address: '123 Bar Street, Foo',
  };
  // highlight-end
}
```

And along the way, due to unforeseen circumstances and lack of foresight, the response schema of the API was changed multiple times:

```js
async function fetchUser(
  userId: number
): Response<{
  id: number,
  username: string,
  email: string,
  address: string,
  // highlight-next-line
  contact: string,
}> {
  return {
    id: 1,
    username: 'tanhauhau',
    email: 'tanhauhau@foo.bar',
    address: '123 Bar Street, Foo',
    // highlight-next-line
    contact: '0123456789',
  };
}
```

Here you see I need to update both the type definition as well as the mock data. This reminds me of [the double declaration problem](https://babel-blade.netlify.com/docs/declarationdeclaration) coined by [@swyx](https://twitter.com/swyx) [in his talk](https://www.youtube.com/watch?v=1WNT5RCENfo). Which means that this could potentially be solved with Babel macros.

So in my head, I imagined with Babel macros, I could write:

```js
import type { MockResponse } from './mock.macro';

async function fetchUser(
  userId: number
): MockResponse<{
  id: number,
  username: string,
  email: string,
  address: string,
  contact: string,
}> {
  // TODO:
}
```

and when I call the function `fetchUser`, I would get my mock response in return.

**Implementing mock.macro**

Implementing mock.macro requires some basic knowledge about Abstract Syntax Tree (AST) and writing babel transformation, you can check out [the step-by-step guide I've written previously](/step-by-step-guide-for-writing-a-babel-transformation).

Implementing Babel macros is quite easy, the api from the `babel-plugin-macros` is pretty straightforward, all you need is to provide a default export to your macro file:

```js
/// filename: mock.macro.js

const { createMacro } = require('babel-plugin-macros');

module.exports = createMacro(function({ references, state, babel }) {
  // TODO:
});
```

`createMacro` takes in a callback function, which is executed when someone imports this macro file. It provides:

- **references**

All the reference that was imported from the macro file.

For example:

```js
import foo, { bar } from './foobar.macro';
```

will give you an object, with the import name as the `key`, and array of paths as the `value`:

```js
{
  "default": [],
  "bar": [],
}
```

Inside the array, you can get all paths where the imported names are referenced. For example:

```js
import foo from './foobar.macro.js';

foo('a') // <-- referenced `foo`

function bar() {
  return foo + 1; // <-- referenced `foo`
}

function baz(foo) {
  return foo + 1; // <-- not referencing `foo`
}

// `references`:
{
  "default": [
    Path, // foo in foo('a')
    Path, // foo in foo + 1
  ]
}
```

- **state**

It gives you the current state of the file being traversed.

So, in this example, I need to transform all the references of `MockResponse`:

```js
/// filename: mock.macro.js
module.exports = createMacro(function({ references, state, babel }) {
  // highlight-start
  if (references.MockResponse.length > 0) {
    // TODO:
  }
  // highlight-end
});
```

Next, I need to figure out how the transformed code would look like:

```js
import faker from 'faker';

async function fetchUser(userId) {
  return {
    id: faker.random.number(),
    username: faker.random.word(),
    email: faker.random.word(),
    address: faker.random.word(),
    contact: faker.random.word(),
  };
}
```

I decided to use [faker.js](https://github.com/marak/Faker.js/) as the random data generator.

So I have to import `faker` at the top of the file:

```js
module.exports = createMacro(function({ references, state, babel }) {
  if (references.MockResponse.length > 0) {
    // highlight-start
    const fakerIdentifier = state.file.path.scope.generateUidIdentifier(
      'faker'
    );
    const importStatement = babel.template("import %%FAKER%% from 'faker'")({
      FAKER: fakerIdentifier,
    });
    state.file.path.unshiftContainer('body', importStatement);
    // highlight-end
  }
});
```

Next, for each references of `MockRespone`, I need to find the `FunctionDeclaration` that it belongs to, and insert a `ReturnStatement` into the top of the function body:

```js
module.exports = createMacro(function({ references, state, babel }) {
  if (references.MockResponse.length > 0) {
    // ... inserting `import faker from 'faker'`

    // highlight-start
    references.MockResponse.forEach(reference => {
      const functionDeclaration = reference.getFunctionParent();
      const typeDef = reference.parentPath.get('typeParameters.params.0').node;
      functionDeclaration
        .get('body')
        .unshiftContainer(
          'body',
          babel.types.returnStatement(
            generateFakerCode(fakerIdentifier, typeDef)
          )
        );
    });
    // highlight-end
  }
});
```

In the `generateFakerCode`, I'll generate a AST node based on the node type of the `typeDef`:

```js
function generateFakerCode(fakerIdentifier, typeDef) {
  switch (typeDef.type) {
    case 'ObjectTypeAnnotation':
      return babel.types.objectExpression(
        typeDef.properties.map(property =>
          babel.types.objectProperty(
            babel.types.identifier(property.key.name),
            generateFakerCode(fakerIdentifier, property.value)
          )
        )
      );
    case 'NumberTypeAnnotation':
      return babel.expression('%%FAKER%%.random.number()')({
        FAKER: fakerIdentifier,
      });
    case 'StringTypeAnnotation':
      return babel.expression('%%FAKER%%.random.word()')({
        FAKER: fakerIdentifier,
      });
    case 'BooleanTypeAnnotation':
      return babel.expression('%%FAKER%%.random.boolean()')({
        FAKER: fakerIdentifier,
      });
    default:
      throw new MacroError(`Unknown type definition: ${typeDef.type}`);
  }
}
```

That's it! A generated mock function via type definition using Babel macros.

One last thing, what happens when the API is ready, and you want to disable the mocking behavior?

We can read the 2nd parameter of the `MockResponse`:

```js
async function fetchUser(...): MockResponse</*...*/, false> {}
```

If the 2nd parameter is `false`, we disable the mocking behavior:

```js
/// filename: mock.macro.js

const { createMacro } = require('babel-plugin-macros');

module.exports = createMacro(
  function({ references, state, babel, config }) {
    references.MockResponse.forEach(reference => {
      const functionDeclaration = reference.getFunctionParent();
      const typeDef = reference.parentPath.get('typeParameters.params.0').node;

      // highlight-start
      // if the 2nd argument present and it is 'false', disable mocking
      const secondParam = reference.parentPath.get('typeParameters.params.1');
      if (secondParam && secondParam.isBooleanLiteralTypeAnnotation({ value: false })) {
        return;
      }
      // highlight-end
      // ...insert return statement
    }
  }
);
```

> You can find the full code from [Github](https://github.com/tanhauhau/mock.macro).

## Summary

Sometimes, it is more efficient to move runtime abstraction and complexity to compile time. However, developing and maintaining a babel plugin for each of them may be difficult to maintain and debug, as there's a gap between the code written and build time plugin, eg: `idx` and `babel-plugin-idx`.

`babel-plugin-macros` solves this by allow users to import `.macro` files directly into the codebase. The explicit import bridges the gap between build-time and runtime and allows the user to develop and debug their macro easily.

## Further Reading

- [babel-plugin-macros](https://github.com/kentcdodds/babel-plugin-macros) by [Kent C. Dodds](https://twitter.com/kentcdodds/)
- [I Can Babel Macros (and So Can You!)](https://www.youtube.com/watch?v=1WNT5RCENfo) by [Shawn Wang](https://twitter.com/swyx)
- [`babel-plugin-macros` Usage for macros authors](https://github.com/kentcdodds/babel-plugin-macros/blob/master/other/docs/author.md)
- [Zero-config code transformation with babel-plugin-macros](https://babeljs.io/blog/2017/09/11/zero-config-with-babel-macros) by [Kent C. Dodds](https://twitter.com/kentcdodds/)
- [Awesome list for Babel macros](https://github.com/jgierer12/awesome-babel-macros)
- The idea of converting type definition to mock generator comes from [Manta Style, the futuristic API Mock Server for Frontend](https://github.com/Cryrivers/manta-style)