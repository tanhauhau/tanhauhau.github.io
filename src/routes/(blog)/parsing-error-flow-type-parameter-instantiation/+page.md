---
title: Parsing error when calling generic function with type arguments
date: '2019-04-23T08:00:00Z'
lastUpdated: '2019-04-27T08:00:00Z'
description: 😱
label: blog
---

## Background

Mentioned in the [previous post](/errors-encountered-upgrading-flow-0.85/), we have [upgraded babel 7](https://babeljs.io/docs/en/v7-migration) to support the new Flow syntax.

`foobar<Type>(x)` is now _call foobar with x, and type parameter `Type`_ rather than `(foobar < Type) > x)` _is the result of foobar smaller than Type, greater than x?_.

> Everything is great, until a weird runtime error caught us off guard.

## ReferenceError: XType is not defined

```js
export function foobar<XType>(baz);
                       ^ ReferenceError: XType is not defined
```

The first time I saw this error, my first impression was that I forgot to import `XType`, so I scrolled to the top of the document. But, alas, I **did import** `XType`.

So what is going on? 🤷‍

I clicked into the error,

```js
export function foobar < XType > baz;
```

looked at me innocently. I knew something was wrong. `XType` wasn't stripeed by babel!

Shameless plug: If you read my [eslint for flow syntax](/eslint-for-flow-explicit-type-argument-syntax/), you should be able to come to the same conclusion! 😅

So I checked the [@babel/plugin strip-flow-types](https://babeljs.io/docs/en/babel-plugin-transform-flow-strip-types), I realise there's a `all` option that I had missed out, basically it says,

> **only parse** Flow-specific features if a `@flow` pragma is **present atop** the file

It seems that in my file,

```js
/** @module foobar */
// @flow
// ...
export function foobar<XType>(baz);
```

I had a innocent looking `/** @module */` comment above `// @flow` that breaks my babel plugin!

So the quick fix is to either:

- Move `// @flow` comment above `/** @module foobar */`, or
- Set `all: true` in `@babel/plugin-transform-flow-strip-types`.

Either way, it solves the issue.

However, one thing bothers me:

> My Flow works perfectly fine with an extra comment on top `// @flow`, it still typechecks and provides auto-suggestions.

So, the logic for `@babel/plugin-transform-flow-strip-types` and Flow to determine whether a file is a Flow file or not **is different**!

And as a frequent user of Open Source libraries, this is something I think I ~~can~~ should fix, for the betterment of the JavaScript Open Source world 😅. I always imagine there's another innocent front-end developer across the world like me stumbled upon a perplexing bug, if only me let the bug go with a workaround/patch.

> There's so much to achieve if we, not just consume the effort of others from the Open Source, but to also contribute into it.

## Game Plan

So, to fix this bug, one simply has to:

- Read Flow's source code and understand the logic
- Read @babel/plugin-transform-strip-flow-type's source code and understand the logic
- Make changes to babel code
- Send a MR and brag about it 😎

Whether this is achieveable at my current level, that's a different story.
But **one has nothing to lose to try and fail**.

## Flow

I've read a bit of Flow source code previously, mainly to [fix a bad developer experience I had with flowconfig previously](https://github.com/facebook/flow/pull/7083). I had to learn [OCaml](https://ocaml.org/), which was a fad a while ago because of [ReasonML](https://reasonml.github.io/), to understand Flow source code.

So, this time around, I am much more comfortable to dig the code to find out the information I want.

I searched for the term `"@flow"`, which ended me up with [this function](https://github.com/facebook/flow/blob/master/src/parsing/parsing_service_js.ml#L143), `extract_docblock` which returns me the information of whether `@flow` is present in the file. And I dug further, I ended up with [the annonymous function that `extract_docblck` returns](https://github.com/facebook/flow/blob/master/src/parsing/parsing_service_js.ml#L275).

Allow me to loosely translate the logic into some pseudo JavaScript:

```js
const extract_docblock = ({ maxTokens, filename, content }) => {
  const file = read(filename);
  for (let i = maxTokens; i > 0; i--) {
    const token = file.nextToken();
    switch (token.type) {
      case 'string':
      case 'semicolon':
        continue;
      case 'comment':
        if (isFlowComment(token)) {
          return flowPragmaType(token);
        }
        break;
      default:
        return null;
    }
  }
};
```

In human language:

Flow will read `maxTokens` number of tokens, look for comments that matches `@flow`, if it encounters any order tokens, it will bail out early, with the exception of string and semicolon.

So,

```js
'use strict';
// @flow
foobar();
```

and

```js
/** @module */
// @flow
foobar();
```

is considered as a valid Flow file.

But

```js
foobar();
// @flow
```

or

```js
foobar();
```

is not.

## Babel

At first, I thought that the logic would be in `@babel/transform-strip-flow-types`, but apparently, its not.

I discovered that by realising that the [source code of @babel/transform-strip-flow-types](https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-flow-strip-types/src/index.js) did not include anything about the `all` options, and [this plugin extends the @babel/plugin-syntax-flow](https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-flow-strip-types/src/index.js#L14), which I knew fairly well that syntax plugins in babel does nothing but to enable syntax switch of the `@babel/parser`. The bulk of the logic lies within the [`@babel/parser`'s flow plugin](https://github.com/babel/babel/blob/master/packages/babel-parser/src/plugins/flow.js).

That was all because [I contributed to `@babel/parser` before](https://github.com/babel/babel/pulls?q=is%3Apr+is%3Aclosed+author%3Atanhauhau).

And here we are in babel-parser, and the line that caught my attention is [this](https://github.com/babel/babel/blob/master/packages/babel-parser/src/plugins/flow.js#L98):

```js
addComment(comment: N.Comment): void {
  if (this.flowPragma === undefined) {
    // Try to parse a flow pragma.
    const matches = FLOW_PRAGMA_REGEX.exec(comment.value);
    if (!matches) {
      this.flowPragma = null;
    } else if (matches[1] === "flow") {
      this.flowPragma = "flow";
    } else if (matches[1] === "noflow") {
      this.flowPragma = "noflow";
    } else {
      throw new Error("Unexpected flow pragma");
    }
  }
  return super.addComment(comment);
}
```

So, the babel's logic of getting a Flow pragma is that as soon as the first comment encountered, we parse the comment and we turn on the Flow syntax switch.

This is the reason why if we have a comment before `// @flow`, we will not treat the file as a valid Flow file.

Interesting enough, this means that if we write

```js
foobar < XType > 1;
// @flow
foobar<XType>(1);
```

the first half of the code before `// @flow` was parsed as a normal JS code, and the second half after `// @flow` was parsed as a Flow code.

You can see this clearly with {@html '<a href="https://lihautan.com/babel-ast-explorer/#?%7B%22babel%22%3A%7B%22jsx%22%3Afalse%2C%22flow%22%3Atrue%2C%22typescript%22%3Afalse%2C%22objectRestSpread%22%3Afalse%2C%22pipelineOperator%22%3Afalse%2C%22throwExpressions%22%3Afalse%2C%22optionalChaining%22%3Afalse%2C%22nullishCoalescingOperator%22%3Afalse%2C%22exportDefaultFrom%22%3Afalse%2C%22dynamicImport%22%3Afalse%7D%2C%22code%22%3A%22foobar%3CXType%3E(1)%3B%5Cn%2F%2F%20%40flow%5Cnfoobar%3CXType%3E(1)%3B%22%7D">my recently build ASTExplorer clone for babel</a>'}.

_(I built it with React + Hooks over a long weekend, which I will share about how did it in the future.)_.

You can see that the first expression is a `BinaryExpression` but the second expression is a `CallExpression`;

## Make changes to the babel code

Now step 3, make changes to babel code. So I decided to open an issue and started fixing the code. Surprisingly, someone else [had reported the issue a few months ago](https://github.com/babel/babel/issues/9240), and the issue was still opened.

So [I explained what I had discovered](https://github.com/babel/babel/issues/9240#issuecomment-485370957), and tried to [propose a solution](https://github.com/babel/babel/pull/9885). Well, after some struggle, I realised I am still a bit behind from being able to fix this code.

So how?

I submitted a [PR](https://github.com/babel/babel/pull/9885) with a big **WIP**, because I didn't know how to look ahead `n` tokens and determine the `flowPragma` flag before `babel` starts parsing the code. I explored around the `babel-parser` source code, uncover new concepts that I never knew before. It took me a day to contemplate and fiddle around, until something sparked me.

I realised I do not have to follow exactly Flow's logic in order to achieve similar behaviour. That's when I submitted another [PR](https://github.com/babel/babel/pull/9891) and closed the previous one. _(You can check it out if you are curious about it)_.

And finally, the fix has merged into [babel v7.4.4](https://github.com/babel/babel/releases/tag/v7.4.4)! 🎉🎉

And I can't wait to try all the edge cases that I have fixed in babel repl:
- [`'use strict'`; before `// @flow`](https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=OQVwzgpgBGAuBOBLAxrYBuAUAem1AAgGYA2A9gO6aGmkA8AggHwAUARgJRbV1NudA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=&prettier=false&targets=&version=7.4.4&externalPlugins=%40babel%2Fplugin-transform-flow-strip-types%407.4.4)
- [comments before `//@flow`](https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=PQKhAIAEFsHsBMCuAbApgZ3AM1rcJgAoYYKLZWAd0J1gB4BBAPgAoAjASgG4bdHXOXIA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=&prettier=false&targets=&version=7.4.4&externalPlugins=%40babel%2Fplugin-transform-flow-strip-types%407.4.4)
- [first comment is `//@flow`, but in the middle of the file](https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=GYexB4EED4AoCMCUBuAUAenQAgALADYgDuqoEMCKQA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=&prettier=false&targets=&version=7.4.4&externalPlugins=%40babel%2Fplugin-transform-flow-strip-types%407.4.4)

## Closing Remark

~~Well, I am sorry that I am going to stop here, because the issue is still opened, but I hoped you enjoy the detective journey along the way of hunting this bug.~~

~~If you encountered similar issues, you can patch it first with the solution I mentioned earlier. And do follow the Github issue, I will do my best to fix this.~~

If you encountered similar issues, please [upgrade babel to v7.4.4](https://github.com/babel/babel/releases/tag/v7.4.4).

> The best thing about open source is that the source code is open. As part of the JS community, we should not just reap the efforts of the community when we are building our next billion dollar idea, we should also contribute back so that the community as a whole can grow and improve together.

As usual, here are the list of references for this article:

- [Blog: Errors encountered upgrading Flow v0.85](/errors-encountered-upgrading-flow-0.85)
- [My eslint doesn’t work with for flow 0.85’s explicit type argument syntax](/eslint-for-flow-explicit-type-argument-syntax/)
- [Docs: Upgrading Babel v7](https://babeljs.io/docs/en/v7-migration)
- [Docs: @babel/transform-plugin-flow-strip-types](https://babeljs.io/docs/en/babel-plugin-transform-flow-strip-types)
- [Docs: ReasonML](https://reasonml.github.io/)
- [Code: Flow Parsing Service](https://github.com/facebook/flow/blob/master/src/parsing/parsing_service_js.ml)
- [Issue: Parsing error when calling generic functions with type arguments when flow pragma is not first comment](https://github.com/babel/babel/issues/9240)
