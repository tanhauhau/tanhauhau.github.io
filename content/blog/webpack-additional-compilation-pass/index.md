---
title: Webpack Additional Compilation Pass
date: '2020-02-20T08:00:00Z'
---

Recently, I was working on a server-side rendering application, and encounter a scenario that I think it requires "double compilation" with webpack.

## The problem

I am not entirely sure I am doing it in the right approach, feel free to suggest or discuss it with me. The following will be about the problem I faced and how I worked on it.

The server-side rendering application that I worked on, has an endpoint that takes in request and respond with a partial HTML content and CSS files required for styling:

```json
{
  "css": ["http://cdn/assets/style.xxx.css"],
  "html": "<div class=\"container_xyz\">Hello world</div>"
}
```

```css
/* filename: http://cdn/assets/style.xxx.css */
.container_xyz {
  font-family: 'Comic Sans';
}
```

The application code itself uses [Express](https://expressjs.com/) and [React](https://reactjs.org/):

```js
import express from 'express';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import styles from './app.scss';

const app = express();
app.get('/', (req, res) => {
  const app = <div className={styles.container}>Hello world</div>;
  const htmlContent = renderToStaticMarkup(app);

  res.json({
    css: [],
    html: htmlContent,
  });
});
app.listen(process.env.PORT);
```

Now, the problem is, how do I get the list of CSS files?

The list of CSS files produced by the build is only available after I compile the application, but I need the information to be part of compiled code.

The compiled code being part of the compilation, needs to contain information of the compilation.

## The 1st approach

A naive solution at first is to use [Webpack Manifest Plugin](https://www.npmjs.com/package/webpack-manifest-plugin) to get the compilation manifest, and in the code, import the manifest as json and consumes it:

```js
// ...
import webpackManifest from './dist/webpack-manifest.json';
const cssFiles = filterCssFiles(webpackManifest);
// ...
app.get('/', (req, res) => {
  res.json({
    css: cssFiles,
    html: htmlContent,
  });
});
// ...
```

Yet, the `./dist/webpack-manifest.json` is not available in the first place, before compiling the code.

Since the `./dist/webpack-manifest.json` can only be available after build, maybe we can import it during runtime, using [**non_webpack_require**](https://webpack.js.org/api/module-variables/#__non_webpack_require__-webpack-specific). The difference between `require` and `__non_webpack_require__` is that the latter is webpack specific, which tells webpack to transform it to just pure `require()` expression, without bundling the required module:

```js
// ...
const webpackManifest = __non_webpack_require__('./dist/webpack-manifest.json');
const cssFiles = filterCssFiles(webpackManifest);
// ...
app.get('/', (req, res) => {
  res.json({
    css: cssFiles,
    html: htmlContent,
  });
});
// ...
```

If you scrutinize the code, you may wonder whether `./dist/webpack-manifest.json` is the correct relative path from the compiled code?

Probably `./webpack-manifest.json` would be more accurate, if our output folder looks like this:

```
dist
├── webpack-manifest.json
└── bundle.js  // <-- the main output bundle
```

One can safely argue that, the approach above works and let's move on the next task. But, curiosity drives me to seek deeper for a more "elegant" solution, where one don't need `require('webpack-manifest.json')` in runtime, but that information is compiled into the code.

## The 2nd approach

So, the next "intuitive" approach is to [write a custom template plugin](/webpack-plugin-main-template), that adds the webpack manifest on top of the main bundle, an example of the output:

```js
// filename: bundle.js
// added by template plugin
const CSS_FILES = ['http://cdn/assets/style.xxx.css'];
// END added by template plugin
// ...the main bundle
app.get('/', (req, res) => {
  // ...
  res.json({
    css: CSS_FILES,
    html: htmlContent,
  });
});
```

In the source code, I will use the global variable `CSS_FILES`, and hopefully it will get defined by webpack, by adding `const CSS_FILES = ...` at the very top of the file.

And to be extra careful, I have to make sure also that there's no variable `CSS_FILES` declared between the global scope and the current scope the variable is being used.

```js
const ManifestPlugin = require('webpack-manifest-plugin');

class MyWebpackPlugin {
  apply(compiler) {
    new ManifestPlugin(manifestOptions).apply(compiler);
    // get manifest from `webpack-manifest-plugin`
    ManifestPlugin.getCompilerHooks(compiler).afterEmit.tap(
      'MyWebpackPlugin',
      manifest => {
        this.manifest = manifest;
      }
    );

    // see https://lihautan.com/webpack-plugin-main-template
    // on writing template plugin
    compiler.hooks.thisCompilation.tap('MyWebpackPlugin', compilation => {
      // ...
      hooks.render.tap('MyWebpackPlugin', (source, { chunk, chunkGraph }) => {
        // ...
        // highlight-start
        const prefix = `const CSS_FILES = ${JSON.stringify(this.manifest)};`;
        return new ConcatSource(prefix, source);
        // highlight-end
      });
    });
  }
}
```

Apparently, this does not work at all. The compiled output shows:

```js
// filename: bundle.js
const CSS_FILES = undefined;
// ...continue with bundle.js
```

After tracing through the code, I realised that I was ignorant of the sequence of execution of the [compiler hooks](https://webpack.js.org/api/compiler-hooks/).

In the [docs for compiler hooks](https://webpack.js.org/api/compiler-hooks/), each hooks is executed in sequence:

- ...
- run
- ...
- thisCompilation
- ...
- emit
- afterEmit
- ...

The webpack manifest plugin executes mainly [during the `emit` phase](https://github.com/danethurber/webpack-manifest-plugin/blob/63d3ee2/lib/plugin.js#L255), right before webpack writes all the assets into the output directory. And, we are modifying the template source in the `thisCompilation` phase, which is way before the `emit` phase. That's why `this.manifest` property is still undefined at the time of execution.

```js
- thisCompliation (this.manifest == undefined;)
- // ...
- emit (this.manifest = manifest) // too late!
```

Upon reading the code fot he `webpack-manifest-plugin`, I realised that during the `emit` phase, I can access to the `compilation.assets`, and so, I could modifying the source for the assets during that time!

```js
const ManifestPlugin = require('webpack-manifest-plugin');

class MyWebpackPlugin {
  apply(compiler) {
    new ManifestPlugin(manifestOptions).apply(compiler);
    // get manifest from `webpack-manifest-plugin`
    ManifestPlugin.getCompilerHooks(compiler).afterEmit.tap(
      'MyWebpackPlugin',
      manifest => {
        this.manifest = manifest;
      }
    );
    compiler.hooks.emit.tap('MyWebpackPlugin', compilation => {
      const prefix = `const CSS_FILES = ${JSON.stringify(this.manifest)};`;

      for (const file of Object.keys(compilation.assets)) {
        if (!file.endsWith('.js')) continue;
        compilation.assets[file] = new ConcatSource(
          prefix,
          compilation.assets[file]
        );
      }
    });
  }
}
```

Apparently that works, but I wonder whether is it a good practice to modifying the source of an asset during the `emit` phase? 🤔

And, if you noticed, I need to append the `const CSS_FILES = [...]` to every file, that's because I have no idea in which file `CSS_FILES` is referenced. And because I declared it using `const`, it only exists within the file's scope, so I have to redeclare it all the other files.

## The 3rd approach

I was still not convinced that this is the best I could do, so I continued looking around webpack's doc. I found a particular compilation hooks, [`needAdditionalPass`](https://webpack.js.org/api/compilation-hooks/#needadditionalpass), which seems useful. It says, _"Called to determine if an asset needs to be processed further after being emitted."_.

So, if I return `true` in the `needAdditionalPass`, webpack will re`compile` the asset again:

```js
class MyWebpackPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap('MyWebpackPlugin', compilation => {
      compilation.hooks.needAdditionalPass.tap('MyWebpackPlugin', () => {
        return true;
        // if it is always true, will lead to infinite loop!
      });
    });
  }
}
```

```js
- thisCompliation (this.manifest == undefined;)
- // ...
- emit (this.manifest = manifest) // too late!
- // ...
- needAddtionalPass (return true) // to start the compilation again
- // ...
- thisCompilation (this.manifest == manifest) // now `this.manifest` is available
- // ... will continue run through every stages again
- emit (this.manifest = manifest)
- // ...
```

Note that using `needAdditionalPass` will cause the build time to roughly doubled!

You may argue that why do we need to rerun the `compilation` process again, isn't the end result can be equally achieved by modifying the assets source in the `emit` phase?

Well, that's because, I realised I could make use [some of the code from the `DefinePlugin`](https://github.com/webpack/webpack/blob/d426b6c/lib/DefinePlugin.js), which could replace the usage of `CSS_FILES` throughout the code. That way, I don't have to prefix every file with `const CSS_FILES = ...`.

DefinePlugin uses something called [**JavaScriptParser Hooks**](https://webpack.js.org/api/parser/), which you can rename a variable through `canRename` and `identifier` hooks or replace an expression through the `expression` hook:

```js
class MyWebpackPlugin {
  apply(compiler) {
    compiler.hooks.thisCompilation.tap(
      'MyWebpackPlugin',
      (compilation, { normalModuleFactory }) => {
        normalModuleFactory.hooks.parser
          .for('javascript/auto')
          .tap('MyWebpackPlugin', parser => {
            // highlight-start
            parser.hooks.expression
              .for('CSS_FILES')
              .tap('MyWebpackPlugin', expr => {
                return ParserHelpers.toConstantDependency(
                  parser,
                  JSON.stringify(this.manifest)
                )(expr);
              });
            // highlight-end
          });
      }
    );
  }
}
```

The complete code can be found in [this gist](https://gist.github.com/tanhauhau/2dc6cc376fd190e05d14901b984c7fc1).

An example of the compiled output:

```js
// filename: bundle.js
// ...
app.get('/', (req, res) => {
  // ...
  res.json({
    // replaced via parser hooks
    // highlight-next-line
    css: ['http://cdn/assets/style.xxx.css'],
    html: htmlContent,
  });
});
```

## Closing Notes

The compile output for the 3rd approach seemed to be better (more precise?) than the other, yet I am not entirely sure using a `needAdditionalPass` is the right way of going about it.

So, [let me know](https://twitter.com/lihautan) if you have any thoughts or suggestions, yea?
