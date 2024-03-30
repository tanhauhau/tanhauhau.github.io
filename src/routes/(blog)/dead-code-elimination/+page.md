---
title: Dead-code elimination
date: "2018-10-24T08:00:00Z"
description: How to hint uglify-js that your function is pure
label: blog
---

Imagine you have the code below:

```js
function foo() {
   var a = foobar();
   var b = 8;
   return 10;
}
```

after passing this code through [uglify-js](https://www.npmjs.com/package/uglify-js), you will get the code below:

```js
function foo(){
  foobar();
  return 10;
}
```

**uglify-js** will do dead code removal, ie: it will remove code that will not affect the program results. Since we defined `a` and `b` in the function `foo` and we are not using `a` and `b` within the `foo`, **uglify-js** safely removes it from the uglified code.

However, if you can see from the uglified code, `foobar()` is preserved. This is because calling `foobar` may have side effects on the program, so **uglify-js** preserves foobar(). But since we do not need the return value of `foobar()`, which is assigned to `a`, `a` got removed by uglify-js.

---

What if we know that `foobar()` will not caused any side effects?

How do we tell **uglify-js** that if we are not using the return value from `foobar()`, please remove it as well?

---

Turns out that **uglify-js** will treat a function call as “pure” if there is a comment annotation `/*@__PURE__*/` or `/*#__PURE__*/` immediately precedes the call.

For example: `/* @__PURE__ */ foobar()` !

```js
// before uglify
function foo() {
  // highlight-next-line
  var a = /*@__PURE__*/foobar();
  var b = 8;
  return 10;
}

// after uglify
function foo(){return 10}
```

Note that now `foobar()` is being removed!

---

So, how is this useful?

As a library author, you can write a babel plugin to mark your function to be pure, so that **uglify-js** can drop the function call if the return value is not being used in the code. (There is a [util from babel](https://babeljs.io/docs/en/next/babel-helper-annotate-as-pure.html) to do just the job of marking function as pure 😎)