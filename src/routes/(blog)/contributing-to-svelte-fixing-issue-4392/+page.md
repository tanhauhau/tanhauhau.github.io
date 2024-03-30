---
title: "Contributing to Svelte - Fixing issue #4392"
date: '2020-05-23T08:00:00Z'
tags: 
  - Svelte
  - JavaScript
  - Open Source
series: Contributing to Svelte
description: I am going to tell you an anecdote on how I investigated and fixed a bug in Svelte. I documented down my train of thoughts as detailed as possible. I hope this gives anyone who is reading, a glimpse on how to work on the Svelte source code.
label: blog
---

## Background

As Svelte gains more attention, I find that more and more people are interested in contributing to Svelte.

Of course, contributing to Svelte, does not mean to contribute only in code, it could be:
- answering questions about Svelte, on social media, Stack Overflow, or [Discord](https://svelte.dev/chat)
- improving Svelte docs, or write tutorials and articles about Svelte
- organising and speaking in meetups about Svelte

For those who want to contribute in code, most people are unsure where to start. So I wrote [The Svelte Compiler Handbook](/the-svelte-compiler-handbook/) as an overview of the Svelte source code.

However, today, I want to try a different tone.

I am going to tell you an anecdote on how I investigated and fixed a bug in Svelte.

I documented down my train of thoughts as detailed as possible.

I hope this gives anyone who is reading, a glimpse on how to work on the Svelte source code.

## The story begins

I was combing through [bugs on GitHub](https://github.com/sveltejs/svelte/issues?q=is%3Aopen+is%3Aissue+label%3Abug), and found this rather interesting bug:

---

**Select multiple value does not get set with spread props [#4392](https://github.com/sveltejs/svelte/issues/4392)**

Adding any type of spread, even an empty object `{...{}}`, causes the value not to be set:

```svelte
<script>
  let value = ['Hello', 'World'];
</script>

<select multiple {value} {...{}}>
  <option>Hello</option>
  <option>World</option>
</select>
```

To reproduce: [REPL](https://svelte.dev/repl/99bd5ebecc464e328972252e287ab716?version=3.18.1).

---

## Verifying the bug

I clicked into the REPL and tried to understand about the bug.

I found that if the `<select multiple>` has spread attribute `{...any}`, the `value` attribute will not be reactive. Changes in the value of `value` will not be reflected to the `<select>`.

I noticed the REPL link uses the version `3.18.1`, it's not the latest version of Svelte. At the point of writing, Svelte is at **3.22.3**. I tried removing the `?version=3.18.1` from the query params to verify whether the bug has fixed, and realised that the bug is still there. (Great! Something interesting to investigate into.)

To understand the current status of the issue, I read through the comments. According to [Conduitry](https://github.com/Conduitry), the issue is related to **Radio/checkbox input with bind:group and spread props makes variable undefined** [#3680](https://github.com/sveltejs/svelte/issues/3680) and can be fixed together. However, the issue [#3680](https://github.com/sveltejs/svelte/issues/3680) was fixed and closed, yet this issue is still open.

Nevertheless, I read through [the PR](https://github.com/sveltejs/svelte/pull/4398) for the closed issue [#3680](https://github.com/sveltejs/svelte/issues/3680), roughly understand how it was fixed and hopefully it can give me some inspirations on this issue.

## Investigating the bug

Once I verified that the behavior described in the issue is unexpected and reproducible in the latest version of Svelte, I copied the REPL code into my local machine to investigate.

I have a `test-svelte` folder ready in my local machine, where I created using [Svelte Template](https://github.com/sveltejs/template). I have `npm link`ed my local Svelte clone to the `test-svelte` folder, so I can rebuild `test-svelte` anytime with the latest changes done to my Svelte clone.

```
- /Projects
  - svelte                <-- cloned from https://github.com/sveltejs/svelte
  - test-svelte           <-- initialised with Svelte Template
    - node_modules/svelte <-- symlink to `/Projects/svelte`
```

I have `yarn dev` running in the Svelte folder, so any changes I make gets compiled immediately.

I prefer to **build** `test-svelte` and serve it with [http-server](https://www.npmjs.com/package/http-server) rather than start a dev server `test-svelte` in watch mode. That allows me to

- Run the `http-server` in the background while tweaking the Svelte code or the `test-svelte` app.
- Not having to restart the dev server whenever I've made changes to the Svelte code
- Able to inspect and modify `bundle.js` without worrying that accidentaly save in the `test-svelte` app will overwrite the `bundle.js`

Looking at the different `bundle.js` generated from with `{...spread}` attributes and without spread attributes

```svelte
<script>
  let value = ['Hello', 'World'];
</script>

<!-- with spread -->
<select multiple {value} {...{}}>
  <option>Hello</option>
  <option>World</option>
</select>

<!-- without spread -->
<select multiple {value}>
  <option>Hello</option>
  <option>World</option>
</select>
```

I found the following diffs in the bundled output:

```diff-js
+ let select_levels = [{ multiple: true }, { value: /*value*/ ctx[0] }, {}];
+	let select_data = {};
+	for (let i = 0; i < select_levels.length; i += 1) {
+	  select_data = assign(select_data, select_levels[i]);
+	}
- let select_value_value;

  return {
    c() {
      /* ... */
      set_attributes(select, select_data);
    },
    m(target, anchor) {
      /* ... */
-     select_value_value = /*value*/ ctx[0];

-     for (var i = 0; i < select.options.length; i += 1) {
-       var option = select.options[i];
-       option.selected = ~select_value_value.indexOf(option.__value);
-     }
    },
-   p: noop,
+    p(ctx, [dirty]) {
+      set_attributes(select, get_spread_update(select_levels, [{ multiple:   true }, dirty & /*value*/ 1 && { value: /*value*/ ctx[0] }, {}]));
+    },
    /* ... */
  };
```

Well, I know I haven't cover how spread attribute works in any of my ["Compile Svelte in your Head"](/compile-svelte-in-your-head-part-1/) articles, but the general idea is that, Svelte builds an array of attributes, and then apply it to the element / Component.

For example, if we write the following in Svelte

```svelte
<div foo="foo" {...bar} baz="baz" {...qux} />
```

It gets compiled to something like this:

```js
const levels = [{ foo: 'foo' }, bar, { baz: 'baz' }, qux];
// build the attribute maps
const data = {};
for (let i = 0; i < levels.length; i++) {
  data = Object.assign(data, levels[i]);
}

// set attribute to element
for (const attributeName in data) {
  div.setAttribute(attributeName, data[attributeName]);
}

// if `bar` changed
const updates = get_spread_update(levels, [false, bar, false, false]);
// updates will return the updates needed to make, in this case, the diff in `bar`, eg: { aa: '1' }
for (const attributeName in updates) {
  div.setAttribute(attributeName, updates[attributeName]);
}
```

So, this roughly explains the additional code added into the `bundle.js` for handling spread attributes.

However the code that is removed, is something I am not familiar with.

```js
// in `mount` method
for (var i = 0; i < select.options.length; i += 1) {
  var option = select.options[i];
  option.selected = ~select_value_value.indexOf(option.__value);
}
```

It seems like we are trying to set `option.selected` after we mount the `<select>` element. Not sure how important is that to us.

To verify that the bug is because that the above code snippet is missing when having a spread attribute, I tried adding the code snippet into the `bundle.js` manually, and refresh the page.

```js
  // ...
  m(target, anchor) {
    insert(target, select, anchor);
    append(select, option0);
    append(select, option1);
    // highlight-start
    for (var i = 0; i < select.options.length; i += 1) {
      var option = select.options[i];
      option.selected = ~ctx[0].indexOf(option.__value);
    }
    // highlight-end
  },
  // ...
```

Instead of `~select_value_value.indexOf(...)`, I changed it to `~ctx[0].indexOf(...)`, as `select_value_value` wasn't created when using spread attribute.

...and it works!

![Fixed](./images/fixed.png)

So, now we know that the bug is caused by missing setting `option.selected` on mount, now its time to figure out what the code snippet is not generated when there's a spread attribute.

To quickly find out why something is not generated, I tried to look for where it is generated, figuring out probably whether certain condition was not set correctly to cause the Svelte compiler to omit out the code snippet.

To find the right place to start looking is an art. Usually I try to global search a small snippet of code that is **most likely static**, something that has no variable name, for example:

- `.indexOf(option.__value)`
- `.options.length;`
- `.selected = ~`

The only search result I got when searching for `.indexOf(option.__value)` is in [src/runtime/internal/dom.ts](https://github.com/sveltejs/svelte/blob/e34f2088434423914bbc91b84a450a7f7477252b/src/runtime/internal/dom.ts#L221-L226)

```js
export function select_options(select, value) {
  for (let i = 0; i < select.options.length; i += 1) {
    const option = select.options[i];
    option.selected = ~value.indexOf(option.__value);
  }
}
```

Anything within `src/runtime/` are helper functions that are referenced from the output code, to reduce the output code size. Hmm... probably we should reuse the `select_options` helper function:

```js
  // ...
  m(target, anchor) {
    insert(target, select, anchor);
    append(select, option0);
    append(select, option1);
    // highlight-start
-   for (var i = 0; i < select.options.length; i += 1) {
-     var option = select.options[i];
-     option.selected = ~ctx[0].indexOf(option.__value);
-   }
+   select_options(select, select_value_value);
    // highlight-end
  },
  // ...
```

Anyway, `src/runtime/internal/dom.ts` is not where I am looking for, so I tried searching `.options.length`

```js
/// filename: src/compiler/compile/render_dom/wrappers/Element/Attribute.ts
updater = b`
  for (var ${i} = 0; ${i} < ${element.var}.options.length; ${i} += 1) {
    var ${option} = ${element.var}.options[${i}];

    ${if_statement}
  }
`;
block.chunks.mount.push(b`
  ${last} = ${value};
  ${updater}
`);
```

Yes, this is most likely where it is.

Firstly, let me update the `updater` to use the `src/runtime/` `select_options` helper instead:

```js
// highlight-start
if (is_multiple_select) {
  updater = b`@select_options(${element.var}, ${last});`;
} else {
  updater = b`@select_option(${element.var}, ${last});`;
}
// highlight-end

block.chunks.mount.push(b`
  ${last} = ${value};
  ${updater}
`);
```

The `` b`...` ``, is called a [tagged template](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates), where the `b` is a function that takes in the template literal and return something. In this case, the `b` function returns an [Abstract Syntaxt Tree (AST)](https://en.wikipedia.org/wiki/Abstract_syntax_tree).

The `b` function comes from [code-red](https://www.npmjs.com/package/code-red), a utility to generate a JavaScript AST node. Beside `b`, `code-red` provides a few helper functions:

- `b` returns a block node
- `x` returns an expression node
- `p` returns a object property node

These helper functions are useful in generating code in Svelte compiler, particularly because the placeholder itself can takes in another AST node:

```js
const node = { type: 'Identifier', name: 'foo' };
const code = b`const ${node} = 1;`; // returns an AST node for `const foo = 1;`
```

`@` in front of `@select_option` is a convention in Svelte, where it will [get replaced](https://github.com/sveltejs/svelte/blob/e34f2088434423914bbc91b84a450a7f7477252b/src/compiler/compile/Component.ts#L245-L264) to refer to helpr functions in `src/runtime/` before writing the generated AST out:

```js
const code = b`@foo(bar)`;
// turns into

// import { foo } from 'svelte/internal';
// foo(bar);
```

Coming back to figure out why this piece of code is not executed when there's a spread attribute,

```js
// highlight-next-line
if (is_legacy_input_type) {
  // ...
  // highlight-next-line
} else if (is_select_value_attribute) {
  if (is_multiple_select) {
    updater = b`@select_options(${element.var}, ${last});`;
  } else {
    updater = b`@select_option(${element.var}, ${last});`;
  }

  block.chunks.mount.push(b`
    ${last} = ${value};
    ${updater}
  `);
} else if (is_src) {
  // ...
}
```

I tried adding `console.log` before the if statement, to figure out the value for `is_legacy_input_type` and `is_select_value_attribute`:

```js
// highlight-start
console.log(
  'is_legacy_input_type:',
  is_legacy_input_type,
  'is_select_value_attribute:',
  is_select_value_attribute
);
// highlight-end
if (is_legacy_input_type) {
  // ...
}
```

To my surpise, there was no log. `AttributeWrapper#render` wasn't executed.

I tried removing the spread attribute, and verified from the log that the `AttributeWrapper#render` method was indeed executed when there's no spread attribute.

To figure out the caller of the `AttributeWrapper#render` method, I added `console.trace` at the top of the method:

```js
render(block: Block) {
  // highlight-next-line
  console.trace('trace');
  // ...
}
```

```md
Trace: trace
  <!-- highlight-next-line -->
  at AttributeWrapper.render (/Projects/svelte/compiler.js:8269:11)
  at /Projects/svelte/compiler.js:10749:14
  at Array.forEach (<anonymous>)
  <!-- highlight-next-line -->
  at ElementWrapper.add_attributes (/Projects/svelte/compiler.js:10748:19)
  at ElementWrapper.render (/Projects/svelte/compiler.js:10472:8)
  at /Projects/svelte/compiler.js:10454:11
  at Array.forEach (<anonymous>)
  at ElementWrapper.render (/Projects/svelte/compiler.js:10453:24)
  at FragmentWrapper.render (/Projects/svelte/compiler.js:13030:18)
  at new Renderer (/Projects/svelte/compiler.js:13112:17)
```

This brought me to [src/compiler/compile/render_dom/wrappers/Element/index.ts](https://github.com/sveltejs/svelte/blob/e34f2088434423914bbc91b84a450a7f7477252b/src/compiler/compile/render_dom/wrappers/Element/index.ts#L642-L659)

```js
add_attributes(block: Block) {
  // Get all the class dependencies first
  this.attributes.forEach((attribute) => {
    if (attribute.node.name === 'class') {
      const dependencies = attribute.node.get_dependencies();
      this.class_dependencies.push(...dependencies);
    }
  });

  if (this.node.attributes.some(attr => attr.is_spread)) {
    this.add_spread_attributes(block);
    return;
  }

  this.attributes.forEach((attribute) => {
    // highlight-next-line
    attribute.render(block);
  });
}
```

If there's a spread attribute, it will call the `this.node.attributes.some(attr => attr.is_spread)` method instead of calling `attribute.render(block)`, so that's probably why `AttributeWrapper#render` wasn't called.

I looked into the method `add_spread_attributes`, found out it contain only the code about handling spread attributes as I explained earlier. It didn't have any code related to `select_options`, so I figured that, maybe `<select multiple>` with spread attribute is an edge case that wasn't handled currently at all.

So, I tried to add a special check for this case at the bottom of the `add_spread_attributes` method:

```js
add_spread_attributes(block: Block) {
  // ...
  // highlight-start
  // for `<select>` element only
  if (this.node.name === 'select') {
    block.chunks.mount.push(
      b`@select_options(${this.var}, ${data}.value);`
    );
  }
  // highlight-end
}
```

As mentioned in the [The Svelte Compiler Handbook](/the-svelte-compiler-handbook/#dom-renderer), a `block` is where it keeps the code to generate the [`create_fragment`](/compile-svelte-in-your-head-part-1/#create_fragment) function. The return object of the `create_fragment` function contains various method as mentioned in [Compile Svelte in your Head](/compile-svelte-in-your-head-part-1/#create_fragment), such as `c()`, `m()` and `d()`. To add code into different method, you can push them into the array in `block.chunks`, for example:

```js
// push `const foo = 1` to `m()`
block.chunks.mount.push(b`const foo = 1`);

// push `const bar = 2` to `c()`
block.chunks.create.push(b`const bar = 2`);
```

I tried adding `@select_options(...)` into the `m()` method and yup, the `<select>` element is pre-selected correctly!

## Fixing the bug

To ensure the bug is fixed, I need to come up with a test.

Usually I come up with test cases that try to entail various scenario I can imagine.

In this example, we've manually tested the case where the `<select multiple {value} {...{}}>`, the value is set correctly during initialisation. but have we check the case where:
- we update the value of `value`, will the `<select>` get updated accordingly?
- if the value is overriden by the spreaded attribute, eg `<select mutliple {value} { ...{value: []} }>`?

Ideally, the test cases come up should be failed before the fix, and passed after the fix.

So here's the test case I came up:

```svelte
<script>
  let value = ['Hello', 'World'];
  export let spread = {};
</script>

<select multiple {value} {...spread}>
  <option>Hello</option>
  <option>World</option>
</select>

<input type="checkbox" value="Hello" bind:group={value}>
<input type="checkbox" value="World" bind:group={value}>
```

I can check and uncheck the checkbox to change the value of `value` to verify the the `value` is reactive, and `<select>` will get updated accordingly.

Besides that, I exported `spread`, so that I can change the object to something object to contain `value`, eg: `{ value: [] }`, and see how `<select>` will update accordingly. Make sure that our fix not just work with `value` attribute, and also when the `value` is spreaded into `<select>`.

You may think that we are familiar with our fix, we know what it will fix, what it will not fix, do we need think up and write all the edge cases?

Well, I think you should. Future you will thank the present you when he encounter a fail test, that just mean his change may have an unintentional regression change. If you don't have the test case, the future you will never know what edge case he didn't accounted for.

Runtime test cases are added into `test/runtime/samples/`. Each folder represent 1 test case. Inside the folder, the component to be tested is named `App.svelte`, and the test case is written `_config.js`.

`_config.js` default exports a object:

```js
/// filename: _config.js
export default {
  // initial props to passed to the component
  props: { /*...*/ },
  // initial rendered html
  html: ``,
  // test case
  async test({ assert, target }) {
    // you can test the behavior of the component here
  },
};
```

An example of test case of unchecking the checkbox, and verify `<select>` value get updated

```js
export default {
	// ...
	async test({ assert, target, window }) {
    // find the element
		const [input1, input2] = target.querySelectorAll("input");
		const select = target.querySelector("select");
		const [option1, option2] = select.childNodes;

    // uncheck the checkbox
		const event = new window.Event("change");
		input1.checked = false;
		await input1.dispatchEvent(event);

    // verify the component updated correctly
		const selections = Array.from(select.selectedOptions);
		assert.equal(selections.length, 1);
		assert.ok(!selections.includes(option1));
		assert.ok(selections.includes(option2));
	},
};
```

To run only this test, so that we can focus on ensuring the test case pass, we can set `solo: true`:

```js
export default {
  // highlight-next-line
  solo: true
};
```

**Quick tip:** running `npm run test` will build Svelte code first before executing the test. If you are like me, running `npm run dev` on the background, Svelte code is build on every code change. So, `npm run quicktest` would allow you to skip the `pretest` build, and run the test suite immediately.

With the test, I realised that I didn't handle the case when the `value` is updated.

So I guess what I needed to do is to add the same code in the `p()` (update) method too!

```js
add_spread_attributes(block: Block) {
  // ...
  if (this.node.name === 'select') {
    block.chunks.mount.push(
      b`@select_options(${this.var}, ${data}.value);`
    );
    // highlight-start
    block.chunks.update.push(
      b`@select_options(${this.var}, ${data}.value);`
    );
    // highlight-end
  }
}
```

Well, of course in this way, the `select_options` get executed unconditionally whenever any variable is updated.

I need to make sure that the `select_options(...)` inside the `p()` method get executed only when the value of `value` changes, and also probably when `spread` changes too, because it could potentially override the value of `value`. 

If you've read [Compile Svelte in your Head - Bitmask in Svelte](/compile-svelte-in-your-head-part-2/#bitmask-in-svelte), you know that Svelte uses bitmask to check any variable changes.

How do I know what is the bitmask to use in this case, well I dont have to.

I can use [`renderer.dirty(dependencies)`](https://github.com/sveltejs/svelte/blob/e34f2088434423914bbc91b84a450a7f7477252b/src/compiler/compile/render_dom/Renderer.ts#L206) to help me with that:

```js
add_spread_attributes(block: Block) {
  // ...
  if (this.node.name === 'select') {
    const dependencies = [...];
    block.chunks.mount.push(
      b`@select_options(${this.var}, ${data}.value);`
    );
    // highlight-start
    block.chunks.update.push(
      // block.renderer.dirty(...) will give me `dirty & bitmask`
      b`if (${block.renderer.dirty(dependencies)}) @select_options(${this.var}, ${data}.value);`
    );
    // highlight-end
  }
}
```

Next, I need to figure out what are the dependencies to be included. In this particular case, the dependencies of all attributes have to be taken consideration, because it is hard to tell which one would be eventually applied due to the spread attribute.

```js
add_spread_attributes(block: Block) {
  // ...
  if (this.node.name === 'select') {
    // highlight-start
    const dependencies = new Set();
    for (const attr of this.attributes) {
      for (const dep of attr.node.dependencies) {
        dependencies.add(dep);
      }
    }
    // highlight-end
    block.chunks.mount.push(
      b`@select_options(${this.var}, ${data}.value);`
    );
    block.chunks.update.push(
      b`if (${block.renderer.dirty(dependencies)}) @select_options(${this.var}, ${data}.value);`
    );
  }
}
```

After a few tweaks, finally I passed all my test cases, and its time to create a pull request!

## Submitting the fix

Before pushing the fix to remote, it is important to make sure that all the lints and typescript definitions are correct. You can run `npm run lint --fixed` for linting, and `npm run tsd` to generate typescript definition.

If you are unsure on how to create a pull request, you can check out [How to make your first pull request on GitHub](https://www.freecodecamp.org/news/how-to-make-your-first-pull-request-on-github-3/).

I pushed my branch and created a [Pull Request to Svelte](https://github.com/sveltejs/svelte/pull/4894), and now I am waiting for feedback and for it to get merged. 

Svelte is not maintained by full-time maintainers, everyone has their full-time job, so please be patient and be nice.

---

If you wish to learn more about Svelte, [follow me on Twitter](https://twitter.com/lihautan).

If you have anything unclear about this article, find me on [Twitter](https://twitter.com/lihautan) too!