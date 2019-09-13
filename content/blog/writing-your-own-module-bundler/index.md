---
title: Writing your own module bundler
date: '2019-06-29T08:00:00Z'
tags: JavaScript,module bundler,dev tool,webpack
series: writing your own module bundler
wip: true
---

In my [previous article](/what-is-module-bundler-and-how-does-it-work/), I explained how module bundler works, and I used [webpack](https://webpack.js.org) and [rollup](https://rollupjs.org) as example, and each of them gave us a different perspective in how we can bundle our JavaScript application.

If you haven't read it, please do [check it out](/what-is-module-bundler-and-how-does-it-work/), because in this article, I am going to talk about how we are going to write a module bundler ourselves.

---

⚠️ **Warning: Tons of code ahead. 🙈😱😨** ⚠️

---

# Getting Started

We have seen the input (the JavaScript modules) and the output (the bundled JavaScript file) of a module bundler in the [previous article](/what-is-module-bundler-and-how-does-it-work/), now let's take a look how we can create a tool to get takes in the input and produce the output.

A basic module bundler can be broken down into 2 parts:

- Understands the code and constructs the dependency graph **(Dependency Resolution)**
- Assembles the module into a single (or multiple) JavaScript file **(Bundle)**

> A **dependency graph** is a graph representation of the dependency relationship between modules.

## The Input

We will be using the following files as input to our bundler:

```js
// filename: index.js
import squareArea from './square.js';
import circleArea from './circle.js';

console.log('Area of square: ', squareArea(5));
console.log('Area of circle', circleArea(5));
```

```js
// filename: square.js
function area(side) {
  return side * side;
}
export default area;
```

```js
// filename: circle.js
const PI = 3.141;
function area(radius) {
  return PI * radius * radius;
}
export default area;
```

If you want to try along, you can clone [this project](https://github.com/tanhauhau/byo-bundler/tree/master/fixture) and checkout the `fixture-1` tag. the input files are in the `fixture/` folder.

# Writing

So let's start with creating the outline of the main function of our module bundler, and let's call it `build`.

<!-- prettier-ignore -->
```js
function build({ entryFile, outputFolder }) {
  // build dependency graph
  const graph = createDependencyGraph(entryFile);
  // bundle the asset
  const outputFiles = bundle(graph);
  // write to output folder
  for(const outputFile of outputFiles) {
    fs.writeFileSync(
      path.join(outputFolder, outputFile.name),
      outputFile.content,
      'utf-8'
    )
  }
}
```

> The **dependency graph** that we are going to build, is a [directed graph](https://en.wikipedia.org/wiki/Directed_graph), where the vertex is the module, and the directed edge is the dependency relationship between the modules.

```js
function createDependencyGraph(entryFile) {
  const rootModule = createModule(entryFile);
  return rootModule;
}
```

The dependency graph creates a module with the entry file, and we are going to return just that at the moment.

So, let's implement `createModule`:

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
    this.dependencies = [];
  }
}
```

While the `content` is the string content of the module, to understand what it actually means, we would need to _parse the content_ into AST (Abstract Syntax Tree). Let's use [babel](http://babeljs.io) to parse the code:

```js
// highlight-next-line
const babel = require('@babel/core');

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
  // highlight-end
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

So now we have the path that we are requesting, it could be relative to our current file, eg _"./foo/bar"_, or from our node*modules, eg: *"lodash"\_, so how do we know what is the actual file path that we are requesting?

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

_Resolving path to the actual file path_

## Resolving

We know that "import"ing `./b.js` in the following examples will result in getting a different file, because when we specify `./`, we are "import"ing relative to the current file.

```js
// filename: <root>/a.js
import './b.js';
```

```js
// filename: <root>/foo/a.js
import './b.js';
```

So, what are the rules of resolving a module? [Node.js Modules Resolving](http://nodejs.org/api/modules.html#modules_all_together) list out the detail step of the Node.js resolving algorithm:

When we specify a relative path, `./b`, Node.js will first assume that `./b` is a file, and tries the following extension if it doesn't exactly match the file name:

```
b
b.js
b.json
b.node
```

If the file does not exist, Node.js will then try to treat `./b` as a directory, and try the following:

```
"main" in b/package.json
b/index.js
b/index.json
b/index.node
```

If we specify `import 'b'` instead, Node.js will treat it as a package within `node_modules/`, and have a different resolving strategy.

Through the above illustration, we can see that resolving `import './b'` is not as simple as it seems. Besides the default Node.js resolving behaviour, [webpack provides a lot more customisation options](https://webpack.js.org/configuration/resolve/), such as custom extensions, alias, modules folders, etc.

To move things forward, we are going to handle resolving relative path for now:

```js
const path = require('path');
// highlight-start
// resolving
function resolveRequest(requester, requestedPath) {
  return path.join(path.dirname(requester), requestedPath);
}
```

> <small>**Note:** You should try out writing a full node resolvers that resolve relatively as well as absolutely from `node_modules/`</small>

Now we know the actual requested file path, let's create a module out of them as well!

```js
findDependencies() {
  return this.ast.program.body
    .filter(node => node.type === 'ImportDeclaration')
    .map(node => node.source.value)
    .map(relativePath => resolveRequest(this.filePath, relativePath))
  // highlight-next-line
    .map(absolutePath => createModule(absolutePath))
}
```

So, for each module, we find their dependencies, parse them, and find each dependency's dependencies recursively. At the end of the process, we will get a module dependency graph. If you console out the dependency graph, you will see something like this:

```js
Module {
  filePath: '/Projects/byo-bundler/fixture/index.js',
  content:
   'import squareArea from \'./square.js\';\nimport circleArea from \'./circle.js\';\n\nconsole.log(\'Area of square: \', squareArea(5));\nconsole.log(\'Area of circle\', circleArea(5));\n',
  ast:
   Node { /*...*/ },
  dependencies:
   [ Module {
       filePath: '/Projects/byo-bundler/fixture/square.js',
       content:
        'function area(side) {\n  return side * side;\n}\nexport default area;\n',
       ast: Node {/* ... */},
       dependencies: []
      },
     Module {
       filePath: '/Projects/byo-bundler/fixture/circle.js',
       content:
        'const PI = 3.141;\nfunction area(radius) {\n    return PI * radius * radius;\n}\nexport default area;\n',
       ast: Node {/* ... */},
       dependencies: []
      }
   ]
}
```

The root of the graph is our entry module, and you can traverse the graph through the `dependencies` of the module. As you can see, the `index.js` has 2 dependencies, the `square.js` and the `circle.js`.

> <small>**Note:** If you are following along, you can checkout the tag `feat-1-module-dependency-graph`, to see the code that we have written so far.</small>

## Bundling

So now with the module dependency graph, it's time for us to bundle them into a file!

At this point in time, we can choose whether we want to bundle it in the **"webpack way"** or the **"rollup way"**. In this article we are going to look at the **"webpack way"**, I'll write about bundling in the **"rollup way"** in the next article.

> If you have no idea about what is the **"webpack way"** or **"rollup way"**, I have coined the term in my [previous article](/what-is-module-bundler-and-how-does-it-work/) and have detailed explanation about them!

Let's take a look how the final bundled file would look like:

```js
const modules = {
  'circle.js': function(exports, require) {
    const PI = 3.141;
    exports.default = function area(radius) {
      return PI * radius * radius;
    };
  },
  'square.js': function(exports, require) {
    exports.default = function area(side) {
      return side * side;
    };
  },
  'app.js': function(exports, require) {
    const squareArea = require('square.js').default;
    const circleArea = require('circle.js').default;
    console.log('Area of square: ', squareArea(5));
    console.log('Area of circle', circleArea(5));
  },
};

webpackStart({
  modules,
  entry: 'app.js',
});
```

Let's break it down to a few steps:

- **Group modules into files**
- **Create the module map** and wrapping each module in a "special" module factory function
- **Create the "runtime"**, the glue that links each module together.

### Grouping modules into files

We need to decide which modules goes to which file. We split them into different files because of [code splitting](https://webpack.js.org/guides/code-splitting/) due to dynamic import as well as optimisation, such as the webpack's [Chunk Splitting](https://webpack.js.org/plugins/split-chunks-plugin/).
We'll work on the code splitting later, let us first focus on making our module bundler works.

So, we collect all the modules into a list, by doing a graph traversal:

```js
function bundle(graph) {
  // highlight-next-line
  collectModules(graph);
  return [];
}

// highlight-start
function collectModules(graph) {
  const modules = [];
  collect(graph, modules);
  return modules;

  function collect(module, modules) {
    modules.push(module);
    module.dependencies.forEach(dependency => collect(dependency, modules));
  }
}
```

...and we'll take the list and make them into a module map.

### Creating module map

Module map that we are creating here is a string, that would be inlined into the bundle file.

So, we loop through each module, and add use `module.filePath` as the key, and `module.content` as the value.

The reason I dont use `JSON.stringify(moduleMap)` instead of manually concatenating to build up the module map, is because JSON can only takes in [JSON primitive data type](https://documentation.progress.com/output/ua/OpenEdge_latest/index.html#page/dvjsn/json-data-types.html) as value, but what I want to build here is a JavaScript map, with `function` as value, but in string.

```js
function bundle(graph) {
  const modules = collectModules(graph);
  // highlight-next-line
  const moduleMap = toModuleMap(modules);
  return [];
}

// highlight-start
function toModuleMap(modules) {
  let moduleMap = '';
  moduleMap += '{';

  for (const module of modules) {
    moduleMap += `"${module.filePath}": ${module.content},`;
  }

  moduleMap += '}';
  return moduleMap;
}
```

If you have noticed, we need to wrap the `module.content` with a module factory function:

```js
for (const module of modules) {
  // highlight-next-line
  moduleMap += `"${module.filePath}": function(exports, require) { ${
    module.content
  } },`;
}
```

So, what this function do is that, it provides 2 parameter to the module:

- `exports`, an object that the module can assign its exported value onto
- `require`, a function that the module can invoke with module path to import exported value from another module

So, if you console out the module map right now, it doesn't seemed to be something that can be executed:

```js
{
  "index.js": function(exports, require) {
    import squareArea from './square.js';
    import circleArea from './circle.js';

    console.log('Area of square: ', squareArea(5));
    console.log('Area of circle', circleArea(5));
  },
  "square.js": function(exports, require) {
    function area(side) {
      return side * side;
    }
    export default area;
  },
  "circle.js": function(exports, require) {
    const PI = 3.141;
    function area(radius) {
      return PI * radius * radius;
    }
    export default area;
  },
}
```

That's because it still uses `import` and `export` and we need to transform them to use `exports` and `require` that we pass in.

To transform the code, we can utilise the `ast` of the module: we do transformation on the ast, and then generate the code based on the transformed ast.

So how do we get started in transforming the ast?

I wrote a [step by step guide](/step-by-step-guide-for-writing-a-babel-transformation) on how to do it, so I am not going to repeat the details over here.

Right now, what we need is the following transformation:

```js
// #1
// from
import a, { b, c } from 'foo';
// to
const { default: a, b, c } = require('foo');

// #2
export default a;
export const b = 2;
export { c };
// to
exports.default = a;
exports.b = 2;
exports.c = c;
```

Now knowing **what to target on AST** and **how the transformed AST look like**, let's write the transformation code:

```js
for (const module of modules) {
  // highlight-next-line
  module.transformModuleInterface();
  moduleMap += `"${module.filePath}": function(exports, require) { ${module.content} },`;
}
// ...
class Module {
  // ...
  // highlight-start
  transformModuleInterface() {
    const { ast, code } = babel.transformFromAstSync(this.ast, this.content, { ... });
    this.ast = ast;
    this.content = code;
  }
  // highlight-end
}
```

I purposely omitted the actual babel transformation code, because it is lengthy. If you are interested to read about it, you can check out

<!-- TODO: -->.

So, now the module map looks ready:

```js
{
  "index.js": function(exports, require) {
    const { default: squareArea } = require('square.js');
    const { default: circleArea } = require('circle.js');

    console.log('Area of square: ', squareArea(5));
    console.log('Area of circle', circleArea(5));
  },
  "square.js": function(exports, require) {
    function area(side) {
      return side * side;
    }
    exports.default = area;
  },
  "circle.js": function(exports, require) {
    const PI = 3.141;
    function area(radius) {
      return PI * radius * radius;
    }
    exports.default = area;
  },
}
```

One thing we need to take note is that, for the `require` statements, we need to replace those requested path to the actual resolved path.

### **Create the "runtime"**,

Now you have the module map, it's time to create the runtime. The runtime is a piece of code that is part of the output bundle, that runs when the application code is running, therefore, the runtime.

We can store the runtime code in a template file or as a string, and then concatenate with the module map string:

```js
function bundle(graph) {
  const modules = collectModules(graph);
  const moduleMap = toModuleMap(modules);
  // highlight-next-line
  const moduleCode = addRuntime(moduleMap, modules[0].filePath);
  return [];
}
// highlight-start
function addRuntime(moduleMap, entryPoint) {
  return trim(`
    const modules = ${moduleMap};
    const entry = "${entryPoint}";
    function webpackStart({ modules, entry }) {
      const moduleCache = {};
      const require = moduleName => {
        // if in cache, return the cached version
        if (moduleCache[moduleName]) {
          return moduleCache[moduleName];
        }
        const exports = {};
        // this will prevent infinite "require" loop
        // from circular dependencies
        moduleCache[moduleName] = exports;
    
        // "require"-ing the module,
        // exported stuff will assigned to "exports"
        modules[moduleName](exports, require);
        return moduleCache[moduleName];
      };
    
      // start the program
      require(entry);
    }

    webpackStart({ modules, entry });`);
}

// trim away spaces before the line
function trim(str) {
  const lines = str.split('\n').filter(Boolean);
  const padLength = lines[0].length - lines[0].trimLeft().length;
  const regex = new RegExp(`^\\s{${padLength}}`);
  return lines.map(line => line.replace(regex, '')).join('\n');
}
```

The code above is self explanatory, except if you have no idea what does the `webpackStart()` do, you can read more about it in [my previous post](/what-is-module-bundler-and-how-does-it-work/).

Finally, we return the module code from the `bundle` function:

```js
function bundle(graph) {
  const modules = collectModules(graph);
  const moduleMap = toModuleMap(modules);
  const moduleCode = addRuntime(moduleMap, modules[0].filePath);
  // highlight-next-line
  return [{ name: 'bundle.js', content: moduleCode }];
}
```

Now if you run the code, you will see a `output/bundle.js` file generated. Run it with node, you will see:

```
Area of square:  25
Area of circle 78.525
```

That's it! You have a working module bundler!

Of course, the module bundler we have is nowhere near webpack. Webpack supports more module system, resolving strategies, loading strategies, plugin system, optimisation, and many many more. Hopefully through this exercise of writing our own module bundler, I hope we can be more appreciative of what webpack has provided to us.

# Optimisation

Before we pat ourself on the back and call it a day, there is a bug that we need to fix: Circular Dependency.



## Circular dependency

## Module ID

# Summary

- bundle(graph); returns an array -> we are going to do code splitting

# Further Readings

- [Luciano Mammino, Unbundling the JavaScript module bundler - DublinJS July 2018](https://slides.com/lucianomammino/unbundling-the-javascript-module-bundler-dublinjs)
- [Ronen Amiel, Build Your Own Webpack - You Gotta Love Frontend 2018](https://www.youtube.com/watch?v=Gc9-7PBqOC8)
