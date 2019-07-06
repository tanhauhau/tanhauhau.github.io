---
title: 'History of Web Development: JavaScript Modules'
venue: Shopee SG
venueLink: https://www.google.com/maps/place/Shopee+SG/@1.291278,103.7846628,15z/data=!4m2!3m1!1s0x0:0x7ddf2e854cf6e4e4?ved=2ahUKEwi5jbz6z_vgAhVBP48KHWSEAmMQ_BIwFXoECAEQCA
occasion: React Knowledgeable Week 25
occasionLink: 'https://github.com/Shopee/react-knowledgeable/issues/89'
slides: https://slides.com/tanhauhau/js-module
video: https://www.youtube.com/watch?v=iRSdPqIHOqg
date: '2019-04-12'
series: History of Web Development
---

# Motivation

A while ago, I posted an article about [understanding frontend tools](https://lihautan.com/understand-the-frontend-tools/). I mentioned that the way I make sense of all the tools and frameworks out there in the JavaScript world, is to try writing a web application with plain JavaScript, and start asking questions.

One of the question is:

> **How do we make our JavaScript code modular**, having each piece of code **independent** of each other, without having to worry other parts of code affecting it, yet able to **share functionality** among different modules.

So I will attempt to answer the question by first exploring how things are done in a "Vanilla" way, and my two cents about the inherent problem with it and how each tooling come about solving those problems.

# The Vanilla way

Imagine the following scenario:

You are writing a web application. You created a script, `app.js`, and you added a `<script>` tag into your `index.html`.

```html
<!-- filename: index.html -->
<body>
  // highlight-start
  <script src="/app.js"></script>
  // highlight-end
</body>
```

Then you decided to add jQuery, because you heard that jQuery is amazing.

**So how would you add jQuery into your application?**

There's a few ways to go about, but the easiest would be:

- heading to [jQuery's website](https://jquery.com/)
- click download
- dragged the downloaded file to your project folder
- and add another script tag before your `app.js`.

![jquery page](./images/jquery.png 'Downloading jQuery from jQuery.com')

```html
<!-- filename: index.html -->
<body>
  // highlight-start
  <script src="/jquery.js"></script>
  // highlight-end
  <script src="/app.js"></script>
</body>
```

_Adding `jquery` into html_

Although jQuery is awesome, but adding it takes **a lot of steps and effort**. And to upgrade jQuery, you would have to redo all the step.

> **Installing a library** is a hassle back then.

Let's say we add another file, `utils.js` for all our utility functions.

```html
<!-- filename: index.html -->
<body>
  <script src="/jquery.js"></script>
  // highlight-start
  <script src="/utils.js"></script>
  // highlight-end
  <script src="/app.js"></script>
</body>
```

```js
// filename: utils.js
var pi = 3.142;
function area(radius) {
  return pi * radius * radius;
}
```

Although you meant to just share the function `area` from `utils.js`, in `app.js`, you would notice that both `pi` and `area` are available.

```js
// filename: app.js
console.log(area(5)); // 78.55

// pi is available too!
console.log(pi); // 3.142
```

That is because when you declare a variable or a function within a script, it will be available to the **global scope**.

The only way to hide it, is to use Immediately Invoked Function Expression (IIFE).

```js
// filename: utils.js
var utils = (function() {
  // you hide `pi` within the function scope
  var pi = 3.142;
  function area(radius) {
    return pi * radius * radius;
  }
  return { area };
})();
```

```js
// filename: app.js
console.log(utils.area(5)); // 78.55

console.log(pi); // Reference error, `pi` is not defined
```

<!-- TODO: module pattern -->

This is called the **module pattern**. The only way to control what to exposed to the global scope.

> **Scoping the variables** within the module is hard, and you can only do it via the **module pattern**.

If you have noticed, we access `utils` freely, because it is defined in the global scope. If you have another module / library that named `utils`, they would have conflicted against each other.

We want to _"import"_ the modules freely, and renamed it anyway we want, without worrying naming conflicts amongst modules / libraries.

> **Importing** without naming conflicts is what we want.

So I hereby summarize, the "module" problem in JavaScript,

- **Installability** - the ability to install easily
- **Scopability** - the ability of having clearly defined scoped within modules
- **Importability** - the ability to import modules freely without worry

Well, I am not sure some of these word existed, I think I might have made up some of them to make it rhyme.

The problems above are no longer a concern any more in the 2019 world, yet it is still interesting to see what the JavaScript community has created to solve these problems.

# Installability

> The "how easy is it to install" problem.

As mentioned in the earlier example, to "install" jQuery into your web app is to download jQuery from their main website. To "install" a different version would mean to visit their "Past Releases" Page to download the specific version you want.

![jQuery past releases page](./images/jquery-version.png 'Visit "Past Releases" to download an older version of jQuery')

A "faster" alternative to this, is to get jQuery served from a CDN provider. [cdnjs.com](https://cdnjs.com/) is a site that catalogues the CDN url for different libraries. The CDN will serve the script faster to the user, because of their delivery network, as well as if multiple sites are using the same CDN url, the file will be cached by browser. And it is faster to "install", as [cdnjs.com](https://cdnjs.com/) provides a one-click to "Copy as script tag", all you only need to do is to paste it in to your `html` file.

![cdnjs copy as script tag](./images/cdnjs.png 'One click to "Copy as script tag"')

Parallelly in the [Node.js](http://nodejs.org/) world, [npm](http://npmjs.com), the Node.js Package Manager was created. With npm, it is much easier to install and maintain packages and their version, _(a "package" can be seen as a group of JavaScript modules and their description file)_, for a Node.js project. All a developer need to do list out the dependencies and their version in `package.json` and run `npm install`.

If you think the _problem of installability_ stops here, well, not quite. See, npm was created for Node.js application, packages that are published to the npm registry was not meant for browser use. The JavaScript "modules" uses "syntax" like the `module.exports` and `require` which are not readily understandable by the browser. Therefore you can't add a script tag to include files you just installed from npm. _(I will explain what `module.exports` and `require` syntax are in the later part of this article)_

```html
<body>
  <!-- This will not work out of the box! -->
  // highlight-start
  <script src="/node_modules/foo/bar.js"></script>
  // highlight-end
</body>
```

That's why [bower](https://bower.io) was created. It is called the package manager for the web, because the "package" you installed from bower are readily to be used in the `html`.

![bower](./images/bower.png)

<!-- prettier-ignore -->
```html{2-3}
/project
  /bower_components
  /node_modules
  /app
  /bower.json
  /package.json
```

_A typical web application project setup with both bower and npm_

```html
<!-- filename: index.html -->
<script src="bower_components/jquery/dist/jquery.min.js"></script>
```

_Adding bower packages into index.html_

Bower components for browser libraries and npm packages for build tools, had been a common web app projects setup until the next tool comes up to change it.

[Browserify](http://browserify.org/) tries to bring the vast registry of packages from `npm` to the web. Browserify is a module bundler, it reads and understands the `require` syntax, and tries to bundle all the modules into one file.

![browserify](./images/browserify.png)

With [Browserify](http://browserify.org/), and other module bundler, eg [webpack](https://webpack.js.org), [rollup](https://rollupjs.org/) etc, we are now able to freely share code among Node.js and browser application, and use `npm` as a package manager for installing and upgrading packages.

# Importability

> The "how easy is it to import" problem.

Let's recap the problem of _"importability"_ with the example earlier. We mentioned that everything we declare within each file, are available to other files via the global scope. There is no control of what you are importing, the sequence of the importing. At this point of time, each JavaScript files is just a script, until module systems were introduced.

With the advent of Node.js, there's a need to _require_ common modules into your JavaScript code. Because in Node.js context, there's no `index.html` where you can _"insert script tags"_. At some point you need to _require_ some external modules, or else you will end up writing a very long JavaScript file.

So [CommonJS](http://commonjs.org) were introduced into Node.js. It allows your JavaScript code to `require` and `export` other JavaScript modules.

```js
require('./circle');

exports.pi = 3.142;
```

_the commonjs "require" and "export" syntax_

Note that `require()` is **synchronous**.

When you call `require('./circle.js')`, Node runtime will:

- find the file you are `require`ing
- parse and eval the content
- return what is assigned to `exports`.

But, if we are going to port the `require` syntax into the browser, it will not be able to be synchronous. Because, fetching content involves network call, and it will have to be asynchronous. So, it only make sense to have a asynchronous `require`:

```js
require('./circle.js', function(circle) {
  // callback when circle is ready
});
```

And this is exactly how [**script loaders**](http://www.tysoncadenhead.com/blog/script-loaders/) work!

If you find the concept of script loading similar, that's because it is the exact same concept of dynamic import we have today. In fact, if you look at the code, they have the same mechanics of loading the script asynchronously!

```js
// script loading
load('lib/jquery.min.js', callback);
// dynamic import
import('lib/jquery.min.js').then(callback);
```

CommonJS's `require` statement did not take into consideration of the asynchronicity of the browser land, therefore the JavaScript community came up with another module system, [AMD (Asynchronous Module Definition)](https://requirejs.org/docs/whyamd.html#amd).

AMD uses an asynchronous `require` syntax, that takes a callback that would be called only after the dependency is available.

```js
// filename: main.js
require(['jquery', 'circle'], function($, circle) {
  // we can use `$` and `circle` now!
});
```

We have both module system in JavaScript, CommonJS and AMD, with both seemed valid and useful, yet troubling, because it meant to library owners to support both module system, by means such as a unified module definition via [UMDjs](https://github.com/umdjs/umd).

So, [TC39](https://www.ecma-international.org/memento/tc39.htm), the standards body charged with defining the syntax and semantics of ECMAScript decided to introduce the [ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) in ES6 (ES2015).

ES Modules introduced 2 new syntax, the `import` and `export`.

```js
// importing `circle` from './circle'
import circle from './circle';

// export the constant `PI`
export const pi = 3.142;
```

Although at that point of time, most browser still does not support the syntax. So module bundler, like [webpack](https://webpack.js.org) came into picture. [webpack](https://webpack.js.org) transform the code with `import` and `export` syntax, by concatenating "import"ed modules, and link them together.

Now, most [modern browsers have supported `<script type="module">`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules#Applying_the_module_to_your_HTML), which means, the `import` and `export` syntax is supported by default without needing any build tools.

Over the years, the JavaScript community have been trying to split JavaScript code into multiple files, and link them together with some module system, such as CommonJS and AMD. [TC39](https://www.ecma-international.org/memento/tc39.htm) introduced [ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import) in ES6 (ES2015) to offer an official module syntax in JavaScript, and before browsers supporting the ES modules syntax, we have to rely on build tools such as [webpack](https://webpack.js.org). Finally, modern browsers are now supporting `<script type="module">`, which means we can now use `import` and `export` in our JavaScript application without any configurations.

# Scopability

> The "scope pollution" problem.

There are 2 ways to look at the scope polution problem:

- 2 modules are declaring into the same scope, which might have naming conflicts
- variables declared within a module is now "public" and available to other modules, which wasn't intended

In this aspect, there are 2 solutions in general for the problem, and I am going to bring out 2 different tools for each solution as an example.

Firstly, scope naming conflicts can be solved via [namespace](https://en.wikipedia.org/wiki/Namespace). If you read the compiled code from [Google Closure Tools](https://developers.google.com/closure/), you will find that the built-in libraries from Google Closure Tools are namespaced:

```js
goog.provide('tutorial.notepad');
goog.require('goog.dom');

tutorial.notepad.makeNotes = function(data) {
  //...
  goog.dom.appendChild(this.parent, data);
};
```

_Examples from "Building an Application with the Closure Library" tutorial_

Compiled into:

```js
// goog.provide('tutorial.notepad');
tutorial = tutorial || {};
tutorial.notepad = tutorial.notepad || {};
// goog.require('goog.dom');
goog = goog || {};
goog.dom = goog.dom || function() { ... };

tutorial.notepad.makeNotes = function(data) {
  //...
  goog.dom.appendChild(this.parent, data);
};
```

All the code will get concatenated, and declared on the same scope, yet because it is namespace-d, you will have less chance of having a conflict.

The other solution for the scope problem, is to wrap each module with a function to create a scope for each module. If you look at AMD's way of writing, you would end up into something like the following:

```js
define('goog/dom', function() { ... });

define('tutorial/notepad', ['goog/dom'], function (googDom) {
  return {
    makeNotes: function(data) {
      //...
      goog.dom.appendChild(this.parent, data);
    },
  },
});
```

You have modules wrapped into their own scope, and hence the only way for 2 modules to interact is through the module systems' `import` and `export`.

In terms of "scopeability", the solutions are namespace it or create a new function scope.

In fact, these are the 2 different ways module bundlers bundled JavaScript modules into 1 JavaScript file. (which I will explained them further in my future talk).

# Summary

We've seen how module system was introduced into JavaScript, and how different tools, standards, or syntax come about in solving the **Installability**, **Scopability** and **Importability** problem.

# Further Readings

- [CommonJS effort sets javascript on path for world domination](https://arstechnica.com/information-technology/2009/12/commonjs-effort-sets-javascript-on-path-for-world-domination/)
- [Writing Modular JavaScript With AMD, CommonJS & ES Harmony](https://addyosmani.com/writing-modular-js/)
- [What server side JavaScript needs](https://www.blueskyonmars.com/2009/01/29/what-server-side-javascript-needs/)
- [ES Modules: a cartoon deep dive](https://hacks.mozilla.org/2018/03/es-modules-a-cartoon-deep-dive/)