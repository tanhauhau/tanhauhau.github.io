---
title: Webpack Define Plugin
tags:
  - define plugin
  - feature flag
---

a high level of define plugin, treeshake + minification happens in the following

for any module, 
- webpack reads the source code
- apply all the loaders
- apply define plugin
- for the final code after loaders + define plugin, 
  - for code at `if (truthy)` or `truthy && ...` or `truthy ? ... : ...`, webpack will try to collapse that conditional, meaning based on truthy / falsy value, remove unwanted code logic paths
- find all the `imports` or `require` in the code
- traverse them and apply the same step for each module

after creating the module map
- create chunks based on dynamic import()
- apply graph based optimisation - such as mark unused exports and treeshake them away
- granular split chuks optimisation
- lastly, for each chunk
  - run terser to minify the code, will remove any unused variables / functions within each chunk
  
which means, there's a difference between the following contrived code:

```js
const a = __FLAG__;
if (a) {
   require('foo');
} else {
   require(bar');
}
```

and

```js
if (__FLAG__) {
   require('foo');
} else {
   require(bar');
}
```

after applying `new DefinePlugin({ __FLAG__: true })`, you get:

```js
const a = true;
if (a) {
   require('foo');
} else {
   require(bar');
}
```

and

```js
if (true) {
   require('foo');
} else {
   require(bar');
}
```

webpack's parser is able to collapse the conditional of the latter, but not the former.

> the collapse of conditional expression happens [here](https://github.com/webpack/webpack/blob/master/lib/ConstPlugin.js#L133)

```js
if (true) {
  require('foo');
} else { }
```

so, the former case, will have both `foo` and `bar` in the bundled code ,but the latter will only have `foo`.

### What about terser?

terser runs on chunk level after all the bundling and chunking logic, so even though terser is smart enough to collapse

```js
const a = true;
if (a) {
   require('foo');
} else {
   require(bar');
}
```

into

```js
require('foo');
```

the bundled code still have `foo` and `bar`'s code.
