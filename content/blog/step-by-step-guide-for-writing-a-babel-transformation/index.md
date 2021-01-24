---
title: Step-by-step guide for writing a custom babel transformation
date: '2019-09-12T08:00:00Z'
tags: 
  - JavaScript
  - babel
  - ast
  - transform
description: Writing your first babel plugin
series: Intermediate Babel
---

Today, I will share a step-by-step guide for writing a custom [babel](https://babeljs.io/docs/en/babel-core) transformation. You can use this technique to write your own automated code modifications, refactoring and code generation.

## What is babel?

[Babel](https://babeljs.io/docs/en/) is a JavaScript compiler that is mainly used to convert ECMAScript 2015+ code into backward compatible version of JavaScript in current and older browsers or environments. Babel uses a [plugin system](https://babeljs.io/docs/en/plugins) to do code transformation, so anyone can write their own transformation plugin for babel.

Before you get started writing a transformation plugin for babel, you would need to know what is an [Abstract Syntax Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree).

### What is Abstract Syntax Tree (AST)?

I am not sure I can explain this better than the amazing articles out there on the web:

- [Leveling Up One’s Parsing Game With ASTs](https://medium.com/basecs/leveling-up-ones-parsing-game-with-asts-d7a6fc2400ff) by [Vaidehi Joshi
  ](https://twitter.com/vaidehijoshi) \* _(Highly recommend this one! 👍)_
- Wikipedia's [Abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree)
- [What is an Abstract Syntax Tree
  ](https://blog.bitsrc.io/what-is-an-abstract-syntax-tree-7502b71bde27) by [Chidume Nnamdi](https://twitter.com/ngArchangel)

To summarize, AST is a tree representation of your code. In the case of JavaScript, the JavaScript AST follows the [estree specification](https://github.com/estree/estree).

AST represents your code, the structure and the meaning of your code. So it allows the compiler like [babel](https://babeljs.io) to understand the code and make specific meaningful transformation to it.

So now you know what is AST, let's write a custom babel transformation to modify your code using AST.

## How to use babel to transform code

The following is the general template of using babel to do code transformation:

```js
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';

const code = 'const n = 1';

// parse the code -> ast
const ast = parse(code);

// transform the ast
traverse(ast, {
  enter(path) {
    // in this example change all the variable `n` to `x`
    if (path.isIdentifier({ name: 'n' })) {
      path.node.name = 'x';
    }
  },
});

// generate code <- ast
const output = generate(ast, code);
console.log(output.code); // 'const x = 1;'
```

> You would need to install [@babel/core](https://www.npmjs.com/package/@babel/core) to run this. `@babel/parser`, `@babel/traverse`, `@babel/generator` are all dependencies of `@babel/core`, so installing `@babel/core` would suffice.

So the general idea is to parse your code to AST, transform the AST, and then generate code from the transformed AST.

```
code -> AST -> transformed AST -> transformed code
```

However, we can use another API from `babel` to do all the above:

```js
import babel from '@babel/core';

const code = 'const n = 1';

const output = babel.transformSync(code, {
  plugins: [
    // your first babel plugin 😎😎
    function myCustomPlugin() {
      return {
        visitor: {
          Identifier(path) {
            // in this example change all the variable `n` to `x`
            if (path.isIdentifier({ name: 'n' })) {
              path.node.name = 'x';
            }
          },
        },
      };
    },
  ],
});

console.log(output.code); // 'const x = 1;'
```

Now, you have written your first [babel transform plugin](https://babeljs.io/docs/en/plugins) that replace all variable named `n` to `x`, how cool is that?!

> Extract out the function `myCustomPlugin` to a new file and export it. [Package and publish your file as a npm package](https://medium.com/@bretcameron/how-to-publish-your-first-npm-package-b224296fc57b) and you can proudly say you have published a babel plugin! 🎉🎉

At this point, you must have thought: _"Yes I've just written a babel plugin, but I have no idea how it works..."_, so fret not, let's dive in on how you can write the babel transformation plugin yourself!

So, here is the step-by-step guide to do it:

### 1. Have in mind what you want to transform from and transform into

In this example, I want to prank my colleague by creating a babel plugin that will:

- reverse all the variables' and functions' names
- split out string into individual characters

```js
function greet(name) {
  return 'Hello ' + name;
}

console.log(greet('tanhauhau')); // Hello tanhauhau
```

into

```js
function teerg(eman) {
  return 'H' + 'e' + 'l' + 'l' + 'o' + ' ' + eman;
}

console.log(teerg('t' + 'a' + 'n' + 'h' + 'a' + 'u' + 'h' + 'a' + 'u')); // Hello tanhauhau
```

Well, we have to keep the `console.log`, so that even the code is hardly readable, it is still working fine. _(I wouldn't want to break the production code!)_

### 2. Know what to target on the AST

Head down to a [babel AST explorer](https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImZ1bmN0aW9uIGdyZWV0KG5hbWUpIHtcbiAgcmV0dXJuICdIZWxsbyAnICsgbmFtZTtcbn1cblxuY29uc29sZS5sb2coZ3JlZXQoJ3RhbmhhdWhhdScpKTsgLy8gSGVsbG8gdGFuaGF1aGF1In0=), click on different parts of the code and see where / how it is represented on the AST:

![targeting](./images/targeting.png 'Selecting the code on the left and see the corresponding part of the AST light up on the right')

If this is your first time seeing the AST, play around with it for a little while and get the sense of how is it look like, and get to know the names of the node on the AST with respect to your code.

So, now we know that we need to target:

- **Identifier** for variable and function names
- **StringLiteral** for the string.

### 3. Know how the transformed AST looks like

Head down to the [babel AST explorer](https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlLCJoaWRlQ29tbWVudHMiOnRydWV9LCJjb2RlIjoiZnVuY3Rpb24gdGVlcmcoZW1hbikge1xuICByZXR1cm4gXCJIXCIgKyBcImVcIiArIFwibFwiICsgXCJsXCIgKyBcIm9cIiArIFwiIFwiICsgZW1hbjtcbn1cblxuY29uc29sZS5sb2codGVlcmcoXCJ0XCIgKyBcImFcIiArIFwiblwiICsgXCJoXCIgKyBcImFcIiArIFwidVwiICsgXCJoXCIgKyBcImFcIiArIFwidVwiKSk7IC8vIEhlbGxvIHRhbmhhdWhhdVxuIn0=) again, but this time around with the output code you want to generate.

![output](./images/output.png 'You can see that what used to be a `StringLiteral` is now a nested `BinaryExpression`')

Play around and think how you can transform from the previous AST to the current AST.

For example, you can see that `'H' + 'e' + 'l' + 'l' + 'o' + ' ' + eman` is formed by nested `BinaryExpression` with `StringLiteral`.

### 4. Write code

Now look at our code again:

```js
function myCustomPlugin() {
  return {
    // highlight-start
    visitor: {
      Identifier(path) {
        // ...
      },
    },
    // highlight-end
  };
}
```

The transformation uses [the visitor pattern](https://en.wikipedia.org/wiki/Visitor_pattern).

During the traversal phase, babel will do a [depth-first search traversal](https://en.wikipedia.org/wiki/Depth-first_search) and visit each node in the AST. You can specify a callback method in the visitor, such that while visiting the node, babel will call the callback method with the node it is currently visiting.

In the visitor object, you can specify the name of the node you want to be `callback`ed:

```js
function myCustomPlugin() {
  return {
    visitor: {
      Identifier(path) {
        console.log('identifier');
      },
      StringLiteral(path) {
        console.log('string literal');
      },
    },
  };
}
```

Run it and you will see that "string literal" and "identifier" is being called whenever babel encounters it:

```
identifier
identifier
string literal
identifier
identifier
identifier
identifier
string literal
```

---

Before we continue, let's look at the parameter of `Identifer(path) {}`. It says `path` instead of `node`, what is the difference between `path` and `node`? 🤷‍

In babel, `path` is an abstraction above `node`, it provides the link between nodes, ie the `parent` of the node, as well as information such as the `scope`, `context`, etc. Besides, the `path` provides method such as `replaceWith`, `insertBefore`, `remove`, etc that will update and reflect on the underlying AST node.

> You can read more detail about `path` in [Jamie Kyle](https://jamie.build)'s [babel handbook](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#paths)

---

So let's continue writing our babel plugin.

#### Transforming variable name

As we can see from the [AST explorer](https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImZ1bmN0aW9uIGdyZWV0KG5hbWUpIHtcbiAgcmV0dXJuICdIZWxsbyAnICsgbmFtZTtcbn1cblxuY29uc29sZS5sb2coZ3JlZXQoJ3RhbmhhdWhhdScpKTsgLy8gSGVsbG8gdGFuaGF1aGF1In0=), the name of the `Identifier` is stored in the property called `name`, so what we will do is to reverse the `name`.

```js
Identifier(path) {
  path.node.name = path.node.name
    .split('')
    .reverse()
    .join('');
}
```

Run it and you will see:

```js
function teerg(eman) {
  return 'Hello ' + eman;
}

elosnoc.gol(teerg('tanhauhau')); // Hello tanhauhau
```

We are almost there, except we've accidentally reversed `console.log` as well. How can we prevent that?

Take a look at the AST again:

![member expression](./images/member-expression.png)

`console.log` is part of the `MemberExpression`, with the `object` as `"console"` and `property` as `"log"`.

So let's check that if our current `Identifier` is within this `MemberExpression` and we will not reverse the name:

```js
Identifier(path) {
  if (
    !(
      path.parentPath.isMemberExpression() &&
      path.parentPath
        .get('object')
        .isIdentifier({ name: 'console' }) &&
      path.parentPath.get('property').isIdentifier({ name: 'log' })
    )
  ) {
   path.node.name = path.node.name
     .split('')
     .reverse()
     .join('');
 }
}
```

And yes, now you get it right!

```js
function teerg(eman) {
  return 'Hello ' + eman;
}

console.log(teerg('tanhauhau')); // Hello tanhauhau
```

So, why do we have to check whether the `Identifier`'s parent is not a `console.log` `MemberExpression`? Why don't we just compare whether the current `Identifier.name === 'console' || Identifier.name === 'log'`?

You can do that, except that it will not reverse the variable name if it is named `console` or `log`:

```js
const log = 1;
```

> So, how do I know the method `isMemberExpression` and `isIdentifier`? Well, all the node types specified in the [@babel/types](https://babeljs.io/docs/en/babel-types) have the `isXxxx` validator function counterpart, eg: `anyTypeAnnotation` function will have a `isAnyTypeAnnotation` validator. If you want to know the exhaustive list of the validator functions, you can head over [to the actual source code](https://github.com/babel/babel/blob/master/packages/babel-types/src/validators/generated/index.js).

#### Transforming strings

The next step is to generate a nested `BinaryExpression` out of `StringLiteral`.

To create an AST node, you can use the utility function from [`@babel/types`](https://babeljs.io/docs/en/babel-types). `@babel/types` is also available via `babel.types` from `@babel/core`.

```js
StringLiteral(path) {
  const newNode = path.node.value
    .split('')
    .map(c => babel.types.stringLiteral(c))
    .reduce((prev, curr) => {
      return babel.types.binaryExpression('+', prev, curr);
    });
  path.replaceWith(newNode);
}
```

So, we split the content of the `StringLiteral`, which is in `path.node.value`, make each character a `StringLiteral`, and combine them with `BinaryExpression`. Finally, we replace the `StringLiteral` with the newly created node.

...And that's it! Except, we ran into Stack Overflow 😅:

```
RangeError: Maximum call stack size exceeded
```

Why 🤷‍ ?

Well, that's because for each `StringLiteral` we created more `StringLiteral`, and in each of those `StringLiteral`, we are "creating" more `StringLiteral`. Although we will replace a `StringLiteral` with another `StringLiteral`, babel will treat it as a new node and will visit the newly created `StringLiteral`, thus the infinite recursive and stack overflow.

So, how do we tell babel that once we replaced the `StringLiteral` with the `newNode`, babel can stop and don't have to go down and visit the newly created node anymore?

We can use `path.skip()` to skip traversing the children of the current path:

```js
StringLiteral(path) {
  const newNode = path.node.value
    .split('')
    .map(c => babel.types.stringLiteral(c))
    .reduce((prev, curr) => {
      return babel.types.binaryExpression('+', prev, curr);
    });
  path.replaceWith(newNode);
  // highlight-next-line
  path.skip();
}
```

...And yes it works now with now stack overflow!

## Summary

So, here we have it, our first code transformation with babel:

```js
const babel = require('@babel/core');
const code = `
function greet(name) {
  return 'Hello ' + name;
}
console.log(greet('tanhauhau')); // Hello tanhauhau
`;
const output = babel.transformSync(code, {
  plugins: [
    function myCustomPlugin() {
      return {
        visitor: {
          StringLiteral(path) {
            const concat = path.node.value
              .split('')
              .map(c => babel.types.stringLiteral(c))
              .reduce((prev, curr) => {
                return babel.types.binaryExpression('+', prev, curr);
              });
            path.replaceWith(concat);
            path.skip();
          },
          Identifier(path) {
            if (
              !(
                path.parentPath.isMemberExpression() &&
                path.parentPath
                  .get('object')
                  .isIdentifier({ name: 'console' }) &&
                path.parentPath.get('property').isIdentifier({ name: 'log' })
              )
            ) {
              path.node.name = path.node.name
                .split('')
                .reverse()
                .join('');
            }
          },
        },
      };
    },
  ],
});
console.log(output.code);
```

A summary of the steps on how we get here:

1. Have in mind what you want to transform from and transform into
2. Know what to target on the AST
3. Know how the transformed AST looks like
4. Write code

## Further resources

If you are interested to learn more, [babel's Github repo](https://github.com/babel/babel/tree/master/packages) is always the best place to find out more code examples of writing a babel transformation.

Head down to [https://github.com/babel/babel](https://github.com/babel/babel/tree/master/packages), and look for `babel-plugin-transform-*` or `babel-plugin-proposal-*` folders, they are all babel transformation plugin, where you can find code on how babel [transform the nullish coalescing operator](https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-nullish-coalescing-operator), [optional chaining](https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-optional-chaining) and many more.

> **Manipulating AST with JavaScript using Babel**
> 
> If you like what you've read so far, and want to learn how you could do it with Babel. I've created a [video course](https://gum.co/manipulating-ast-with-javascript), showing you step-by-step, how to write a babel plugin and codemod.
> 
> In the video course, I detailed tips and tricks, such as how to handle scope, how to use state, and also nested traversals.
> 
> **[Sounds interesting, let's take a look at the video course](https://gum.co/manipulating-ast-with-javascript)**

## Reference

- [Babel docs](https://babeljs.io/docs/en/) & [Github repo](https://github.com/babel/babel)
- [Babel Handbook](https://github.com/jamiebuilds/babel-handbook) by [Jamie Kyle](https://jamie.build/)
- [Leveling Up One’s Parsing Game With ASTs](https://medium.com/basecs/leveling-up-ones-parsing-game-with-asts-d7a6fc2400ff) by [Vaidehi Joshi](https://twitter.com/vaidehijoshi)
