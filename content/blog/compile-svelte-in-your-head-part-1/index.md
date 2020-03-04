---
title: Compile Svelte in your head (Part 1)
date: '2020-03-04T08:00:00Z'
tag: Svelte, JavaScript
series: Compile Svelte in your head
---

## Background

A while ago, [@swyx](https://twitter.com/swyx) came back to Singapore and visited us in [Shopee Singapore](https://careers.shopee.sg/about/) ([We're hiring!](https://grnh.se/32e5b3532)).

He gave an amazing sharing on [Compile Svelte in Your Head](https://www.swyx.io/speaking/svelte-compile-lightning/) ([video](https://www.youtube.com/watch?v=FNmvcswdjV8)) in the [ReactKnowledgeable Originals](https://reactknowledgeable.org/).

I love his presentation and the title is so catchy, so I begged him to use the catchy title as this series of articles about the Svelte compiler. It will be about how Svelte sees your code and compiles it down to plain JavaScript.

## Introduction

Lets refresh ourselves with how we write web app without any framework:

### Creating an element

```js
// create a h1 element
const h1 = document.createElement('h1');
h1.textContent = 'Hello World';
// ...and add it to the body
document.body.appendChild(h1);
```

### Updating an element

```js
// update the text of the h1 element
h1.textContent = 'Bye World';
```

### Removing an element

```js
// finally, we remove the h1 element
document.body.removeChild(h1);
```

### Adding style to an element

```js
const h1 = document.createElement('h1');
h1.textContent = 'Hello World';
// highlight-start
// add class name to the h1 element
h1.setAttribute('class', 'abc');
// ...and add a <style> tag to the head
const style = document.createElement('style');
style.textContent = '.abc { color: blue; }';
document.head.appendChild(style);
// highlight-end
document.body.appendChild(h1);
```

### Listen for click events on an element

```js
const button = document.createElement('button');
button.textContent = 'Click Me!';
// highlight-start
// listen to "click" events
button.addEventListener('click', () => {
  console.log('Hi!');
});
// highlight-end
document.body.appendChild(button);
```

These are code that you have to write, without using any framework or library.

The main idea of this article is to show how the Svelte compiler compiles the Svelte syntax into statements of codes that I've shown above.

## Svelte syntax

Here I'm going to show you some basics of the Svelte syntax.

> If you wish to learn more, I highly recommend trying [Svelte's interactive tutorial](https://svelte.dev/tutorial/basics).

So here is a basic Svelte component:

```svelte
<h1>Hello World</h1>
```
[Svelte REPL](https://svelte.dev/repl/99aeea705b1e48fe8610b3ccee948280)


To add style, you add a `<style>` tag:

```svelte
<style>
  h1 {
    color: rebeccapurple;
  }
</style>
<h1>Hello World</h1>
```

[Svelte REPL](https://svelte.dev/repl/cf54441399864c0f9b0cb25710a5fe9b)

At this point, writing Svelte component just feels like writing HTML, that's because Svelte syntax is a super set of the HTML syntax.

Let's look at how we add a data to our component:

```svelte
<script>
  let name = 'World';
</script>
<h1>Hello {name}</h1>
```
[Svelte REPL](https://svelte.dev/repl/c149ca960b0444948dc0c00a9175bcb3)

We put JavaScript inside the curly brackets.

To add a click handler, we use the `on:` directive

```svelte
<script>
  let count = 0;
  function onClickButton(event) {
    console.log(count);
  }
</script>
<button on:click={onClickButton}>Clicked {count}</button>
```
[Svelte REPL](https://svelte.dev/repl/1da1dcaf51814ed09d2341ea7915f0a1)

To change the data, we use [assignment operators](https://www.w3schools.com/js/js_assignment.asp)

```svelte
<script>
  let count = 0;
  function onClickButton(event) {
    // highlight-next-line
    count += 1;
  }
</script>
<button on:click={onClickButton}>Clicked {count}</button>
```
[Svelte REPL](https://svelte.dev/repl/7bff4b7746df4007a51155d2006ce724)

Let's move on to see how Svelte syntax is compiled into JavaScript that we've seen earlier

## Compile Svelte in your Head

The Svelte compiler analyses the code you write and generates an optimised JavaScript output.

To study how Svelte compiles the code, lets start with the smallest example possible, and slowly build up the code. Through the process, you will see that Svelte incrementally adds to the output code based on your changes.

The first example that we are going to see is:

```svelte
<h1>Hello World</h1>
```

[Svelte REPL](https://svelte.dev/repl/99aeea705b1e48fe8610b3ccee948280?version=3.19.1)

The output code:

```js
function create_fragment(ctx) {
  let h1;

  return {
    c() {
      h1 = element('h1');
      h1.textContent = 'Hello world';
    },
    m(target, anchor) {
      insert(target, h1, anchor);
    },
    d(detaching) {
      if (detaching) detach(h1);
    },
  };
}

export default class App extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, null, create_fragment, safe_not_equal, {});
  }
}
```

You can break down the output code into 2 sections:

- `create_fragment`
- `class App extends SvelteComponent`

### create_fragment

Svelte components are the building blocks of a Svelte application. Each Svelte component focuses on building its piece or fragment of the final DOM.

The `create_fragment` function gives the Svelte component an instruction manual on how to build the DOM fragment.

Look at the return object of the `create_fragment` function. It has methods, such as:

#### - c()

Short for **create**.

Contains instructions to create all the elements in the fragment.

In this example, it contains instruction to create the `h1` element

```js
h1 = element('h1');
h1.textContent = 'Hello World';
```

#### - m(target, anchor)

Short for **mount**.

Contains instructions to mount the elements into the target.

In this example, it contains instruction to insert the `h1` element into the `target`.

```js
insert(target, h1, anchor);

// http://github.com/sveltejs/svelte/tree/master/src/runtime/internal/dom.ts
export function insert(target, node, anchor) {
  target.insertBefore(node, anchor || null);
}
```

#### - d(detaching)

Short for **destroy**.

Contains instructions to remove the elements from the target.

In this example, we detach the `h1` element from the DOM

```js
detach(h1);

// http://github.com/sveltejs/svelte/tree/master/src/runtime/internal/dom.ts
function detach(node) {
  node.parentNode.removeChild(node);
}
```

> The method names are short for better minification. [See what can't be minified here](https://alistapart.com/article/javascript-minification-part-ii/#section3).

### export default class App extends SvelteComponent

Each component is a class, which you can import and instantiate it through [this API](https://svelte.dev/docs#Client-side_component_API).

And in the constructor, we initialize the component with information that made up the component such as `create_fragment`. Svelte will only pass information that it is needed and removing them whenever it is not necessary.

Try removing the `<h1>` tag and see what happens to the output:

```svelte
<!-- empty -->
```
[Svelte REPL](https://svelte.dev/repl/1f29ce52adf446fc9116bb957b7200ec?version=3.19.1)

```js
class App extends SvelteComponent {
  constructor(options) {
    super();
    // highlight-next-line
    init(this, options, null, null, safe_not_equal, {});
  }
}
```

Svelte will pass in `null` instead of `create_fragment`!

The `init` function is where Svelte set ups most of the internals, such as:

- component props, `ctx` (will explained what is `ctx` later) and context
- component lifecycle events
- component update mechanism

and at the very end, Svelte calls the `create_fragment` to create and mount elements into the DOM.

If you noticed, all the internals state and methods are attached to `this.$$`.

So if you ever access the `$$` property of the component, you are tapping into the internals. You've been warned! 🙈🚨

### Adding data

Now that we've looked at the bare minimum of a Svelte component, let's see how adding a data would change the compiled output:

```svelte
<script>
	let name = 'World';
</script>
<h1>Hello {name}</h1>
```
[Svelte REPL](https://svelte.dev/repl/c149ca960b0444948dc0c00a9175bcb3?version=3.19.1)


Notice the change in the output:

```js
function create_fragment(ctx) {
  // ...
  return {
    c() {
      h1 = element('h1');
      // highlight-next-line
      h1.textContent = `Hello ${name}`;
    },
    // ...
  };
}
// highlight-next-line
const name = 'World';

class App extends SvelteComponent {
  // ...
}
```

Some observations:

- What you've written in the `<script>` tag is moved into the top level of the code
- `h1` element's text content is now a template literals

There's a lot of amazing things happening under the hood right now, but let's hold our horses for a while, because it's best explained when comparing with the next code change.

### Updating data

Let's add a function to update the `name`:

```svelte
<script>
	let name = 'World';
	function update() {
		name = 'Svelte';
	}
</script>
<h1>Hello {name}</h1>
```
[Svelte REPL](https://svelte.dev/repl/3841485f4d224774ba42617e4e964968?version=3.19.1)

...and observe the change in the compiled output:

```js
function create_fragment(ctx) {
  return {
    c() {
      // highlight-start
      h1 = element('h1');
      t0 = text('Hello ');
      t1 = text(/*name*/ ctx[0]);
      // highlight-end
    },
    m(target, anchor) {
      insert(target, h1, anchor);
      append(h1, t0);
      append(h1, t1);
    },
    // highlight-start
    p(ctx, [dirty]) {
      if (dirty & /*name*/ 1) set_data(t1, /*name*/ ctx[0]);
    },
    // highlight-end
    d(detaching) {
      if (detaching) detach(h1);
    },
  };
}

// highlight-start
function instance($$self, $$props, $$invalidate) {
  let name = 'World';

  function update() {
    $$invalidate(0, (name = 'Svelte'));
  }

  return [name];
}
// highlight-end

export default class App extends SvelteComponent {
  constructor(options) {
    super();
    // highlight-next-line
    init(this, options, instance, create_fragment, safe_not_equal, {});
  }
}
```

Some observations:

- the text content of `<h1>` element is now broken into 2 text nodes, created by the `text(...)` function
- the return object of the `create_fragment` has a new method, `p(ctx, dirty)`
- a new function `instance` is created
- What you've written in the `<script>` tag is now moved into the `instance` function
- for the sharp-eyed, the variable `name` that was used in the `create_fragment` is now replaced by `ctx[0]`

So, why the change?

The Svelte compiler tracks all the variable in declared in the `<script>` tag.

It tracks whether the variable:

- can be mutated? eg: `count++`,
- can be reassigned? eg: `name = 'Svelte'`,
- is referenced in the template? eg: `<h1>Hello {name}</h1>`
- is writable? eg: `const i = 1;` vs `let i = 1;`
- ... and many more

When the Svelte compiler realise that the variable `name` can be reassigned, (due to `name = 'Svelte';` in `update`), it breaks down the text content of the `h1` into parts, so that it can dynamically update part of the text.

Indeed, you can see that there's a new method, `p`, to update the text node.

#### - p(ctx, dirty)

Short for **u_p_date**.

**p(ctx, dirty)** contains instruction to update the elements based on what has changed in the state (`dirty`) and the state (`ctx`) of the component.

### instance variable

The compiler realises that the variable `name` cannot be shared across different instances of the `App` component. That's why it moves the declaration of the variable `name` into a function called `instance`.

In the previous example, no matter how many instances of the `App` component, the value of the variable `name` is the same and unchanged across the instances:

```svelte
<App />
<App />
<App />

<!-- gives you -->
<h1>Hello world</h1>
<h1>Hello world</h1>
<h1>Hello world</h1>
```

But, in this example, the variable `name` can be changed within 1 instance of the component, so the declaration of the variable `name` is now moved into the `instance` function:

```svelte
<App />
<App />
<App />

<!-- could possibly be -->
<h1>Hello world</h1>
<!-- highlight-next-line -->
<h1>Hello Svelte</h1>
<h1>Hello world</h1>
<!-- depending on the inner state of the component -->
```

### instance($$self, $$props, \$\$invalidate)

The `instance` function returns a list of _instance_ variables, which are variables that are:

- referenced in the template
- mutated or reassigned, (can be changed within 1 instance of the component)

In Svelte, we call this list of instance variables, **ctx**.

In the `init` function, Svelte calls the `instance` function to create **ctx**, and uses it to create the fragment for the component:

```js
// conceptually,
const ctx = instance(/*...*/);
const fragment = create_fragment(ctx);
// create the fragment
fragment.c();
// mount the fragment onto the DOM
fragment.m(target);
```

Now, instead of accessing the variable `name` outside of the component, we refer to the variable `name` passed via the **ctx**:

```js
t1 = text(/*name*/ ctx[0]);
```

The reason that ctx is an array instead of a map or an object is because of an optimisation related to bitmask, you can see [the discussion about it here](https://github.com/sveltejs/svelte/issues/1922)

### \$\$invalidate

The secret behind the system of reactivity in Svelte is the `$$invalidate` function.

For every variable that has

- reassigned or mutated
- referenced in the template

will have the `$$invalidate` function inserted right after the assignment or mutation:

```js
name = 'Svelte';
count++;
foo.a = 1;

// compiled into something like
name = 'Svelte';
$$invalidate(/* name */, name);
count++;
$$invalidate(/* count */, count);
foo.a = 1;
$$invalidate(/* foo */, foo);
```

The `$$invalidate` function marks the variable dirty and schedules an update for the component:

```js
// conceptually...
const ctx = instance(/*...*/);
const fragment = create_fragment(ctx);
// to track which variable has changed
const dirty = new Set();
const $$invalidate = (variable, newValue) => {
  // update ctx
  ctx[variable] = newValue;
  // mark variable as dirty
  dirty.add(variable);
  // schedules update for the component
  scheduleUpdate(component);
};

// get called when update scheduled
function flushUpdate() {
  // update the fragment
  fragment.p(ctx, dirty);
  // clear the dirty
  dirty.clear();
}
```

### Adding event listeners

Let's now add an event listener

```svelte
<script>
	let name = 'world';
	function update() {
		name = 'Svelte';
	}
</script>
<!-- highlight-next-line -->
<h1 on:click={update}>Hello {name}</h1>
```
[Svelte REPL](https://svelte.dev/repl/5b12ff52c2874f4dbb6405d9133b34da?version=3.19.1)

And observe the difference:

```js
function create_fragment(ctx) {
  // ...
  return {
    c() {
      h1 = element('h1');
      t0 = text('Hello ');
      t1 = text(/*name*/ ctx[0]);
    },
    m(target, anchor) {
      insert(target, h1, anchor);
      append(h1, t0);
      append(h1, t1);
      // highlight-next-line
      dispose = listen(h1, 'click', /*update*/ ctx[1]);
    },
    p(ctx, [dirty]) {
      if (dirty & /*name*/ 1) set_data(t1, /*name*/ ctx[0]);
    },
    d(detaching) {
      if (detaching) detach(h1);
      // highlight-next-line
      dispose();
    },
  };
}

function instance($$self, $$props, $$invalidate) {
  let name = 'world';

  function update() {
    $$invalidate(0, (name = 'Svelte'));
  }
  // highlight-next-line
  return [name, update];
}
// ...
```

Some observations:

- `instance` function now returns 2 variables instead of 1
- Listen to click event during **mount** and dispose it in **destroy**

As I've mentioned earlier, `instance` function returns variables that are **referenced in the template** and that are **mutated or reassigned**.

Since we've just referenced the `update` function in the template, it is now returned in the `instance` function as part of the **ctx**.

Svelte tries generate as compact JavaScript output as possible, not returning an extra variable if it is not necessary.

### listen and dispose

Whenever you add [an event listener](https://svelte.dev/tutorial/dom-events) in Svelte, Svelte will inject code to add an [event listener](https://developer.mozilla.org/en-US/docs/Web/API/EventListener) and remove it when the DOM fragment is removed from the DOM.

Try add more event listeners,

```svelte
<h1
	on:click={update}
	on:mousedown={update}
	on:touchstart={update}>
  Hello {name}!
</h1>
```
[Svelte REPL](https://svelte.dev/repl/efde6f2aaf624e708767f1bd3e94e479?version=3.19.1)

add observe the compiled output:

```js
// ...
// highlight-start
dispose = [
  listen(h1, 'click', /*update*/ ctx[1]),
  listen(h1, 'mousedown', /*update*/ ctx[1]),
  listen(h1, 'touchstart', /*update*/ ctx[1], { passive: true }),
];
// highlight-end
// ...
// highlight-next-line
run_all(dispose);
```

Instead of declaring and creating a new variable to remove each event listener, Svelte assigns all of them to an array:

```js
// instead of
dispose1 = listen(h1, 'click', /*update*/ ctx[1]);
dispose2 = listen(h1, 'mousedown', /*update*/ ctx[1]);
dispose2 = listen(h1, 'touchstart', /*update*/ ctx[1], { passive: true });
// ...
dispose1();
dispose2();
dispose3();
```

Minification can compact the variable name, but you can't remove the brackets.

Again, this is another great example of where Svelte tries to generate a compact JavaScript output. Svelte does not create the `dispose` array when there's only 1 event listener.

## Summary

The Svelte syntax is a superset of HTML.

When you write a Svelte component, the Svelte compiler analyses your code and generates an optimised JavaScript code output.

The output can be divided into 3 segments:

#### 1. create_fragment

- Returns a fragment, which is an instruction manual on how to build the DOM fragment for the component

#### 2. instance

- Most of the code written in the `<script>` tag is in here.
- Returns a list of instance variables that are referenced in the template
- `$$invalidate` is inserted after every assignment and mutation of the instance variable

#### 3. class App extends SvelteComponent

- Initialise the component with `create_fragment` and `instance` function
- Sets up the component internals
- Provides the [Component API](https://svelte.dev/docs#Client-side_component_API)

Svelte strives to generate as compact JavaScript as possible, for example:

- Breaking text content of `h1` into separate text nodes only when part of the text can be updated
- Not defining `create_fragment` or `instance` function when it is not needed
- Generate `dispose` as an array or a function, depending on the number of event listeners.
- ...

## Closing Note

We've covered the basic structure of the Svelte's compiled output, and this is just the beginning.

If you wish to know more, [follow me on Twitter](https://twitter.com/lihautan).

I'll post it on Twitter when the next part is ready, where I'll be covering [logic blocks](https://svelte.dev/tutorial/if-blocks), [slots](https://svelte.dev/tutorial/slots), [context](https://svelte.dev/tutorial/context-api), and many others.
