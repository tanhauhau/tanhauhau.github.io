---
title: 'Debugging Story: Build failed, error from Terser'
date: '2020-01-08T08:00:00Z'
tags: debugging
description: "It all started with an error message during the build: 'ERROR in bundle.xxx.js from Terser'."
---

The following is a record of the steps I went through when debugging a build-time bug I encountered during work.

It all started with an error message during the build.

```
ERROR in bundle.xxxx.js from Terser
undefined

...

Command failed with exit code 2
Visit https://yarnpkg.com/en/docs/cli/run for documentation about this command.
Error: Command failed: yarn build
```

What is wrong with Terser and our code?

**I must find the root cause of this!**

## Act I - The First Attempt

We used Terser to minify our build code. It was part of our webpack pipeline, installed through `terser-webpack-plugin`. Since terser is throwing an error, so I disabled `terser-webpack-plugin` and build again.

```js
// filename: webpackConfig.prod.js

module.exports = {
  plugins: [
    // ...
    // disable terser first
    // new TerserPlugin({
    // 	terserOptions: {
    //     // ...
    //   },
    // }),
  ],
};
```

Ok. The build was successful. Nothing wrong with the code nor the build.

So, I run the terser manually:

```js
const terser = require('terser');
const fs = require('fs');
const path = require('path');
const input = fs.readFileSync(
  path.join(__dirname, 'dist/bundle.xxxx.js'),
  'utf-8'
);

const output = terser.minify(input, {
  // ...terser options
});
console.log(output);
```

The console output an error that was cryptic

```
{
  "error":
  TypeError: Cannot read property 'name' of undefined
      at A.f (node_modules/terser/dist/bundle.js:44:146028)
      at D (node_modules/terser/dist/bundle.js:44:2863)
      at A (node_modules/terser/dist/bundle.js:44:146075)
      at k (node_modules/terser/dist/bundle.js:44:146998)
      at vn (node_modules/terser/dist/bundle.js:44:133003)
      at node_modules/terser/dist/bundle.js:44:165250
      at AST_BlockStatement.optimize (node_modules/terser/dist/bundle.js:44:121400)
      at Ct.before (node_modules/terser/dist/bundle.js:44:121157)
      at AST_BlockStatement.transform (node_modules/terser/dist/bundle.js:44:78200)
      at node_modules/terser/dist/bundle.js:44:78849
}
```

I clicked into the terser source code to see what was going wrong over there. _(Maybe it's my chance to contribute to terser?)_

Little did I know, how wrong I could be.

`terser/dist/bundle.js` was a minified code and it wasn't meant for humans eyes 😭

Allow me to share a small snippet of what I saw:

```
...
s) } else if (u instanceof Se && r === u.expression && (p(e, t, i, u, o = n(o, u.property), a + 1,
  s + 1), o)) return; a > 0 || u instanceof Be && r !== u.tail_node() || u instanceof S ||
(t.direct_access = !0) } e(F, u); var d = new qn(function (e) { if (e instanceof Je) { var n =
e.definition(); n && (e instanceof hn && n.references.push(e), n.fixed = !1) } }); function h(e, n,
t) { this.inlined = !1; var r = e.safe_ids; return e.safe_ids = Object.create(null), i(e, t, this),
n(), e.safe_ids = r, !0 } function m(e, n, t) { var r, o = this; return o.inlined = !1, a(e), i(e,
t, o), !o.name && (r = e.parent()) instanceof ke && r.expression === o && o.argnames.forEach(
function (n, t) { if (n.definition) { var i = n.definition(); void 0 !== i.fixed || o.uses_arguments
&& !e.has_directive("use strict") ? i.fixed = !1 : (i.fixed = function () { return r.args[t] || v(kn, r)
...
```

At this point in time, I had another meeting to attend, so I stopped at this juncture.

On my way there, I was thinking, well, maybe I should probe this later in another direction.

## Act II - terser-webpack-plugin

After the meeting, I was thinking, well let me reenable the terser plugin, and try to probe through the plugin.

Remember the error message: `"ERROR in bundle.xxxx.js from Terser"` ?

I looked into the `node_modules/terser-webpack/plugin/dist/index.js` and search for the word `"from Terser"`.

**Tip:** Usually when you want to debug a library installed in `node_modules`, you can first look at the `package.json`, it usually has an entry called `"main"` that tells you the entry file to first look into. The main file usually exports all the public API that you use, so it is a good place to start diving into.

So I found the line:

```js
return new Error(`${file} from Terser\n${err.message}`);
```

After adding logs `console.log(err)` and run the build again, I realised the err is an empty object `{}`, which explained why I saw `undefined` after the `ERROR in ... from Terser`.

So, I slowly traced back the caller, and find out where this `err` object was initially created.

**Tip:** To trace the callers of a function that leads up to a certain state of your application, you can:

- Use a [conditional breakpoint](https://blittle.github.io/chrome-dev-tools/sources/conditional-breakpoints.html) if you are debugging through a debugger
- Throw an error within a try catch

```js
function someFunction() {
  if (someConditionThatLeadsToErrorLaterOn) {
    try {
      throw new Error();
    } catch (error) {
      console.log(error);
    }
  }
}
```

This is especially useful if you are tracing an unfamiliar code, you can quickly get a call stack that leads up to the current condition.

After tracing through the call stack, I ended up at the line where the `terser-webpack-plugin` calls the terser, and when I logged out the error, it shows:

```
{
  "error":
  TypeError: Cannot read property 'name' of undefined
      at A.f (node_modules/terser/dist/bundle.js:44:146028)
      at D (node_modules/terser/dist/bundle.js:44:2863)
      at A (node_modules/terser/dist/bundle.js:44:146075)
      at k (node_modules/terser/dist/bundle.js:44:146998)
      at vn (node_modules/terser/dist/bundle.js:44:133003)
      at node_modules/terser/dist/bundle.js:44:165250
      at AST_BlockStatement.optimize (node_modules/terser/dist/bundle.js:44:121400)
      at Ct.before (node_modules/terser/dist/bundle.js:44:121157)
      at AST_BlockStatement.transform (node_modules/terser/dist/bundle.js:44:78200)
      at node_modules/terser/dist/bundle.js:44:78849
}
```

So familiar! After an hour of tracing and debugging, I ended up at the same place.

**Note:** the error must have lost somewhere from the terser to the actual print out of `terser-webpack-plugin`, it might have fixed in a later version of `terser-webpack-plugin`, but I'm not sure of it yet. Anyone interested can help check.

## Act III - Terser

The circumstances left me with no choice. I needed to face the cryptic minified code.

Luckily VSCode still able to open the huge minified file, and able to set the cursor to the right line and column:

```js
var f = n.option("ecma") < 6 && n.has_directive("use strict") ?
function (e) { return e.key!=u && e.key.name!=u }
                                        ^
```

(By the way, in the minified code, all the code is in one line. 🤦‍♂️)

Well, this may seem like the right place to throw the `"Cannot read property 'name' of undefined"` error.

To understand what is going on in this line, I cloned [terser](https://github.com/terser/terser), checked out to the version tag that was installed in our codebase, and tried to figure out where that line was in the original code.

**Tip:** String, property and method names are usually the best marker to trace a [mangled code](http://lisperator.net/uglifyjs/mangle). Even though all the variables have mangled into a single character variable name, you can still clearly see the method `has_directive()` and the string `"use strict"`.

Conversely, please don't write long windy property / method names, it doesn't mangle well.

So I global searched the keyword `has_directive("use strict")` and landed with a small number of results, which I looked through every one of them and ended up with the following line:

```js
var diff =
  compressor.option('ecma') < 6 && compressor.has_directive('use strict')
    ? function(node) {
        return node.key != prop && node.key.name != prop;
      }
    : function(node) {
        return node.key.name != prop;
      };
```

Which I was and still am clueless of what this code was trying to do.

So I did the most reasonable thing, add a `console.log(node)`.

```js
var f = n.option("ecma") < 6 && n.has_directive("use strict") ?
function (e) { if (!e.key) { console.log(e); } return e.key!=u
               ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
&& e.key.name!=u }
```

I found out that the `node` is an object, that does not have a property `key`, which explains the error. And `node` has a property call `name` that has a value `"foobar"`, which I assumed is a variable name in our codebase. Luckily `foobar` wasn't commonly used in our codebase, and I managed to find only 1 instance of it, and astonishingly, the code was last changed 1 year ago!

So Terser just decided to break, without a sign, on a line of code that was written 1 year ago. This is the life of a programmer.

## Final Act - The Resolution

I kind of concluded that the root cause was a Terser bug, (because I can't just change the code that wasn't touched for nearly 1 year for no good reason), so the obvious thing to do next was to figured out whether someone fixed it on Terser upstream.

So, I checked out the master branch of Terser, found out the code has changed to

```js
var diff = compressor.option("ecma") < 2015
    && compressor.has_directive("use strict") ? function(node) {
    return node.key != prop && (node.key && node.key.name != prop);
} : function(node) {
    return node.key && node.key.name != prop;
};
```

`node.key` is checked to be existed before checking `node.key.name`. What a simple patch!

The next thing I needed to figure out was when was this fix landed, whether I can upgrade it.

The Terser in the codebase was one major version behind the latest Terser version, so, I was more reserved to upgrade to the latest version.

The git blame for the line of code was for some code refactoring, so I went to Github to trace the blame.

**Tip:** Github blame has this very useful button, that allows you to view blame prior to the change.

![Github: view blame prior to the change](./images/github blame.png)

A few blame traces later, I ended up with a commit that fixed the bug:

> [fix node.key crashing lib/compress by hytromo · Pull Request #286 · terser/terser](https://github.com/terser/terser/pull/286)

By looking at the MR merged date, I found that the commit was landed in between [v3.16.0 and v3.17.0](https://github.com/terser/terser/compare/v3.16.0...v3.17.0).

v3.17.0 was a minor version bump for our codebase, so I assumed it has no breaking changes.

`terser` was installed as a dependency of `terser-webpack-plugin`, which we had no control on the terser version, so I added a resolution to our `package.json`:

```json
{
  "resolution": {
    "terser": "3.17.0"
  }
}
```

After I upgraded terser, I build the code again.

The build was successful! 🎉

## Closing Note

As I was explaining all these to my colleague, I realised that should I upgraded the terser once I found out that it was a terser error, it would have fixed the bug as well. I wouldn't need to go through all these to end up in the same fix.

Oh well. 🤷‍♂️
