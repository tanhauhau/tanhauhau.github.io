---
title: Step by step guide for writing a babel transformation
date: '2019-09-07T08:00:00Z'
tags: JavaScript,babel,ast,transform
description: Writing your first babel plugin
wip: true
---

Today, I am going to share a step by step guide to do a code transformation with [`babel`](https://babeljs.io/docs/en/babel-core).

I'll be going through:

- What is **Abstract Syntax Tree (AST)** ?
- How to write a code to transform your code with `babel`
- Where to learn more beyond this article

## What is Abstract Syntax Tree (AST) ?

I am not sure I can explain this better than the amazing articles out there on the web:

- [Leveling Up One’s Parsing Game With ASTs](https://medium.com/basecs/leveling-up-ones-parsing-game-with-asts-d7a6fc2400ff) by [Vaidehi Joshi
  ](https://twitter.com/vaidehijoshi) \* _(Highly recommend this one! 👍)_
- Wikipedia's [Abstract syntax tree](https://en.wikipedia.org/wiki/Abstract_syntax_tree)
- [What is an Abstract Syntax Tree
  ](https://blog.bitsrc.io/what-is-an-abstract-syntax-tree-7502b71bde27) by [Chidume Nnamdi](https://twitter.com/ngArchangel)

To summarize, AST is a tree representation of your code. In the case for JavaScript, the JavaScript AST follows the [estree specification](https://github.com/estree/estree).

AST represents your code, the structure and the meaning of your code. So it allows compiler to generate machine code out of it, interpreter to executes it, or tools like [babel](https://babeljs.io) or [prettier](https://prettier.io) to transform and format it.

So now you know what is AST, we are going to write code to transform your code with `babel` by using AST.

## How to use babel to transform code

The following is the general template of doing it:

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

> You would need to install [@babel/core](https://www.npmjs.com/package/@babel/core) to run this. `@babel/parser`, `@babel/traverse`, `@babel/generator` are all dependencies of `@babel/core`, so installing `@babel/core` would be suffice.

So the general idea of it is to parse your code to AST, do transformation on AST, then generate code from the transformed AST.

```
code -> AST -> transformed AST -> transformed code
```

Now you know the general idea, we can actually use another API from `babel` to do all the above:

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

In some way, you have written your first [babel plugin](https://babeljs.io/docs/en/plugins), how cool is that?!

Although I've shown you the code of transforming the ast, but how do you write transformation code yourself?

So, here is the step by step guide to do it:

### 1. Have in mind what you want to transform from and transform into

In this example, I want to prank my colleague by:

- reversing all variables and function names
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
  return 'H' + 'e' + 'l' + 'l' + 'o' + ' ' + name;
}

console.log(teerg('t' + 'a' + 'n' + 'h' + 'a' + 'u' + 'h' + 'a' + 'u')); // Hello tanhauhau
```

Well, we have to keep the `console.log`, so that even the code is hardly readable, it is still working fine. _(I wouldn't want to break the production code!)_

### 2. Know what to target on the AST

Head down to a [babel AST explorer](https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImZ1bmN0aW9uIGdyZWV0KG5hbWUpIHtcbiAgcmV0dXJuICdIZWxsbyAnICsgbmFtZTtcbn1cblxuY29uc29sZS5sb2coZ3JlZXQoJ3RhbmhhdWhhdScpKTsgLy8gSGVsbG8gdGFuaGF1aGF1In0=), click on different parts of the code, to see where it is represented on the AST:

![targeting](./images/targeting.png 'Selecting the code on the left, and see the corresponding part of the AST light up on the right')

If this is your first time seeing the AST, play around with it for a little while, to get the sense of how is it look like, and get to know the names of the node on the AST with respect to your code.

So, now we know that we need to target:

- **Identifier** for variable and function names
- **StringLiteral** for the string.

### 3. Know how the transformed AST look like

Head down to the [babel AST explorer](https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImZ1bmN0aW9uIHRlZXJnKGVtYW4pIHtcbiAgcmV0dXJuIFwiSFwiICsgXCJlXCIgKyBcImxcIiArIFwibFwiICsgXCJvXCIgKyBcIiBcIiArIG5hbWU7XG59XG5cbmNvbnNvbGUubG9nKHRlZXJnKFwidFwiICsgXCJhXCIgKyBcIm5cIiArIFwiaFwiICsgXCJhXCIgKyBcInVcIiArIFwiaFwiICsgXCJhXCIgKyBcInVcIikpOyAvLyBIZWxsbyB0YW5oYXVoYXVcbiJ9) again, but this time round with the output code you want to generate.

![output](./images/output.png 'You can see that what used to be a `StringLiteral` is now a nested `BinaryExpression`')

Play around, and think how you can transform from the previous AST to the current AST.

For example, you can see that `'H' + 'e' + 'l' + 'l' + 'o' + ' ' + name` is formed by nested `BinaryExpression` with `StringLiteral`.

### 4. Write code

Now take a look at our code again:

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

During the traversal phase, babel will do a [depth-first search traversal](https://en.wikipedia.org/wiki/Depth-first_search) and visit each and every node in the AST. You can specify a callback method in the visitor, such that while visiting the node, babel will call the callback method with the node it is currently visiting.

In the visitor object, you can specify the name of the node that you want to be notified:

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

As we can see from the [AST explorer](https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImZ1bmN0aW9uIGdyZWV0KG5hbWUpIHtcbiAgcmV0dXJuICdIZWxsbyAnICsgbmFtZTtcbn1cblxuY29uc29sZS5sb2coZ3JlZXQoJ3RhbmhhdWhhdScpKTsgLy8gSGVsbG8gdGFuaGF1aGF1In0=), the name of the `Identifier` is stored in the property called `name`, so what we are going to do is to reverse the `name`.

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
  return 'Hello ' + name;
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

and yes, now you get it right!

```js
function teerg(eman) {
  return 'Hello ' + name;
}

console.log(teerg('tanhauhau')); // Hello tanhauhau
```

So, why do we have to check whether the `Identifier`'s parent is not a `console.log` `MemberExpression`? Why don't we just compare whether the current `Identifier.name === 'console' || Identifier.name === 'log'`?

You can do that, except that it will not reverse the variable name, if it is named `console` or `log`:

```js
const log = 1;
```

> So, how do I know the method `isMemberExpression` and `isIdentifier`? Well, yes they are a bit hard to find on babel's doc, but you can find the exhaustive list over [here](https://github.com/babel/babel/blob/master/packages/babel-types/src/validators/generated/index.js).

#### Transforming strings

The next step is to generate a nested `BinaryExpression` out of `StringLiteral`.

To create a AST node, you can use the utility function from [`@babel/types`](https://babeljs.io/docs/en/babel-types). `@babel/types` is also available from `babel.types` from `@babel/core`.

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

...and that's it! Except, we ran into Stack Overflow:

```
RangeError: Maximum call stack size exceeded
```

Why 🤷‍ ?

Well, that's because for each `StringLiteral` we created more `StringLiteral`, and in each of those `StringLiteral`, we are "creating" more `StringLiteral`. Although we are going to replace a `StringLiteral` with another `StringLiteral`, babel will treat it as a new node, and will visit the newly created `StringLiteral`, thus the infinte recursive and stack overflow.

So, how do we tell babel that once we replaced the `StringLiteral` with the `newNode`, that's it, don't have to go down and visit the newly created node anymore?

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
3. Know how the transformed AST look like
4. Write code

## Further resources

If you are interested to learn more, where can you get more code examples of writing a babel transformation?

You can always go to [https://github.com/babel/babel](https://github.com/babel/babel/tree/master/packages), and look for `babel-plugin-transform-*` or `babel-plugin-proposal-*` folders, they are all babel transform plugin, where you can find code on how babel [transform the nullish coalescing operator](https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-nullish-coalescing-operator), [optional chaining](https://github.com/babel/babel/tree/master/packages/babel-plugin-proposal-optional-chaining) and many more.

## Reference
- [Babel docs](https://babeljs.io/docs/en/) & [Github repo](https://github.com/babel/babel)
- [Babel Handbook](https://github.com/jamiebuilds/babel-handbook) by [Jamie Kyle](https://jamie.build/)
- [Leveling Up One’s Parsing Game With ASTs](https://medium.com/basecs/leveling-up-ones-parsing-game-with-asts-d7a6fc2400ff) by [Vaidehi Joshi
  ](https://twitter.com/vaidehijoshi)