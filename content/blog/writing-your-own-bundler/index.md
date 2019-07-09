---
title: Writing your own bundler
date: '2019-06-29T08:00:00Z'
description: 'understand how module bundler works'
wip: true
---

# Overview

![module bundlers](./images/module-bundlers.png 'Module Bundlers: (left to right) Rollup, FuseBox, webpack, parcel')

Say you are writing a web application, and you

<!-- TODO: -->

...WIP

# Writing it

A basic module bundler has to do 2 things:

- Construct the dependency graph **(Dependency Resolution)**
- Assembles the module in the graph into a single executable asset **(Bundle)**

> A **dependency graph** is a graph representation of the dependency relationship between modules.

So let's create the main function of our module bundler, and let's call it `build`.

<!-- prettier-ignore -->
```js
function build({ entryFile, outputFolder, outputFile }) {
  // build dependency graph
  const module = createModule(entryFile);
  // bundle the asset
  const output = bundle(module);
  // write the output to the outputFile
  fs.writeFileSync(
    path.join(outputFolder, outputFile),
    output,
    'utf-8'
  )
}
```

Let's start with implementing `createModule`, it would be create a new instance of `Module`:

```js
function createModule(filePath) {
  return new Module(filePath);
}
```

The class `Module` will be used to record module properties, such as the content, the dependencies, exported keys, etc.

```js
class Module {
  constructor(filePath) {
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');
  }
}
```

While the `content` is the string content of the module, to understand what it actually means, we would need to _parse the content_ into AST (Abstract Syntax Tree). Let's use [babel](http://babeljs.io) to parse the code:

```js
class Module {
  constructor(filePath) {
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');
    // highlight-next-line
    this.ast = babel.parseSync(this.content);
  }
}
```

The next thing we are looking for, is the dependency of this module:

```js
class Module {
  constructor(filePath) {
    this.filePath = filePath;
    this.content = fs.readFileSync(filePath, 'utf-8');
    this.ast = babel.parseSync(this.content);
    // highlight-start
    this.dependencies = this.findDependencies();
  }
  findDependencies() {
    //
  }
}
```

So, how do we know what is the dependency of this module? Well we can find the `import` statement from the AST we just got. How do we know how does our AST look like, and how to find the `import` statement from our AST? Well, you can visualise it through [babel-ast-explorer](https://lihautan.com/babel-ast-explorer/#?eyJiYWJlbFNldHRpbmdzIjp7InZlcnNpb24iOiI3LjQuNSJ9LCJ0cmVlU2V0dGluZ3MiOnsiaGlkZUVtcHR5Ijp0cnVlLCJoaWRlTG9jYXRpb24iOnRydWUsImhpZGVUeXBlIjp0cnVlfSwiY29kZSI6ImltcG9ydCBzcXVhcmVBcmVhIGZyb20gJy4vc3F1YXJlLmpzJztcbmltcG9ydCBjaXJjbGVBcmVhIGZyb20gJy4vY2lyY2xlLmpzJztcblxuY29uc29sZS5sb2coJ0FyZWEgb2Ygc3F1YXJlOiAnLCBzcXVhcmVBcmVhKDUpKTtcbmNvbnNvbGUubG9nKCdBcmVhIG9mIGNpcmNsZScsIGNpcmNsZUFyZWEoNSkpO1xuIn0=):

![babel-ast-explorer](./images/ast-import.png 'Visualizing AST through babel-ast-explorer')

We can see that the node we are looking for is called `ImportDeclaration`, and the property that tells us where we are importing from is the `source.value`:

```js
findDependencies() {
  // highlight-start
  return this.ast.program.body
    .filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source.value)
  // highlight-end
}
```

So now we have the path that we are requesting, it could be relative to our current file, eg _"./foo/bar"_, or from our node_modules, eg: _"lodash"_, so how do we know what is the actual file path that we are requesting?

The step that we need to do, to figure out the actual path based on the requested path, is called **"Resolving"**:

```js
findDependencies() {
  return this.ast.program.body
    .filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source.value)
  // highlight-next-line
    .map(relativePath => resolveRequest(this.filePath, relativePath))
}

// highlight-start
// resolving
function resolveRequest(requester, requestedPath) {
  // 
}
```


# Further Readings

- https://slides.com/lucianomammino/unbundling-the-javascript-module-bundler-dublinjs
