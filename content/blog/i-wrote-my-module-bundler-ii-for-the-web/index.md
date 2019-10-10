---
title: I wrote my module bundler II
date: '2019-09-18T08:00:00Z'
tags: JavaScript,module bundler,dev tool,webpack
description: "We've build a simple bundler to bundle javascript code. Let's serve it in the browser."
series: Write a module bundler
---

In my [previous article](/i-wrote-my-module-bundler/), I showed you how I built a module bundler, and we bundled a simple Nodejs script to calculate area for a square and a circle:

![image of the cli here]()

For the past few weeks, I've written a few articles about Babel. That covered some 

In this article, I am going to show you how I wrote my module bundler. The module bundler itself is not production-ready, yet I learned a ton through the exercise, and I am ever more appreciative of what modern module bundlers have provided.

---

⚠️ **Warning: Tons of JavaScript code ahead. 🙈😱😨** ⚠️

---

## Adding CSS

Every web app has to have css in one way or another.

So I added a css file:

```js
// filename: index.js
import './style.css';
```

```css
.square {
  color: blue;
}
.circle {
  color: red;
}
```

You should still be able to 

```
SyntaxError: unknown: Unexpected token (1:0)

> 1 | .square {
    | ^
  2 |   color: blue;
  3 | }
  4 | .circle {
    at Parser.raise (node_modules/@babel/parser/lib/index.js:6344:17)
```

```
Uncaught SyntaxError: Unexpected token '.'
```

### Whats next?

I have a few ideas that I will add to my module bundler, such as:
- code spliting
- watch mode and reloading

which I will cover them in my next article when they are ready.

Till then. Cheers. 😎
