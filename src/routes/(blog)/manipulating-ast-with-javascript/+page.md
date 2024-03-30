---
title: Manipulating AST with JavaScript
date: '2019-11-22T08:00:00Z'
description: 'Manipulating AST is not that hard anyway'
tags: 
  - JavaScript
  - AST
  - transform
  - depth-first-search
series: AST
label: blog
---

Previously, I've talked about [how to write a babel transformation](/step-by-step-guide-for-writing-a-babel-transformation), and I went one step deeper into [Babel](https://babeljs.io/), by [showing how you can create a custom JavaScript syntax](/creating-custom-javascript-syntax-with-babel), I demonstrated how Babel parses your code into AST, transforms it and generates back into code.

Armed with the knowledge and experience of playing the JavaScript AST with Babel, let's take a look at how we can generalize this knowledge into other languages as well.

> When I refer to "other languages", I am actually referring to popular frontend languages, for example: [JavaScript](https://www.ecma-international.org/publications/standards/Ecma-262.htm), [TypeScript](http://typescriptlang.org/), [Sass](https://sass-lang.com/), [CSS](https://www.w3.org/Style/CSS/), [HTML](https://www.w3.org/html/), [markdown](https://en.wikipedia.org/wiki/Markdown)...
>
> Of course, it does not limit to just frontend languages. It's just that it's easier to find a parser for these languages written in JavaScript than other languages, say C++ or Java.

## The parsers

Like how we use Babel to do parsing and generating JavaScript, there are other libraries out there to help us with parsing and generating our language.

One easy trick to find these libraries is through [https://astexplorer.net/](https://astexplorer.net/).

![ast explorer](./images/ast-explorer.gif)

After you choose a language, you would see a list of parsers you can use to parse your language. For example, if you choose **HTML**, there's [htmlparser2](https://github.com/fb55/htmlparser2), [hyntax](https://github.com/nik-garmash/hyntax), [parse5](https://github.com/inikulin/parse5)... And when you choose one of the parsers, you can immediately see how the AST looks like on the right panel and the Github link to the parser on the top right.

![ast explorer](./images/ast-html.png)

Here is a un-exhaustive list of parsers, and it's `parse` and `generate` methods:

<div style="overflow:auto;margin-bottom:2em;">
<table>
  <thead>
    <tr>
      <th>Language</th>
      <th>Parser</th>
      <th><code class="language-text">parse</code></th>
      <th><code class="language-text">generate</code></th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>HTML</td>
      <td><a href="https://github.com/inikulin/parse5/tree/master/packages/parse5">parse5</a></td>
      <td><a href="https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/index.md#parse"><code class="language-text">parse5.parse(str)</code></a></td>
      <td><a href="https://github.com/inikulin/parse5/blob/master/packages/parse5/docs/index.md#serialize"><code class="language-text">parse5.serialize(ast)</code></a></td>
    </tr>
    <tr>
      <td>Markdown</td>
      <td><a href="https://github.com/remarkjs/remark">remark</a></td>
      <td><a href="https://github.com/remarkjs/remark/tree/master/packages/remark-parse"><code class="language-text">unified().use(remarkParse)</code></a></td>
      <td><a href="https://github.com/remarkjs/remark/tree/master/packages/remark-stringify"><code class="language-text">unified().use(remarkStringify)</code></a></td>
    </tr>
    <tr>
      <td>CSS</td>
      <td><a href="https://github.com/csstree/csstree">css-tree</a></td>
      <td><a href="https://github.com/csstree/csstree/blob/master/docs/parsing.md"><code class="language-text">csstree.parse(str)</code></a></td>
      <td><a href="https://github.com/csstree/csstree/blob/master/docs/generate.md"><code class="language-text">csstree.generate(ast)</code></a></td>
    </tr>
    <tr>
      <td>Sass</td>
      <td><a href="https://github.com/shawnbot/sast">sast</a></td>
      <td>
        <a href="https://github.com/shawnbot/sast#sastparsesource--options-">
          <code class="language-text">sast.parse(str)</code>
        </a>
      </td>
      <td>
        <a href="https://github.com/shawnbot/sast#saststringifynode-">
          <code class="language-text">sast.stringify(ast)</code>
        </a>
      </td>
    </tr>
    <tr>
      <td>JavaScript</td>
      <td><a href="https://babeljs.io/">babel</a></td>
      <td><a href="https://babeljs.io/docs/en/babel-parser#babelparserparsecode-options"><code class="language-text">babel.parse(str)</code></a></td>
      <td><a href="https://babeljs.io/docs/en/babel-generator"><code class="language-text">babel.generate(ast)</code></a></td>
    </tr>
    <tr>
      <td>TypeScript</td>
      <td><a href="http://typescriptlang.org/">TypeScript</a></td>
      <td><a href="https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#creating-and-printing-a-typescript-ast"><code class="language-text">ts.createSourceFile(str)</code></a></td>
      <td><a href="https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#creating-and-printing-a-typescript-ast"><code class="language-text">ts.createPrinter().printFile(ast)</code></a></td>
    </tr>
  </tbody>
</table>
</div>

As you can see most parsers provide both parsing and generating methods.

So in general, you can have the following as a template to write your code transformation code:

```js
const code = fs.readFileSync('/file/to/code');
const ast = parserMethod(code);

// the magical transform function
// usually not a pure function
transform(ast);

const output = generatorMethod(ast);
fs.writeFileSync('/file/to/output', output, 'utf8');
```

You can, of course, transforming AST of one language to AST of another language, for example: Sass ➡️ CSS, Markdown ➡️ HTML, and use the generator of another language to generate out the code.

```js
const lang1 = fs.readFileSync('/file/to/code');
const ast = parserMethodLang1(lang1);

// the magical transform function
// usually not a pure function
transformLang1ToLang2(ast);

const lang2 = generatorMethodLang2(ast);
fs.writeFileSync('/file/to/output', lang2, 'utf8');
```

Now armed with this template, let's talk about the more _magical_ stuff, _the transform function_.

## Traversing an AST

As the name AST suggests, AST uses a tree data structure. To hone the skills of manipulating AST, we need to recall our long distant memory of _"Algorithm 101"_, the **depth-first search (DFS)** tree traversal algorithm.

[Vaidehi Joshi](https://twitter.com/vaidehijoshi) wrote an amazing article on [demystifying Depth-First Search](https://medium.com/basecs/demystifying-depth-first-search-a7c14cccf056), I don't think I can explain any better, so if you want to recap on depth-first search, please go and read [her article](https://medium.com/basecs/demystifying-depth-first-search-a7c14cccf056) before we continue.

Now you have a clearer idea of how depth-first search works, a depth-first search on an AST would look something like this:

```js
function visit(ast) {
  // TODO: do something with this node

  const keys = Object.keys(ast);
  for (let i = 0; i < keys.length; i++) {
    const child = ast[key];
    // could be an array of nodes or just a node
    if (Array.isArray(child)) {
      for (let j = 0; j < child.length; j++) {
        visit(child[j]);
      }
    } else if (isNode(child)) {
      visit(child);
    }
  }
}

function isNode(node) {
  // probably need more check,
  // for example,
  // if the node contains certain properties
  return typeof node === 'object';
}
```

We can then fill up the `TODO` with our manipulation code.

If we find ourselves needing to do multiple traversals, with different AST manipulation, we would soon realize that mixing AST manipulation code with the traversal code is _not clean enough_. Naturally, you would realize _it is cleaner_ to pass in a callback function that gets called every time we visit a node:

```js
// highlight-next-line
function visit(ast, callback) {
  // highlight-next-line
  callback(ast);

  const keys = Object.keys(ast);
  for (let i = 0; i < keys.length; i++) {
    const child = ast[key];
    if (Array.isArray(child)) {
      for (let j = 0; j < child.length; j++) {
        // highlight-next-line
        visit(child[j], callback);
      }
    } else if (isNode(child)) {
      // highlight-next-line
      visit(child, callback);
    }
  }
}

function isNode(node) {
  // probably need more check,
  // for example,
  // if the node contains certain properties
  return typeof node === 'object';
}
```

The `visit` function is now generic enough that you can use it for any AST:

```js
visit(htmlAst, htmlAstNode => {
  /*...*/
});
visit(cssAst, cssAstNode => {
  /*...*/
});
```

Naturally, you would think that having the information of the parent node, and the key / index of the current node would be useful to have in the callback function:

```js
function visit(ast, callback) {
  // highlight-next-line
  function _visit(node, parent, key, index) {
    // highlight-next-line
    callback(node, parent, key, index);

    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
      const child = node[key];
      if (Array.isArray(child)) {
        for (let j = 0; j < child.length; j++) {
          // highlight-next-line
          _visit(child[j], node, key, j);
        }
      } else if (isNode(child)) {
        // highlight-next-line
        _visit(child, node, key);
      }
    }
  }
  // highlight-next-line
  _visit(ast, null);
}
```

Now, we might think to ourselves, I dont want to get callback for every node visited, I just need callback for a certain node. You might be tempted to add a condition in the `visit` function:

```js
function visit(ast, callback) {
  function _visit(node, parent, key, index) {
    // highlight-next-line
    if (someCondition(node)) {
      callback(node, parent, key, index);
    }
    ...
```

But you think twice: _what if someone else wants to use `visit` but with a different condition for callback?_

For most of the time, you want to callback only to a certain types of node. In that case, instead of passing in a callback function, you can pass in a map of node type to their respective callback functions:

```js
function visit(ast, callbackMap) {
  function _visit(node, parent, key, index) {
    // highlight-start
    const nodeType = getNodeType(node);
    if (nodeType in callbackMap) {
      callbackMap[nodeType](node, parent, key, index);
    }
    // highlight-end
    ...
  }
}

visit(ast, {
  Identifier(node, parent, key, index) {
    // do something
  }
})
```

At this point, you maybe realize, _hey, this looks so much like one of those AST traversing libraries!_ And yes, this is how they get implemented.

Now we can traverse the AST, and find the node that we are interested in, so the next step is to manipulate them.

## Manipulating AST

Manipulating the AST can be categorized into 3 different operations:

- Adding a node
- Replacing a node
- Removing a node

### Adding a node

To add a node, you can assign it to a keyed property of your node:

```js
function visitCallback(node, parent, key, index) {
  node.foo = createNewNode();
}
```

or push the new node, if the keyed property is an array:

```js
function visitCallback(node, parent, key, index) {
  node.foo.push(createNewNode());
}
```

To add a node as a sibling, you may need to access the node's parent:

```js
function visitCallback(node, parent, key, index) {
  // add as first sibling
  parent[key].unshift(createNewNode());
  // add as last sibling
  parent[key].push(createNewNode());
  // add as next sibling
  parent[key].splice(index + 1, 0, createNewNode());
  // add as prev sibling
  parent[key].splice(index, 0, createNewNode());
}
```

### Replacing a node

To replace the current node to another node, update the key property of the current node's parent:

```js
function visitCallback(node, parent, key, index) {
  parent[key] = updatedNode();
}
```

If the key property of the parent is an array:

```js
function visitCallback(node, parent, key, index) {
  parent[key][index] = updatedNode();
}
```

### Removing a node

To remove the current node, delete the key property of the current node's parent:

```js
function visitCallback(node, parent, key, index) {
  delete parent[key];
}
```

If the key property of the parent is an array:

```js
function visitCallback(node, parent, key, index) {
  parent[key].splice(index, 1);
}
```

> The operations of **adding**, **replacing**, and **removing** nodes are so common that, they are usually implemented as a util function.

However, there's **one important step** that I did not cover: after you mutate the node, you need to make sure that the traversal still works fine.

For a node that is a property of a key of its parent, adding, replacing and removing them are usually fine. Except for the replace operation, you might need to revisit the _"current node"_, which is the _new replacing node_.

However, for node that are in an array, you need to take special care to update the array index of the loop:

```js
function visit(ast, callbackMap) {
  function _visit(node, parent, key, index) {
    // ...
    if (Array.isArray(child)) {
      for (let j = 0; j < child.length; j++) {
        _visit(child[j], node, key, j);
        // highlight-start
        if (hasRemoved()) {
          // offset the index
          j--;
        }
        // highlight-end
      }
    }
    // ...
  }
}
```

But how do you know that the current node was removed?

Well, knowing when a node got removed is sometimes a secret that lies within the `remove` util function from the tree traversal library.

It could be as simple as setting a flag when you call `remove`:

```js
// highlight-start
let _hasRemoved = false;
function remove(node, parent) {
  _hasRemoved = true;
  // proceed to remove current node
}
function hasRemoved() {
  let result = _hasRemoved;
  // reset back
  _hasRemoved = false;
  return result;
}
// highlight-end

// function _visit(...) { ...
for (let j = 0; j < child.length; j++) {
  _visit(child[j], node, key, j);
  // highlight-next-line
  if (hasRemoved()) {
    // ...
  }
}

// ...somewhere in your visitCallback
function visitCallback(node, parent, key, index) {
  // highlight-next-line
  remove(node, parent);
}
```

But sometimes, instead of having to import the `remove` util from the tree traversal library, the `remove` function is available in `this` of the `visitCallback`:

```js
function visit(ast, callbackMap) {
  function _visit(node, parent, key, index) {
    // highlight-start
    let _hasRemoved = false;
    const _this = {
      // don't need to take in `node` and `parent`,
      // because it know exactly what they are
      remove() {
        _hasRemoved = true;
        // proceed to remove current node
      },
    };
    // highlight-end

    // ...
    if (nodeType in callbackMap) {
      // highlight-next-line
      callbackMap[nodeType].call(_this, node, parent, key, index);
    }
  }
}

// ...somewhere in your visitCallback
function visitCallback(node, parent, key, index) {
  // highlight-next-line
  this.remove();
}
```

Now you learned the 3 basic operations of manipulating the AST, you maybe wonder how exactly is to use these basic operations to write a codemod or an AST transform plugin?

Well, in my [step-by-step guide](/step-by-step-guide-for-writing-a-babel-transformation), I've explained that, you can use AST explorer like [http://astexplorer.net/](http://astexplorer.net/) or [Babel AST Explorer](https://lihautan.com/babel-ast-explorer) to help you.

You need to:

- **Know how the part of the code you want to change look like in the AST**, so you can target the specific type of the node, and
- **Know how does the final output you wish to see look like in the AST**, so you know what nodes to create, update or remove.

So we are going to elaborate more on these 2 steps specifically.

## Targeting a node

Node targeting, most of the times, is just a lot of `===`.

For example, if you want to target a `<figure>` with a class `foo` that contains an `<img>` and a `<figcaption>` in [htmlparser2](https://github.com/fb55/htmlparser2):

```html
<figure>
  <img class="foo" />
  <figcaption>lorem ipsum</figcaption>
</figure>
```

You need to check:

```js
function visit(node) {
  if (
    /* 1. is node <figure> */
    node.type === 'tag' &&
    node.name === 'figure' &&
    /* 2. is node contain class `foo` */
    node.attribs.class === 'foo' &&
    /* 3. is node children contain <img> */
    node.children.find(
      child => child.type === 'tag' && child.name === 'img'
    ) !== undefined &&
    /* 4. is node children contain <figcaption> */
    node.children.find(
      child => child.type === 'tag' && child.name === 'figcaption'
    ) !== undefined
  ) {
    // do something
  }
}
```

To make it less verbose, we can refactor each check into reusable functions:

```js
function isTag(node, name) {
  return node.type === 'tag' && node.name === name;
}
function hasAttr(node, key, value) {
  return node.attribs[key] === value;
}
function hasChild(node, fn) {
  return node.children.find(fn) !== undefined;
}
function visit(node) {
  if (
    /* 1. is node <figure> */
    // highlight-next-line
    isTag(node, 'figure') &&
    /* 2. is node contain class `foo` */
    // highlight-next-line
    hasAttr(node, 'class', 'foo') &&
    /* 3. is node children contain <img> */
    // highlight-next-line
    hasChild(child => isTag(child, 'img')) &&
    /* 4. is node children contain <figcaption> */
    // highlight-next-line
    hasChild(child => isTag(child, 'figcaption'))
  ) {
    // do something
  }
}
```

## Creating a node

There are a few ways you can create an AST node.

The simplest and crudest way is to **manually create the node object**. Most of the time, the node object is a JavaScript object. So you can just create them manually:

```js
const newNode = {
  type: 'Identifier',
  name: 'foo',
};
```

It may become unwieldy when creating large, complex AST nodes, so sometimes library decides to provide builder functions, like [@babel/types](https://babeljs.io/docs/en/babel-types) to simplify node creation and provide default values:

```js
const newNode = t.identifier('foo');

const newNode2 = t.functionDeclaration(
  'bar',
  [t.identifier('foo')],
  [
    t.expressionStatement(
      t.callExpression(
        t.memberExpression(t.identifier('console'), t.identifier('log'), false),
        [t.identifier('foo')]
      )
    ),
    t.returnStatement(t.identifier('foo')),
  ]
);
```

It looked more concise and tidier, but it is hard to comprehend and grasp what node it is creating.

So, a better way of creating complex AST node, is to use the `parse` function + `string`:

```js
const newNode2 = babelParser.parse(`
  function bar(foo) {
    console.log(foo);
    return foo;
  }
`).program.body[0];

const newNode3 = cssTree.parse(
  `
  .foo {
    color: red;
  }
`,
  { context: 'rule' }
);
```

For Babel, there's an amazing util called [@babel/template](https://babeljs.io/docs/en/babel-template), where you can use [template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals) to create AST node:

```js
const newNode4 = template.statement`
  console.log(foo);
`;

// placeholder can be an AST node or string
const newNode5 = template.statement`
  function bar(foo) {
    ${newNode4}
    alert("${'hello world'}")
    return foo;
  }
`;
```

## Summary

We've gone through:

- How to traverse an AST, using depth-first search algorithm,
- The 3 basic AST manipulations, addition, replacement, and removal,
- How to target a node in AST, and
- How to create an AST node

> **Manipulating AST with JavaScript using Babel**
> 
> If you like what you've read so far, and want to learn how you could do it with Babel. I've created a [video course](https://gum.co/manipulating-ast-with-javascript), showing you step-by-step, how to write a babel plugin and codemod.
> 
> In the video course, I detailed tips and tricks, such as how to handle scope, how to use state, and also nested traversals.
> 
> **[Sounds interesting, let's take a look at the video course](https://gum.co/manipulating-ast-with-javascript)**


## Further Readings

[Dinesh (@flexdinesh)](https://twitter.com/flexdinesh) [tweeted](https://twitter.com/flexdinesh/status/1196680010343432192) his pocket collection of AST resources:

- [Code Transformation and Linting with ASTs](https://frontendmasters.com/courses/linting-asts/)
- [Write your own code transform for fun and profit](https://kentcdodds.com/blog/write-your-own-code-transform/)
- [Understanding ASTs by Building Your Own Babel Plugin](https://www.sitepoint.com/understanding-asts-building-babel-plugin/)
- [Writing your first Babel Plugin](https://github.com/jamiebuilds/babel-handbook/blob/master/translations/en/plugin-handbook.md#toc-writing-your-first-babel-plugin)
- [This is how I build Babel plug-ins](https://medium.com/the-guild/this-is-how-i-build-babel-plug-ins-b0a13dcd0352)
- [Writing My First Babel Plugin](https://varunzxzx.github.io/blog/writing-babel-plugin)
