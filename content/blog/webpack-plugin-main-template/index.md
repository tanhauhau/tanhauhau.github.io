---
title: Webpack's TemplatePlugin
date: '2020-01-21T08:00:00Z'
---

If you are using webpack to bundle your library, you most likely will export something in your entry file:

```js
// weback.config.js
module.exports = {
  entry: './src/index.js',
};

// src/index.js
export default 'foo';
```

And if you build it with webpack just like that, out-of-the-box, you may be surprised that if you try to `require()` the built file, you would find that there's nothing being exported by the built file.

```js
const foo = require('./dist/bundle.js');
console.log(foo); // prints `{}` (empty object)
```

If you've read [my previous article on writing a module bundler](/i-wrote-my-module-bundler/), you can imagine that the output bundle looks something like this:

```js
// dist/bundle.js
(function webpackStart({ moduleMap, entryPoint }) {
  // ...
  return require(entryPoint);
})({
  'src/index.js': function(exports, require) {
    exports.default = 'foo';
  },
});
```

_(Everything should be familiar, except the fact that instead of calling `webpackStart` in a separate statement, I made it into a IIFE (Immediately Invoked Function Expression) for reasons that will be apparent later)_

In order to build for a library, ie: to expose whatever is exported by the entry file, webpack provides 3 options that you can play with:

- [output.library](https://webpack.js.org/configuration/output/#outputlibrary)
- [output.libraryExport](https://webpack.js.org/configuration/output/#outputlibraryexport)
- [output.libraryTarget](https://webpack.js.org/configuration/output/#outputlibrarytarget)

## Webpack's output.library\* options

To understand how each of them works, let's start with `output.libraryTarget`.

`output.libraryTarget` accepts `string` as value, there are 2 main groups of values that you can provide to the `output.libraryTarget` option:

#### 1. Name of a module system: `"commonjs"`, `"commonjs2"`, `"amd"`, `"umd"`, ...

Webpack allows you to specify the name of the module system that you want to use to expose the exported values of the entry file.

You can specify a module system that is different from the one that you are using in your library.

Let's try `commonjs2` as an example:

```js
// webpack.config.js
module.exports = {
  libraryTarget: 'commonjs2',
};
// dist/bundle.js
// highlight-next-line
module.exports = (function webpackStart({ moduleMap, entryPoint }) {
  // ...
  return require(entryPoint);
})({
  'src/index.js': function(exports, require) {
    exports.default = 'foo';
  },
});
```

`commonjs2` uses `module.exports` to export values from a module. In this example, webpack assigns the return value of the IIFE to `module.exports`.

If you look at the bundled code, it is not much different than the one without specifying `output.libraryTarget`. The only difference is that the bundled code is prefixed with `module.exports =`;

> By the way, if you are curious about the difference between commonjs and commonjs2, you can follow the thread of [this issue](https://github.com/webpack/webpack/issues/1114).

#### 2. Name of a variable: `"var"`, `"this"`, `"self"`, `"window"`, `"global"`

On the other hand, instead of exposing the library content through a module system, you can specify the variable name which the export object is assigned to.

Let's take `self` as an example:

```js
// webpack.config.js
module.exports = {
  libraryTarget: 'self',
};
// dist/bundle.js
// highlight-next-line
Object.assign(
  // highlight-next-line
  self,
  (function webpackStart({ moduleMap, entryPoint }) {
    // ...
    return require(entryPoint);
  })({
    'src/index.js': function(exports, require) {
      exports.default = 'foo';
    },
  })
);
// self.default === 'foo'
```

All the exported values are assigned to `self`.

Again observe the bundled code, this time round we prefixed the bundled code with `Object.assign(self,` and suffixed it with `);`.

Specifiying the `output.libraryTarget` as `var` on the other hand, allows you to assign it to a variable name, which you can provide in `output.library` option:

```js
// webpack.config.js
module.exports = {
  library: 'myApp',
  libraryTarget: 'var',
};

// dist/bundle.js
// highlight-next-line
var myApp = (function webpackStart({ moduleMap, entryPoint }) {
  // ...
  return require(entryPoint);
})({
  'src/index.js': function(exports, require) {
    exports.default = 'foo';
  },
});

// myApp === { default: 'foo' }
```

If you don't want `myApp` to contain all the exported value of the entry file, you can provide the key that you want to export only in the `output.libraryExport` option:

```js
// webpack.config.js
module.exports = {
  library: 'myApp',
  libraryTarget: 'var',
  libraryExport: 'default',
};

// dist/bundle.js
var myApp = (function webpackStart({ moduleMap, entryPoint }) {
  // ...
  return require(entryPoint);
})({
  'src/index.js': function(exports, require) {
    exports.default = 'foo';
  },
  // highlight-next-line
}).default;

// myApp === 'foo'
```

Again you can observe that by playing different option values of `output.library`, `output.libraryTarget`, `output.libraryExport`, webpack adds different prefix and suffix to the bundled code:

```js
// libraryTarget: 'commonjs2':
module.exports = {{BUNDLED_CODE}};

// libraryTarget: 'self':
Object.assign(self, {{BUNDLED_CODE}});

// library: 'myApp', libraryTarget: 'var':
var myApp = {{BUNDLED_CODE}};

// library: 'myApp', libraryTarget: 'var', libraryExport: 'default':
var myApp = {{BUNDLED_CODE}}.default;
```

So, instead of using the webpack built-in library targets, what should we do if we want to support a custom library target that looks something like below:

```js
// libraryTarget: ???
customRegistry.register('my-app', {{BUNDLED_CODE}});
```

I searched through the [webpack official docs](https://webpack.js.org/configuration/output/) and found no options that allows that. So the only solution at the moment is to write a webpack plugin.

## Writing a webpack plugin

After digging around the [webpack source code](https://github.com/webpack/webpack), I found out that [LibraryTemplatePlugin](https://github.com/webpack/webpack/blob/master/lib/LibraryTemplatePlugin.js) instantiates different TemplatePlugins based on the value of the `output.libraryTarget` option:

```js
// webpack/lib/LibraryTemplatePlugin.js
class LibraryTemplatePlugin {
// ...
apply (compiler) {
// ...
switch (this.options.libraryTarget) {
  case 'amd':
  case 'amd-require':
    // ...
    new AmdTemplatePlugin(/*...*/).apply(compiler);
    break;
  case 'var':
    // ...
    new SetVarTemplatePlugin(/*...*/).apply(compiler);
    break;
  case 'this':
  case 'self':
  case 'window':
    // ...
    new SetVarTemplatePlugin(/*...*/).apply(compiler);
    break;
  // ...
}
```

I went to look into one of the TemplatePlugins, the [SetVarTemplatePlugin](https://github.com/webpack/webpack/blob/master/lib/SetVarTemplatePlugin.js):

```js
const { ConcatSource } = require('webpack-sources');

class SetVarTemplatePlugin {
  // ...
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('SetVarTemplatePlugin', compilation => {
      // ...
      hooks.render.tap(
        'SetVarTemplatePlugin',
        (source, { chunk, chunkGraph }) => {
          // ...
          // highlight-start
          const prefix = `${varExpression} =`;
          return new ConcatSource(prefix, source);
          // highlight-end
        }
      );
    });
    // ...
  }
}
```

I don't understand line-by-line everything that happened in the file, but I do know that the line highlighted above, is where webpack concats the `varExpression =` (in the case of `commonjs`, `varExpression` is `module.exports`, thus `module.exports =`) and the source (which in this case is the bundled code).

So, to have the following:

```js
customRegistry.register('my-app', {{BUNDLED_CODE}});
```

we need:

```js
return new ConcatSource(`customRegistry.register('my-app', `, source, ')');
```

So, I did the following:

1. Created a new file and pasted the entire source from [SetVarTemplatePlugin.js](https://github.com/webpack/webpack/blob/master/lib/SetVarTemplatePlugin.js)
1. Searched + replaced to rename the plugin name to something more appropriate, (SetModuleTemplatePlugin)
1. Replaced relative import, `require("./RuntimeGlobals")` to require from webpack, `require("webpack/lib/RuntimeGlobals")`
1. Replaced the line `return new ConcatSource(prefix, source);` to the following:
```js
return new ConcatSource(`customRegistry.register('my-app', `, source, ')');
```
1. Removed `output.library`, `output.libraryTarget` from webpack config
1. Added my new plugin:
```js
// webpack.config.js
module.exports = {
  plugins: [new SetModuleTemplatePlugin()],
};
```

To my surprise, it worked! Almost.

When I run the bundled code, the customRegistry registered an empty object, nothing is exported from the bundled code.

I went into [LibraryTemplatePlugin.js](https://github.com/webpack/webpack/blob/master/lib/LibraryTemplatePlugin.js) to look about, because that's the most obvious place to start looking, since I've copied line-by-line from [SetVarTemplatePlugin.js](https://github.com/webpack/webpack/blob/master/lib/SetVarTemplatePlugin.js).

I found a pretty obvious line that says:

```js
const FlagEntryExportAsUsedPlugin = require("./FlagEntryExportAsUsedPlugin");
new FlagEntryExportAsUsedPlugin(
  this.options.libraryTarget !== "module",
  "used a library export"
).apply(compiler);
```

If I would have to guess, I think that what this line is doing is to mark the export of the entry file as used, so that webpack would not _treeshake them away_.

> Which, **treeshake** is a cool word that means remove them.
> > Which you could argue that **treeshake** does way more that just remove the entry exports, it removes things that is only used by the entry exports, recursively.

I added these 2 lines into my `SetModuleTemplatePlugin`, and it worked! Perfectly this time. 🎉

I created [a gist](https://gist.github.com/tanhauhau/b6b355fbbabe224c9242a5257baa4dec) for the complete code, if you are lazy.

Lastly, if you noticed, this example is based on the latest master webpack source (at the time writing), which is `webpack@5.0.0-beta.12`.

If you want a similar plugin with `webpack^4`, you can trust me that this article serves as a good enough entry point for you to write the plugin on your own.

**And I trust you that you can do it. 😎**

## Closing Note

Writing a webpack plugin is not impossible. It will especially be easier if you have a good understanding how webpack as a bundler works.

_(Plug: if you want to know more, you can read my ["What is module bundler and how does it work?"](/what-is-module-bundler-and-how-does-it-work/))_