---
title: Compile Svelte 5 in your head
date: '2025-07-20T08:00:00Z'
tags:
  - Svelte
  - JavaScript
series: Compile Svelte 5 in your head
label: blog
---

## Background

5 years ago, I wrote [Compile Svelte in your head](/compile-svelte-in-your-head-part-1/). That was written for Svelte 3.

But now, almost 1 year into [Svelte 5 release](https://svelte.dev/blog/svelte-5-is-alive), which introduce tons of new features, such as _runes_, fine-grained reactivity, and more, **it is time to rewrite the article for Svelte 5**!

## Introduction

Lets refresh ourselves with how we write web app without any framework:

### Creating an element

```js twoslash include h1
// create a h1 element
const h1 = document.createElement('h1');
// create a text node
const text = document.createTextNode('Hello World');
h1.appendChild(text);
// ...and add it to the body
document.body.appendChild(h1);
```

```js twoslash
// @include: h1
```

> If you've read my [previous article](/compile-svelte-in-your-head-part-1#creating-an-element), you might've notice that I've tweaked slightly on the example above, using `document.createTextNode` instead of setting `textContent`.
>
> The reason why will slowly make sense to you later; but for now, do note that, you can have multiple text nodes in one element, eg:
>
> ```js
> const h1 = document.createElement('h1');
> const text1 = document.createTextNode('Hello ');
> const text2 = document.createTextNode('World');
> h1.appendChild(text1);
> h1.appendChild(text2);
> document.body.appendChild(h1);
> ```
>
> creates:
>
> ```html
> <h1>Hello World</h1>
> ```

### Updating text value in a text node

```js
// @include: h1
// ---cut---
// update the text of the text node
text.nodeValue = 'Bye World';
```

### Removing an element

```js
// @include: h1
// ---cut---
// finally, we remove the h1 element
document.body.removeChild(h1);
```

### Adding style to an element

```js
// add class name to the h1 element
h1.setAttribute('class', 'abc');
// ...and add a <style> tag to the head
const style = document.createElement('style');
style.textContent = '.abc { color: blue; }';
document.head.appendChild(style);
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

In previous versions of Svelte, this is enough DOM knowledge [for me to draw parallels with Svelte](/compile-svelte-in-your-head-part-1#svelte-syntax).

However, more optimisation has been applied to Svelte 5. We will need to learn a few more advanced DOM concepts, such as [`<template>`](#the-lt-template-gt-element) and [event delegation](#event-delegation), before we can start talking about Svelte.

### The `<template>` element

The [`<template>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template) is a special HTML element that allows you to define a chunk of HTML that is not rendered. Instead, its content is stored as a "template" that you can clone and insert into the DOM later using JavaScript.

This is useful for creating reusable DOM structures:

```js
// create a template element
const template = document.createElement('template');
template.innerHTML = '<h1>Hello World</h1>';

// clone the template
const h1 = template.cloneNode(true).content.firstChild;
// insert the cloned template into the body
document.body.appendChild(h1);
```

As you can imagine, if your component contains a slightly more complex element structure, it can be more efficient to clone it from a `<template>` rather than manually rebuilding the DOM structure with `createElement`.

### nextSibling and firstChild

When you clone DOM elements using the `<template>` element, it'll be useful to get the reference to the specific elements within the cloned element.

```js
const template = document.createElement('template');
template.innerHTML = '<h1>Hello <span>World</span></h1>';

const h1 = template.cloneNode(true).content.firstChild;
// highlight-start
// get the first child of the cloned element
const text = h1.firstChild; // "Hello "
// get the next sibling of the first child
const span = text.nextSibling; // <span>World</span>
// highlight-end
```

### Event delegation

When you have a lot of elements that you want to listen to the same event name, eg: `'click'` event, you can use a technique called **event delegation**, that is, to listen to the event on a common parent element, rather than adding event listeners on each element.

For example, in the following HTML structure:

```html
<div>
  <button>Click me</button>
  <button>Click me</button>
</div>
```

Instead of adding event listeners on each button:

```js
button1.addEventListener('click', () => {
  console.log('Button 1 clicked');
});
button2.addEventListener('click', () => {
  console.log('Button 2 clicked');
});
```

You can instead listen to the event on the parent `<div>`:

```js
div.addEventListener('click', (event) => {
  if (event.target === button1) {
    console.log('Button 1 clicked');
  } else if (event.target === button2) {
    console.log('Button 2 clicked');
  }
});
```

Event delegation is a common technique used in most JavaScript frameworks, as it is more efficient in performance, and it's much simpler to cleanup.

> Here are some resources that I've found useful to learn about event delegation:
>
> - [**GreatFrontEnd:** Explain event delegation in JavaScript](https://www.greatfrontend.com/questions/quiz/explain-event-delegation)
> - [**The Modern JavaScript Tutorial:** Event delegation](https://javascript.info/event-delegation)

With enough preface on DOM, it's time for us to talk about Svelte 5.

## Svelte syntax

Here I'm going to show you some basics of the Svelte 5 syntax.

> If you wish to learn more, I highly recommend trying [Svelte's interactive tutorial](https://svelte.dev/tutorial/svelte/welcome-to-svelte).

So here is a basic Svelte component:

```svelte
<h1>Hello World</h1>
```

[Svelte REPL](https://svelte.dev/repl/99aeea705b1e48fe8610b3ccee948280?version=5)

To add style, you add a `<style>` tag:

```svelte
<style>
  h1 {
    color: rebeccapurple;
  }
</style>
<h1>Hello World</h1>
```

[Svelte REPL](https://svelte.dev/repl/cf54441399864c0f9b0cb25710a5fe9b?version=5)

At this point, writing Svelte component just feels like writing HTML, that's because Svelte syntax is a super set of the HTML syntax.

Let's look at how we add data to our component with the [Svelte runes](https://svelte.dev/blog/runes):

```svelte
<script>
  let name = $state('World');
</script>
<h1>Hello {name}</h1>
```

[Svelte REPL](https://svelte.dev/playground/35593ac1322248699828c5ce6e438038?version=5)

Runes are like markers that tell the Svelte compiler about your code. We use the `$state` rune to mark the `name` variable as a reactive state.

To use the reactive state in the template, we can specify it inside the `{}` curly brackets in the template. We can include any JavaScript expression inside the curly brackets.

To add a click handler, we add the `onclick` attribute to the button element, just like how you would in HTML:

```svelte
<script>
  let count = $state(0);
  function onClickButton(event) {
    console.log(count);
  }
</script>
<button onclick={onClickButton}>Clicked {count}</button>
```

[Svelte REPL](https://svelte.dev/repl/1da1dcaf51814ed09d2341ea7915f0a1?version=5)

To change the value of a reactive state, we just assign to it:

```svelte
<script>
  let count = $state(0);
  function onClickButton(event) {
    // highlight-next-line
    count += 1;
  }
</script>
<button onclick={onClickButton}>Clicked {count}</button>
```

[Svelte REPL](https://svelte.dev/repl/7bff4b7746df4007a51155d2006ce724?version=5)

Since we've marked `count` as a reactive state with the `$state` rune, any change in the `count` variable value will be reflected in the DOM.

## Compile Svelte 5 in your Head

The Svelte compiler analyses the code you write and generates an optimised JavaScript output.

To study how Svelte compiles the code, lets start with the smallest example possible, and slowly build up the code. Through the process, you will see that Svelte incrementally adds to the output code based on your changes.

The first example that we are going to see is:

```svelte
<h1>Hello World</h1>
```

[Svelte REPL](https://svelte.dev/repl/99aeea705b1e48fe8610b3ccee948280?version=5)

The output code:

```js
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>Hello World</h1>`);

// highlight-start
export default function App($$anchor) {
  var h1 = root();
  $.append($$anchor, h1);
}
// highlight-end
```

All components in Svelte compiles to function that mounts elements into the DOM.

The component function is meant to be called once, to setup the component, and that's it for the entire lifetime of the component.

If you take a look here,

```js
var root = $.from_html(`<h1>Hello World</h1>`);
```

We have our entire Svelte component here, in HTML string, passed into the `$.from_html` function.

But, what does it do?

It's tempting for me to show you the implementation of the `$.from_html`, but the actual code is a bit more complicated 😵‍💫, so allow me to gloss it over and simplify it 😅.

The `$.from_html` function takes in HTML string, turn it into a `<template>` element, and returns a function that returns a new clone instance of the template:

```js
function from_html(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  return () => template.cloneNode(true).content.firstChild;
}
```

_[Actual implementation of `from_html`](https://github.com/sveltejs/svelte/blob/f882095/packages/svelte/src/internal/client/dom/template.js#L43)_.

Putting it together:

```js
// create a template element
var root = $.from_html(`<h1>Hello World</h1>`);

export default function App($$anchor) {
  // create a new clone instance of the template
  var h1 = root();
  // append the h1 element into the $$anchor element
  $.append($$anchor, h1);
}
```

### Adding a reactive state

Now that we've looked at the bare minimum of a Svelte component, let's see how adding a reactive state would change the compiled output:

```svelte
<script>
  let name = $state('World');
</script>
<h1>Hello {name}</h1>
```

Notice the change in the output code:

```js
import * as $ from 'svelte/internal/client';

// highlight-next-line
var root = $.from_html(`<h1></h1>`);

export default function App($$anchor) {
  // highlight-next-line
  let name = 'World';
  var h1 = root();

  // highlight-next-line
  h1.textContent = 'Hello World';
  $.append($$anchor, h1);
}
```

Some observations:

- What you've written in the `<script>` tag is moved into the top of the `App` function, with the `$state` runes marker removed.
- The HTML template no longer have the text content in the `h1`, but instead, it's set with `h1.textContent`

What happened here is that, whenever Svelte sees a dynamic expression in the template, the things that are wrapped in `{}`, Svelte will remove it from the HTML template string. They will not be defined when cloning the element through the `root()` function.

Instead, the dynamic values will only be set to the cloned elements after they are created when the component is being set up in the `App` function.

Try adding static and dynamic attributes to the element, and see that indeed only static attributes are defined inside the template, and dynamic attributes are set after the element is created:

```svelte
<h1 foo="abc" bar={name}>Hello {name}</h1>
```

Not sure if you are wondering, why is the `name` variable is defined in the `App` function, although it is not being used?

Well, I can come up with an explanation, but, it's best explained when comparing with the next code change, so, hold our horses for a bit.

### Updating the reactive state

Now, let's update the reactive state, `name`:

```svelte
<script>
  let name = $state('World');
  // highlight-start
  function update() {
    name = 'Svelte';
  }
  // highlight-end
</script>
<h1>Hello {name}</h1>
```

...and observe the change in the compiled output:

```js
import * as $ from 'svelte/internal/client';

// highlight-next-line
var root = $.from_html(`<h1> </h1>`);

export default function App($$anchor) {
  // highlight-next-line
  let name = $.state('World');

  // highlight-start
  function update() {
    $.set(name, 'Svelte');
  }
  // highlight-end

  var h1 = root();
  // highlight-next-line
  var text = $.child(h1);

  $.reset(h1);
  // highlight-next-line
  $.template_effect(() => $.set_text(text, `Hello ${$.get(name) ?? ''}`));
  $.append($$anchor, h1);
}
```

Some observations:

- Additional space in between the `<h1> </h1>` in the template
- Similar to the previous sample, what you've written in the `<script>` tag is moved into the top of the `App` function
- But now, the reactive state `name` is now defined with `$.state()`
- Setting the reactive state `name` is done through `$.set()` and reading is `$.get()`
- There's an additional `$.template_effect()` function that is used to set the text content of the text node

#### Updating the template

Different from the previous example, whenever the reactive state `name` is updated, we are going to [update the value of the text node](#updating-text-value-in-a-text-node) inside `<h1>`.

Which means 2 things:

1. when cloning the template, we need to clone a text node inside `<h1>`
2. we need to get the reference to the text node, so that we can update it when the reactive state `name` changed

Not sure you've noticed, to achieve **(1)**, we need to add an additional space in between the `<h1> </h1>` in the template.

That is because, creating a template with `<h1></h1>` will get you:

- h1 _(element)_

but creating a template with `<h1> </h1>`, you get:

- h1 _(element)_
  - ' ' _(text node)_

Now, does it now make sense with the additional space?

Now, `h1` refers to the `<h1>` element, and to get the reference of the text node inside `h1`, we need to [get the firstChild](#nextsibling-and-firstchild), which is what `$.child(h1)` is doing:

```js
var text = $.child(h1);
// is same as
var text = h1.firstChild;
```

Now we've created the text node and we have the reference to it, it's time to update the text node when the reactive state `name` changed. Thus, it's time to talk about signals and effects.

#### Signals and effects

There are many amazing articles written by the smartest people out there explaining the concepts of signals:

- [The Evolution of Signals in JavaScript](https://dev.to/this-is-learning/the-evolution-of-signals-in-javascript-8ob)
- [Angular: Signals](https://angular.dev/essentials/signals)
- [Vue: Reactivity in Depth](https://vuejs.org/guide/extras/reactivity-in-depth)
- [Svelte: Signal Boost](https://svelte.dev/blog/runes#Signal-boost)

So, I'm not going to attempt to explain what signals are.

But for the purpose of this article, I'm going to point out a few key points about signals in Svelte, so that you can see how it fits.

Signals in Svelte is created with the `$.state()`, which is compiled from the `$state` runes. You can think of signals as **an object that stores the value of a reactive state**. To read and set value, you need to use `$.get()` and `$.set()`

Signals alone are useless, unless you use them with effects, eg: `$.template_effect()`. The effect function takes in a callback function, and immediately calls it. For example,

```js
$.template_effect(() => console.log('Hello'));
```

will immediately call `console.log('Hello')`

Obviously, that alone wouldn't be useful.

The superpower of effect is that, it also tracks what are the signals value being read within the callback function. And whenever the signal value changes, the callback function will be called again.

So,

```js
$.template_effect(() => console.log($.get(name)));
```

Will print out the value of the signal `name` once, and also whenever the value of signal `name` changes.

Bring it back to our example, when we have:

```js
$.template_effect(() => $.set_text(text, `Hello ${$.get(name) ?? ''}`));
```

The effect will run `$.set_text()` whenever the value of signal `name` changes, to update the text content of the text node.

By the way, `$.set_text(text, '...')` is just the same as [`text.nodeValue = '...'`](#updating-text-value-in-a-text-node).

Now, putting it together, you'll see how running the App function once, will:

- clone new element instance from the template
- set up a template effect to update the text content of the text node whenever the value of signal `name` changes

Now we are one step closer to a complete reactive Svelte component.

### Adding event listeners

Let's now add an event listener

```svelte
<script>
  let name = $state('world');
  function update() {
    name = 'Svelte';
  }
</script>
<!-- highlight-next-line -->
<h1 onclick={update}>Hello {name}</h1>
```

and observe the compiled output:

```js
import * as $ from 'svelte/internal/client';

// highlight-start
function update(_, name) {
  $.set(name, 'Svelte');
}
// highlight-end

var root = $.from_html(`<h1> </h1>`);

export default function App($$anchor) {
  let name = $.state('world');
  var h1 = root();

  // highlight-next-line
  h1.__click = [update, name];
  // ...
}

// highlight-next-line
$.delegate(['click']);
```

Some observations:

- The `update` function is moved out of the `App` function,
- `h1.__click` is an array, `[update, name]`
- `$.delegate(['click'])` at the end of the file

#### Moving the `update` function out of the `App` function

This move is more of an optimisation.

From the Svelte component source code, we know that the `update` function will be added as a click event listener to `h1` element.

So, instead of re-declaring the `update` function for every instance of the `App` component, the `update` function is rewritten in the compiled output such that all it's scoped variables are passed in as arguments.

Because rewriting the `update` function this way, allows us to move the `update` function out of the `App` function, and only declare it once:

```js
function update() {
  // name is referenced from the scope
  $.set(name, 'Svelte');
}
// is rewritten as
function update(_, name) {
  // name is passed in as the 2nd argument
  $.set(name, 'Svelte');
}
```

Now, let's take a look at how the `update` function is added as a click event listener to the `h1` element.

#### __click and $.delegate

Now, this is also for optimisation.

The optimisation we're referring here is [the event delegation we mentioned earlier](#event-delegation).

To delegate the click event for the `h1` element to the document root, we write:

```js
$.delegate(['click']);
```

This adds a delegated click event listener to the document root.

But how does the delegated click event listener know which element and which event listener to call?

This is where the `__click` property comes in.

You can think of the delegated click event listener is roughly implemented as such:

```js
document.addEventListener('click', (event) => {
  let target = event.target;
  while (target !== document.body) {
    if (target.__click) {
      const [fn, ...args] = target.__click;
      fn(event, ...args);
      if (event.cancelBubble) {
        // if event.stopPropagation() is called,
        // stop going up the DOM tree
        break;
      }
    }
    // go up the DOM tree
    target = target.parentElement;
  }
});
```

The delegated click event listener will go up the DOM tree from the clicked element, and if any of the element has a `__click` property, it will call the function stored in the `__click` property, with the event and the arguments passed in.

Cool thing about event delegation is that, we do not need to re-register event listener when creating new App component instance, and unregister when unmounting and cleaning up, **because the same delegated click event listener works with however many elements and event listeners**.

### Putting it all together

Now, by this time, we have a complete reactive Svelte component, that has
- a reactive state,
- a click event listener, and
- an dynamic expression in the template

So, let's walk through the compiled code to see how the component is initialised, and how clicking on the `h1` element will update its text content.

**Let's start with initialising the `App` component:**

1. The code inside the `<script>` tag from the Svelte component is copied into the top of the `App` function
   - We start with initialising the reactive state `name` with `$.state('world')`
   - This creates a signal object, and the initial value is set to `'world'`
1. We create the DOM elements by cloning from the template via `$.from_html` and `root()`
1. We define click event listener via `h1.__click = [update, name]`
1. We get the reference to the text node inside the `h1` element via `$.child(h1)`
1. We define a template effect, via `$.template_effect` and set the text content of the text node to `'Hello world'`
   - As we read the value of the signal `name` inside the template effect, this template effect now tracks for the changes of the `name` signal
1. Finally, the `h1` element is appended to the document

**Now, let's see how clicking on the `h1` element will update its text content:**

1. When the `h1` element is clicked, the delegated click event listener will be called
1. The delegated click event listener finds the element with the `__click` property, and thus call the `update` function
1. The `update` function calls the `$.set()` function to update the value of the signal `name`
1. As the value of the signal `name` changes to `'Svelte'`, the template effect is being called
   - The template effect sets the text content of the text node to `'Hello Svelte'`
   - As we read the value of the signal `name` inside the template effect, the template effect tracks for the next changes of the `name` signal

**And that's how the text content of the `h1` element is updated to `'Hello Svelte'` upon clicked.**

## Closing Note

And that's the basic structure of the Svelte's 5 compiled output.

If you wish to know more, [follow me on Twitter](https://x.com/lihautan), and let me know what you think.

I've also did a talk on **Building your own Svelte 5 compiler** in CityJS New Delhi (too ambitious, I know), you can [watch the talk on YouTube](https://youtu.be/4uV27-OMJR8?si=3xfj7ZImahHOn24A&t=94).
