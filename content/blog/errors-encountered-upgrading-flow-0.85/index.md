---
title: Errors encountered upgrading Flow v0.85
date: "2019-04-22T08:00:00Z"
description: and how we solved them
---

## Background

Despite seeing the JS community [slowly](https://medium.com/entria/incremental-migration-to-typescript-on-a-flowtype-codebase-515f6490d92d) [moving away](https://davidgomes.com/porting-30k-lines-of-code-from-flow-to-typescript/) from Flow to TypeScript, [Shopee Web Frontend](https://careers.shopee.sg/jobs/?region_id=1&dept_id=109&name=web%20frontend&limit=20&offset=0) codebase is still very much stucked with [Flow](https://flow.org/). 😨

After some silence, Flow [has come back and committed to be a more efficient, reliable and friendly tool.](https://medium.com/flow-type/what-the-flow-team-has-been-up-to-54239c62004f) Thus, we decided to give Flow a final chance. However, in order to enjoy the improvements that Flow has made in recent days, we have to upgrade Flow from 0.83 (since our last update) to v0.97 (latest to date), which meant that we need to upgrade past v0.85, [which meant hell](https://github.com/facebook/flow/issues/7493) to [codebase that uses react-redux extensively.](https://github.com/flow-typed/flow-typed/issues/2946).

One of our [brave developer, Gao Wei](https://wgao19.cc/) took up the challenge and decided to bring us to the bright side of Flow. 😅. She [twitted](https://twitter.com/wgao19/status/1115969686758248448) and wrote [an article](https://dev.wgao19.cc/2019-04-17__making-flow-happy-after-0.85/) on how she fixed the errors arised in the process.

To put the problem in perspective, from Flow 0.85 onwards, Flow is asking for [required annotations for implicit annotations](https://medium.com/flow-type/asking-for-required-annotations-64d4f9c1edf8). Or less technical, if you are trying to `export` something that was created from a generic class (eg: `class Foo<T>`) or functions (eg: `function foo<T>(){}`), without explicit type arguments (eg: `new Foo<Type>()` or `foo<Type>()`), Flow is going to give you an error.

Or in layman terms, if your repo is full of HOCs or `connect()`, you are f**ked. So, be sure the check [Gao Wei's blog](https://dev.wgao19.cc/2019-04-17__making-flow-happy-after-0.85/) if you are one of the brave souls upgrading a Flow project.

<!-- TODO: count how many lines of code with flow annotation -->

## The Tooling

In this article, I would like to list out some of the  roadblocks we encountered that was less well discussed, the tooling for the latest Flow syntax, which is the `TypeParameterInstantiation`, eg: calling a function or instantiation a class with a type parameter, `new Foo<Type>()` or `foo<Type>()`.

## Babel & Eslint
We had to upgrade our babel to [babel v7](https://babeljs.io/docs/en/v7-migration) and babel-eslint (a babel wrapper for eslint) to [babel-eslint v9](https://github.com/babel/babel-eslint/releases/tag/v9.0.0) to support this new syntax.

You can read about on how we came to realise the need of this upgrade [in my previous post](
https://lihautan.com/eslint-for-flow-explicit-type-argument-syntax/).

There was another interesting bug that we ran into regarding [@babel/plugin-transform-flow-strip-types](https://babeljs.io/docs/en/babel-plugin-transform-flow-strip-types), you can read more on how we uncover it in [my other blog post](/parsing-error-flow-type-parameter-instantiation/).

## Prettier
We had to upgrade prettier to [v1.16.0](https://prettier.io/blog/2019/01/20/1.16.0.html) and use `babel-flow` parser for `prettier` to resolve the ambiguity in syntax arise in parsing the newer Flow syntax. In simpler terms, to tell Prettier that

```js
foobar<Type>(1)
```

is _calling foobar with argument, 1 and type, "Type"_, instead of:

```js
foobar < Type > 1
```

_is the result of foobar < Type, greater than 1?_ 😂

You can read more about it in [Prettier's blog post](https://prettier.io/blog/2019/01/20/1.16.0.html#add-babel-flow-parser-5685-by-ikatyang).

## VSCode

Flow [Lazy Mode](https://github.com/facebook/flow/commit/3c0a2bbd118206a0a73a1a4d18375122c4ae1955) has been around since v0.68, but we hadn't enjoy the benefit of lazy mode through VSCode [until recently](https://github.com/flowtype/flow-for-vscode/commit/9c1440068f8faee95e487fc9f69b5f5ffed64bf1).

Now we can specify `lazyMode` in our `.vscode/settings.json`:

```json
{
  "flow.useLSP": true,
  "flow.lazyMode": "ide"
}
```

Although [lazy mode](https://flow.org/en/docs/lang/lazy-modes/) reduces the scope where Flow does type checking, one of the pain point we had with Flow was to wait for Flow to do recheck, before returning a meaningful Flow status again. Flow team did some optimisation in [v92.0](https://github.com/facebook/flow/releases/tag/v0.92.0), where it says:

> This release culminates months of hard work on quality of life improvements for IDE support.
Expect your requests to be faster, and your requests to take a bit less time.

According to the release note, Flow is now able to **provide type definitions while rechecking**, for further details on how they achieve this, you can read the [Flow blog](https://medium.com/flow-type/a-more-responsive-flow-1a8cb01aec11)

## Closing remarks

Finally we managed to get Flow running in v0.97 🎉. We've been struggling with bad developer experience with v0.83 for the longest time, hopefully v0.97 do not let us down.

Lastly, be sure to check out all the links sprinkled throughout this blog, they link to Github issues, commits, release notes, and who knows it might lead you to some unexpected adventures? 🤷‍

But if you are lazy like me, here are the links, they served as my references when writing this blog post:
- [Blog: Incremental Migration to TypeScript on a Flowtype codebase](https://medium.com/entria/incremental-migration-to-typescript-on-a-flowtype-codebase-515f6490d92d)
- [Blog: Porting 30k lines of code from Flow to TypeScript](https://davidgomes.com/porting-30k-lines-of-code-from-flow-to-typescript)
- [Issue: What is the official way to type connect ( from flow-typed/react-redux) after 0.85?](https://github.com/facebook/flow/issues/7493)
- [Issue: [react-redux] libdef incompatible with flow v0.85 #2946](https://github.com/flow-typed/flow-typed/issues/2946)
- [Tweet: It's so hard to make flow happily get past 0.85 with our codebase...](https://twitter.com/wgao19/status/1115969686758248448)
- [Blog: Making Flow Happy after 0.85](https://dev.wgao19.cc/2019-04-17__making-flow-happy-after-0.85/)
- [Blog: Asking for Required Annotations](https://medium.com/flow-type/asking-for-required-annotations-64d4f9c1edf8)
- [Docs: Babel 7 Migration](https://babeljs.io/docs/en/v7-migration)
- [Release Note: babel-eslint v9.0.0](https://github.com/babel/babel-eslint/releases/tag/v9.0.0)
- [Docs: @babel/plugin-transform-flow-strip-types](https://babeljs.io/docs/en/babel-plugin-transform-flow-strip-types)
- [Release Note: Prettier v1.16.0](https://prettier.io/blog/2019/01/20/1.16.0.html)
- [Commit: Lazy mode message for flow status](https://github.com/facebook/flow/commit/3c0a2bbd118206a0a73a1a4d18375122c4ae1955)
- [Commit: feat(lsp): add setting to support flow lazyMode.](https://github.com/flowtype/flow-for-vscode/commit/9c1440068f8faee95e487fc9f69b5f5ffed64bf1)
- [Docs: Flow Lazy Mode](https://flow.org/en/docs/lang/lazy-modes/)
- [Release Note: Flow v0.92.0](https://github.com/facebook/flow/releases/tag/v0.92.0)
- [Blog: A more responsive Flow](https://medium.com/flow-type/a-more-responsive-flow-1a8cb01aec11)