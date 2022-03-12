---
title: I wrote my module bundler II
date: '2019-10-16T08:00:00Z'
tags: 
  - JavaScript
  - module bundler
  - dev tool
  - webpack
description: "We've built a simple bundler to bundle javascript code. Let's add CSS, HTML and serve it in the browser!"
series: Write a module bundler
label: blog
---

In my [previous article](/i-wrote-my-module-bundler/), I showed you how I built a module bundler. With the module bundler I built, I bundled a simple Nodejs script to calculate the area for a square and a circle:

![bundled code demo](./images/cli.png)

Today, I am going to share with y'all how I enhanced on my basic module bundler so that I can use it to bundle not just a NodeJS script, but a web application.

I will be showing how I added the following features:

- [Adding HTML Template](#adding-html-template)
- [Adding CSS](#adding-css)
- [Provide a dev server](#dev-server)

---

⚠️ **Warning: Tons of JavaScript code ahead. 🙈😱😨** ⚠️

---

## Before we begin

I found an edge case bug in my module bundler if the module ends with a line comment, the output bundle might have a syntax error.

I've fixed the bug by appending a newline character to the end of the module code:

```js
function toModuleMap(modules) {

for (const module of modules) {
  module.transformModuleInterface();
  // highlight-next-line
  moduleMap += `"${module.filePath}": function(exports, require) { ${module.content}\n },`;
}
```

😎

Also, I've changed the resolver code, which used to only be able to resolve the relative path:

```js
function resolveRequest(requester, requestPath) {
  // highlight-start
  if (requestPath[0] === '.') {
    // relative import
    return path.join(path.dirname(requester), requestPath);
  } else {
    const requesterParts = requester.split('/');
    const requestPaths = [];
    for (let i = requesterParts.length - 1; i > 0; i--) {
      requestPaths.push(requesterParts.slice(0, i).join('/') + '/node_modules');
    }
    // absolute import
    return require.resolve(requestPath, { paths: requestPaths });
  }
  // highlight-end
}
```

Now I can import libraries from `node_modules/`.

_Did I just said "import libraries"?_ 🙊

## Adding HTML Template

To bundle for the web, the most important piece is to have the HTML.

Usually, we provide an HTML template to the module bundler. And when the module bundler finishes the bundling process, it will come up with a list of files that is required to start the application and add them into the HTML file in the form of a `&lt;script&gt;` tag.

To illustrate here is the HTML template that I've prepared:

```html
<!-- filename: index.html -->
<html>
  <body></body>
</html>
```

And at the end of the bundling process, the bundler generated the following files:

```yml
- bundle.js
```

So the `bundle.js` is added into the final HTML file like this:

```html
<!-- filename: index.html -->
<html>
  <body>
    <script src="/bundle.js">
  </body>
</html>
```

> <small>**NOTE:** the preceding slash (`/`) allows us to always fetch the JavaScript file relative from the root path. This is extremely useful for Single Page Application (SPA), where we serve the same HTML file irrelevant to the URL path.</small>

Code wise, it is quite straightforward to implement this:

```js
// filename: index.js
function build({ entryFile, outputFolder, htmlTemplatePath }) {
  // ...
  const outputFiles = bundle(graph);
  // highlight-next-line
  outputFiles.push(generateHTMLTemplate(htmlTemplatePath, outputFiles));
  // ...
}

// highlight-start
const END_BODY_TAG = '</body>';
function generateHTMLTemplate(htmlTemplatePath, outputFiles) {
  let htmlTemplate = fs.readFileSync(htmlTemplatePath, 'utf-8');
  htmlTemplate = htmlTemplate.replace(
    END_BODY_TAG,
    outputFiles.map(({ name }) => `<script src="/${name}"></script>`).join('') +
      END_BODY_TAG
  );
  return { name: 'index.html', content: htmlTemplate };
}
```

Here, I used a `.replace(END_BODY_TAG, '...' + END_BODY_TAG)` to insert the `&lt;script&gt;` tags before the end of the `</body>` tag.

> <small>**Note:** Read [here](https://www.codecademy.com/forum_questions/55dee24b937676fb5e000139) to learn why it's a best practice to add `&lt;script&gt;` tag at the end of the `<body>` tag.</small>

## Adding CSS

Every web app has to have CSS in one way or another.

I added a css file and imported it from `index.js`:

```js
// filename: index.js
import './style.css';
```

```css
/* filename: style.css */
.square {
  color: blue;
}
.circle {
  color: red;
}
```

If I bundle my application now, I would see a `SyntaxError`:

```
SyntaxError: unknown: Unexpected token (1:0)
> 1 | .square {
    | ^
  2 |   color: blue;
  3 | }
  4 | .circle {
    at Parser.raise (node_modules/@babel/parser/lib/index.js:6344:17)
```

That is because I assumed all files are JavaScript files, and Babel would complain when trying to parse out the import statements.

So, I abstracted out `Module` as a base class, and created `JSModule` and `CSSModule`:

```js
// filename: index.js
class Module {
  constructor(filePath) {
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');
  }
  initDependencies() {
    this.dependencies = [];
  }
  transformModuleInterface() {}
}

class JSModule extends Module {}

class CSSModule extends Module {}
```

In the `createModule` function, I need to create different `Module` based on the file extension:

```js
// filename: index.js

// highlight-start
const MODULE_LOADERS = {
  '.css': CSSModule,
  '.js': JSModule,
}
// highlight-end

function createModule(filePath) {
  // ...
    // highlight-start
    const fileExtension = path.extname(filePath);
    const ModuleCls = MODULE_LOADERS[fileExtension];
    if (!ModuleCls) {
      throw new Error(`Unsupported extension "${fileExtension}".`);
    }
    const module = new ModuleCls(filePath);
    // hightlight-end
    MODULE_CACHE.set(filePath, module);
    // ...
  }
}
```

### Loaders

Here I used the word `"LOADERS"`, which I borrowed from [webpack](https://webpack.js.org/loaders/).

According to webpack, _"[[loaders]](https://webpack.js.org/loaders/) enable webpack to preprocess files, [which] allows you to bundle any static resource way beyond JavaScript."_

To take it from a different perspective, **loaders** are simple functions that transform any code into **browser-executable JavaScript code**.

For example, if you import a CSS file, the CSS code in the file will pass through the loader function to be transformed into JS code. So that you can import a CSS file as if you are importing a JS file.

**Wait, how are we going to transform CSS code into JS code?**

Well, one way you can do that is to make the CSS code into a string by wrapping it around with quote marks `'`, and programmatically add the CSS code into the HTML `<head />`.

For example, taking the following CSS code:

```css
.square {
  color: blue;
}
.circle {
  color: red;
}
```

and transform it into the following JS code:

```js
const content = `.square { color: blue; } .circle { color: red; }`;
// create style tag
const style = document.createElement('style');
style.type = 'text/css';
// for ie compatibility
if (style.styleSheet) style.styleSheet.cssText = content;
else style.appendChild(document.createTextNode(content));
// append to the head
document.head.appendChild(style);
```

This is in essence what [style-loader](https://github.com/webpack-contrib/style-loader) is doing, except `style-loader` does even more:

- supports hot reloading
- provides different mode of injecting, `styleTag`, `singletonStyleTag`, `linkTag`, ... etc.
- provides different points in dom for injecting the style tag.

**Did I mentioned "browser-executable JavaScript code"?**

Yes, not all JavaScript code is executable in a browser if you are using next-generation syntaxes or constructs that is not yet available in the browser. That's why you need [babel-loader](https://github.com/babel/babel-loader) for your JavaScript files, to make sure they can be run in all supported browsers.

---

So, I implemented the loader transform in CSSModule with [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals):

```js
// filename: index.js
class Module {
  constructor(filePath) {
    // ...
    // highlight-next-line
    this.transform();
  }
}

class CSSModule extends Module {
  // highlight-start
  transform() {
    this.content = trim(`
      const content = '${this.content.replace(/\n/g, '')}';
      const style = document.createElement('style');
      style.type = 'text/css';
      if (style.styleSheet) style.styleSheet.cssText = content;
      else style.appendChild(document.createTextNode(content));
      document.head.appendChild(style);
    `);
  }
  // highlight-end
}
```

## Dev Server

Dev server is a default feature for frontend build tools nowadays, it's common feature are:

- Serving generated assets, assets can be either served from the filesystem or in memory
- Supports watch mode, reloading and hot module replacement
- Act as a proxy to external APIs

In this post, I will show you how I created a basic dev server using [Express](https://expressjs.com) for serving the generated assets in memory, we will discuss the watch mode in the future post.

I abstracted out the `_build` function and supports both `build` and `dev` mode.

```js
// filename: index.js

// highlight-start
function _build({ entryFile, htmlTemplatePath }) {
  // build dependency graph
  const graph = createDependencyGraph(entryFile);
  // bundle the asset
  const outputFiles = bundle(graph);
  outputFiles.push(generateHTMLTemplate(htmlTemplatePath, outputFiles));
  return { outputFiles, graph };
}
// highlight-end

function build({ entryFile, outputFolder, htmlTemplatePath }) {
  // highlight-next-line
  const { outputFiles } = _build({ entryFile, htmlTemplatePath });
  // write to output folder
  // ...
}

// highlight-start
function dev({ entryFile, outputFolder, htmlTemplatePath, devServerOptions }) {
  const { outputFiles } = _build({ entryFile, htmlTemplatePath });
}
```

In `dev` mode, I did not write files to the file system, instead I served them directly through the [Express](https://expressjs.com) server:

```js
// filename: index.js
function dev({ entryFile, outputFolder, htmlTemplatePath, devServerOptions }) {
  const { outputFiles } = _build({ entryFile, htmlTemplatePath });

  // highlight-start
  // create a map of [filename] -> content
  const outputFileMap = {};
  for (const outputFile of outputFiles) {
    outputFileMap[outputFile.name] = outputFile.content;
  }
  const indexHtml = outputFileMap['index.html'];

  const app = express();
  app.use((req, res) => {
    // trim off preceding slash '/'
    const requestFile = req.path.slice(1);
    if (outputFileMap[requestFile]) {
      return res.send(outputFileMap[requestFile]);
    }
    res.send(indexHtml);
  });
  app.listen(devServerOptions.port, () =>
    console.log(
      `Dev server starts at http://localhost:${devServerOptions.port}`
    )
  );
  // highlight-end
}
```

And that's it. You have a basic dev server that serves the bundled files!

## Wrap it up

I've added [Preact](https://preactjs.com/) and CSS into my app:

```js
// filename: main.js
import squareArea from './square.js';
import circleArea from './circle.js';

import { createElement, render } from 'preact';
import './style.css';
export const PI = 3.141;

render(
  createElement(
    'p',
    {},
    createElement('p', { class: 'square' }, 'area of square: ' + squareArea(5)),
    createElement('p', { class: 'circle' }, 'area of circle: ' + circleArea(5))
  ),
  document.getElementById('root')
);
```

```css
/* filename: style.css */
.square {
  color: blue;
}
.circle {
  color: red;
}
```

And also an HTML template:

```html
<!-- filename: index.html -->
<html>
  <body>
    <div id="root"></div>
  </body>
</html>
```

Starting my bundler:

![Running bundler + dev server](./images/dev-server.png)

And voila!

![Served results](./images/result.png)

## Whats next?

I have promised in my previous post, features that I will implement:

- code splitting
- watch mode

and yes, I will implement them!

Till then. Cheers. 😎

## References

- [Webpack Dev Server](https://github.com/webpack/webpack-dev-server)
- [style-loader](https://github.com/webpack-contrib/style-loader)
