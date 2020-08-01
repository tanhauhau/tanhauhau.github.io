---
title: Deep dive into Svelte
description: wip
date: '2019-11-09T08:00:00Z'
lastUpdated: '2019-11-09T08:00:00Z'
wip: true
---

# [DRAFT] What is Svelte?

-- this is a work in progress draft, you can read [Compile Svelte in your Head](/compile-svelte-in-your-head-part-1) which is a more friendly version --

[Svelte](http://svelte.dev/) is a compiler for web applications. Svelte provides a framework for you to write your web apps declaratively, and it will compile them into efficient JavaScript.

In this article, I will be sharing how Svelte works.

If you are:

- **First time hearing Svelte?**

  Please go and watch [Rich Harris](https://twitter.com/Rich_Harris) inspiring talk on ["Rethinking reactivity"](https://svelte.dev/blog/svelte-3-rethinking-reactivity) where he announces Svelte.

- **Interested learning how to write Svelte application?**

  Please follow along [Svelte's interactive tutorial](https://svelte.dev/tutorial/basics), I find it very helpful and it get me started in no time!

Because, I will be going deep level by level, guiding you through the source code sometimes, explaining how Svelte works.

- look at code written in vanilla vs using framework
  - compile time vs build time spectrum, svelte and react opposite side of the spectrum
- a picture of how a svelte component works
  - 


## Writing vanilla JavaScript

Before we get started, lets' do an exercise.

Let's write a counter app like below, without using any framework:

<div style="text-align:center;">
  <button id="ex1-decrement">-</button>
  <span id="ex1-count">0</span>
  <button id="ex1-increment">+</button>
  <script>
    let count = 0;
    const span = document.querySelector('#ex1-count');
    document.querySelector('#ex1-decrement').onclick = () => span.textContent = --count;
    document.querySelector('#ex1-increment').onclick = () => span.textContent = ++count;
  </script>
</div>

There are generally 2 approaches to this:

**1. HTML + JS**

You build your app layout in HTML:

```html
<!-- filename: index.html -->
<button id="decrement">-</button>
<span id="count">0</span>
<button id="increment">+</button>
```

then in JS, you use id selector to query out the dynamic part of your HTML and attach event listeners to respond to user inputs:

```js
// filename: script.js
let count = 0;
const span = document.querySelector('#count');
document.querySelector('#decrement').onclick = () =>
  (span.textContent = --count);
document.querySelector('#increment').onclick = () =>
  (span.textContent = ++count);
```

**2. JS only**

If you want to have more than 1 counter, the former approach may require you to _copy + paste_ your HTML _n_ times for _n_ number of counters.

The alternative would be to build the HTML elements programatically:

```js
// filename: script.js
function buildCounter(parent) {
  const span = document.createElement('span');
  const decrementBtn = document.createElement('button');
  const incrementBtn = document.createElement('button');

  let count = 0;

  span.textContent = 0;

  decrementBtn.textContent = '-';
  decrementBtn.onclick = () => (span.textContent = --count);

  incrementBtn.textContent = '+';
  incrementBtn.onclick = () => (span.textContent = ++count);

  parent.appendChild(decrementBtn);
  parent.appendChild(span);
  parent.appendChild(incrementBtn);
}

// you can call `buildCounter` however times you want
//  to get however many counters
buildCounter(document.body);
```

This is the least amount of code to be written for a counter app.

_(One may argue that you can abstract out `document.createElement` or `parent.appendChild` to a function to make the code smaller, but that's besides the point.)_

This is the least amount of code to be written **and be executed by the browser** for a counter app.

So why does this matter? Well, before we proceed to explain how this got to do with Svelte, let's first talk about React.

_I chose to talk about React **just because I am a React developer**, I use React at my work and at this very blog site. I am most familiar with React than any other JS frameworks out there_

In React, you can argubly write a much concise and declarative code:

```js
// filename: Counter.jsx
function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button onClick={() => setCount(c => c - 1)}>-</button>
    <span>{ count }</span>
    <button onClick={() => setCount(c => c + 1)}>+</button>
  )
}
```

That's because React has hidden all the `document.createElement`, `parent.appendChild`, ... under [`react-dom` renderer.](https://reactjs.org/docs/react-dom.html)

Everytime you click on a counter button, the function `Counter` is called to get the new [Fiber tree](https://github.com/acdlite/react-fiber-architecture) with the new state value, and it is compared with the current Fiber tree. After the diffing between the 2 Fiber tree, React collects the necessary DOM operations, in this case is to update `span`'s `textContent`.

If you feel this is overly complicated, wait, there is more.

When the `react-dom` [receives the DOM operations](https://github.com/facebook/react/blob/b8d079b41372290aa1846e3a780d85d05ab8ffc1/packages/react-dom/src/client/ReactDOMComponent.js#L372-L377), it receives `['span', { 'children': '1' }]`, the element and the update payload, and `react-dom` has to figure out that `children` meant [setting the `textContent`](https://github.com/facebook/react/blob/b8d079b41372290aa1846e3a780d85d05ab8ffc1/packages/react-dom/src/client/ReactDOMComponent.js#L386-L388).

As you can see, there's a lot of code **executed** under the hood, which you may think is overkill for this contrived example. But with a much larger/complex application, you will soon appreciate the flexibilty React provides. to achieve that, react has to make sure it has code to capture all the different scenarios, without knowing what will be written by us, the developer.

Now, here is how Svelte is different. **Svelte is a compiler**. Svelte knows what we, the developer, has written, and generate only code that is needed for our application.

Here's what Svelte generated for our Counter app ([repl](https://svelte.dev/repl/2ed88da423f24cd980dad77e8a07e248?version=3.12.1)):

```js
// import { element, ... } from "svelte/internal"
// ...
function create_fragment(ctx) {
  var button0, span, t, button1, dispose;

  return {
    c() {
      button0 = element('button');
      button0.textContent = '-';
      span = element('span');
      t = text(ctx.count);
      button1 = element('button');
      button1.textContent = '+';
      listen(button0, 'click', ctx.click_handler),
        listen(button1, 'click', ctx.click_handler_1);
    },
    m(target, anchor) {
      insert(target, button0, anchor);
      insert(target, span, anchor);
      append(span, t);
      insert(target, button1, anchor);
    },
    p(changed, ctx) {
      if (changed.count) {
        set_data(t, ctx.count);
      }
    },
    // ...
  };
}

function instance($$self, $$props, $$invalidate) {
  let count = 0;
  const click_handler = () => $$invalidate('count', (count -= 1));
  const click_handler_1 = () => $$invalidate('count', (count += 1));
  return { count, click_handler, click_handler_1 };
}
// ...
```

**Disclaimer:** _There are parts of code deliberately removed to make the code more concise and readable, which should not affect the point I am trying to make here. Feel free to read the original code in the [repl](https://svelte.dev/repl/2ed88da423f24cd980dad77e8a07e248?version=3.12.1)._

You see Svelte's generated code is much like the one we've written in plain JavaScript just now. It generates the `.textContent` directly, because during compilation, Svelte knows exactly what you are trying to do. Therefore it can try to handle all the different scenarios, where React tries to handle in runtime, in build time.

Now you know the fundamental differences between Svelte and React, let's take a look how a Svelte component works.

## Conceptually, how does compiled Svelte component work?

In this section, we are going to write Svelte component incrementally, and see how each changes ended up in the compiled Svelte component.

Let's start with a simple button and a text:

```html
<button>Click Me</button>
<p>Hello Svelte</p>
```

When Svelte sees this, these HTML elements will translate into JavaScript statement to create the elements:

```js
const button = element('button');
button.textContent = 'Click Me';
const p = element('p');
p.textContent = 'Hello Svelte';

// element('p') is short for `document.createElement('p');
```

If you inspect the Svelte compiled output, you would notice that these instruction lies in a function call `create_fragment`. `create_fragment` is the function where Svelte keeps the DOM instructions for the component.

Next, lets add some event listener to the button:

```html
<script>
  function onClick() {
    console.log('Greetings!');
  }
</script>
<button on:click={onClick}>Click Me</button>
<p>Hello Svelte</p>
```



<!--  -->

## How the compiled Svelte component works

To differentiate between the component code you write, and the component code generated by Svelte, I will use `.svelte` component to refer the code you would write in a `.svelte` file, and Svelte component to refer the `.js` code, generated by Svelte from your `.svelte` component, that will be executed in your application.

The best way to understand how Svelte component works is to use the [Svelte's REPL](https://svelte.dev/repl). Try writing a component, and see how Svelte compiles the component into plain JavaScript.

Svelte compiles the `.svelte` file into a `.js` file, which the `export default` the compiled Svelte component.

The compiled Svelte component contains 3 main sections:

- `create_fragment`
- `instance`
- the Component itself

```js
// 1. create_fragment
function create_fragment(ctx) {
  return {
    c() { /*...*/ },
    m() { /*...*/ },
    p() { /*...*/ },
    d() { /*...*/ },
    // ...
  }
}

// 2. instance
function instance($$self, $$props, $$invalidate) {
  // ...
  return { ... }
}

// 3. the Component itself
class App extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, []);
  }
}

export default App;
```

Let's explain what each section of the code is for, from the bottom up.

**3. The component itself**

Each compiled component, by default, is a subclass of `SvelteComponent`.

To create the component onto the DOM, you can create an instance of the component:

```js
const app = new App({ target: document.body });
```

In the constructor of `App`, as you can see, calls the `init` function, which takes in both `instance` and `create_fragment` function.

The `init` function, as the name suggests, will set things up, which lead us to the `instance` function.

**2. `instance`**

The `instance` function is where all the business logic of your `.svelte` component lies.

That's why, if you take a closer look, the `instance` function contains most, if not all, the code you write in the `<script>` tag in the `.svelte` component.

---

Code that you write in the `<script>` tag that will not be in the `instance` function are:

- **`import` statement**
  - These will be moved to the beginning of the compiled file.
- **`export` statement**
  - These are exported properties or methods of the Svelte component. It will be present in the former section, "the component itself" section.
- **constants**
  - Since the value of a constant will not change throughout the lifetime of your application, so there's no point redeclaring a new constant for every instance of your Svelte component.
  - Therefore it is moved out from the `instance` function.
  - [Check out the repl](https://svelte.dev/repl/hello-world).
- **pure functions**
  - The same logic goes with pure functions. If the function does not rely on any variables within the scope other than it's own arguments, the function will be moved out from the `instance` function.
  - [Check out this repl](https://svelte.dev/repl/d831c0e1387d4105b9bf4cbf6e321477?version=3.12.1).

---

The `instance` function contains all of your business logic, and returns an object. The object contains all the variables and functions you've declared and used in the HTML code. The object is referred as `ctx` in Svelte, and that brings us to the `create_fragment` function.

**1. `create_fragment`**

The `create_fragment` function deals with the HTML code you've written in a `.svelte` component. The `create_fragment` function takes in the `ctx` object, and returns an object that instructs the Svelte component how to render into the DOM, that looks like this:

```js
function create_fragment(ctx) {
  let t;
  return {
    // create
    c() { 
     t = text(ctx.greeting);
    },
    // claim
    l(nodes) { 
      t = claim_text(nodes, ctx.greeting);
    },
    // hydrate
    h: noop,
    // mount
    m(target, anchor) {
      insert(target, t, anchor);
    },
    // update
    p(changed, ctx) { 
      if (changed.greeting) {
        set_data(t, ctx.greeting);
      }
    },
    // measure
    r: noop,
    // fix
    f: noop,
    // animate
    a: noop,
    // intro
    i: noop,
    // outro
    o: noop,
    // destroy
    d(detaching) { 
      if (detaching) {
        detach(t);
      }
    },
  };
}
```

Let's take a closer look to what each function does:

**- c _(create)_**

This function creates all the DOM nodes needed.

**- l _(claim)_**

On the other hand, if you use a server-side rendering, and you want to hydrate the rendered DOM with the component, the `claim` function will be called instead of `create`. This will try to claim and assign reference to the DOM node.

**- m _(mount)_**

With the references to the DOM nodes, the `mount` function will `insert` or `append` DOM nodes to the target accordingly.

**- p _(update)_**

If there's a change, say after a button click, the `update` function will be called with the changed mask and the new `ctx` object.

**- r _(measure)_**<br/>
**- f _(fix)_**<br/>
**- a _(animate)_**<br/>
**- i _(intro)_**<br/>
**- o _(outro)_**

These are for animations, measuring and fixing the element before animation, `intro`s and `outro`s.

**- d _(destroy)_**

Last but not least, the `destroy` function is called when the Svelte component unmounts from the target.

### Pieces them together

With every pieces in mind, let's summarise what we've learned so far:

You create the component into DOM by create a new instance of the Svelte component:
```js
const app = new App({ target: document.body });
```

Which in the constructor of `App`, it calls the `init` function:
```js
function init(app, options, instance, create_fragment) {}
```

Within the `init` function, the `instance` function is called:
```js
function init(app, options, instance, create_fragment) {
  // highlight-next-line
  const ctx = instance(app, options.props);
}
```

Which returns the `ctx`, and it is passed into the `create_fragment` function:
```js
function init(app, options, instance, create_fragment) {
  const ctx = instance(app, options.props);
  // highlight-next-line
  const fragment = create_fragment(ctx);
}
```

Which returns instructions on how to create DOM nodes and mount the nodes into DOM:
```js
function init(app, options, instance, create_fragment) {
  const ctx = instance(app, options.props);
  const fragment = create_fragment(ctx);
  // highlight-start
  // create / claim the nodes
  if (options.hydratable) {
    fragment.claim();
  } else {
    fragment.create();
  }
  // mount the nodes
  fragment.mount();
  // highlight-end
}
```

But hey, when does the `fragment.update()` get called when something has changed?

That my friend, is the secret 3rd argument of the `instance` function, **`$$invalidate`**.

Whenever you reassign a value to your variable, Svelte will add an extra statement of `$$invalidate(...)` statement after your re-assignment.

`$$invalidate` takes 2 arguments, the name of the variable, and the new value of the variable:

```js
function init(app, options, instance, create_fragment) {
  // highlight-start
  const $$invalidate = (name, value) => {
    ctx[name] = value;
    // update the nodes
    fragment.update({ [name]: true }, ctx);
  };
  const ctx = instance(app, options.props, $$invalidate);
  // highlight-end
  const fragment = create_fragment(ctx);
  // create / claim the nodes
  if (options.hydratable) {
    fragment.claim();
  } else {
    fragment.create();
  }
  // mount the nodes
  fragment.mount();
}
```

_Of course, if you have consecutive `$$invalidate` calls, Svelte will batch all the `$$invalidate` changes, and call `fragment.update` only once with all the changes._

Now that you have a clearer picture on how Svelte works, let's go one level deeper, and take a look how the Svelte compiler works.

## The Svelte compiler

-- WIP --