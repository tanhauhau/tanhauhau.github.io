---
title: 'Reactivity in Web Frameworks (Part 2)'
date: '2020-03-05T08:00:00Z'
description: 'Reactivity is the ability of a web framework to update your view whenever the application state has changed. How do web frameworks achieve reactivity?'
wip: true
label: blog
---

## What is Reactivity?

Reactivity is the ability of a web framework to update your view whenever the application state has changed.

It is the core of any modern web framework.

To achieve reactivity, the framework has to answer 2 questions

- When does the application state change?
- What has the application state changed?

In [Part 1](/reactivity-in-web-frameworks-the-when), I started with a counter app example.

```js
function App() {
  const [counter, setCounter] = React.useState(0);
  return (
    <div>
      <button onClick={() => setCounter(counter => counter - 1)}>-</button>
      <span>{counter}</span>
      <button onClick={() => setCounter(counter => counter + 1)}>+</button>
    </div>
  );
}
```

and I talked about different strategies framework used to know when does the application state change.

**- [Mutation Tracking](/reactivity-in-web-frameworks-the-when#mutation-tracking)**

Using [ES6 Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy), or before that, Object getters and setters, to determine when the application state has changed.

**- [Just call `scheduleUpdate`](/reactivity-in-web-frameworks-the-when#just-call-schedule-update)**

Provide APIs that indirectly calls `scheduleUpdate`

**- [Static Analysis](/reactivity-in-web-frameworks-the-when#static-analysis)**

Analyse the code statically, and insert `scheduleUpdate` into the code right after assignments.

After knowing that the application state has change, the framework will then proceed to update the view.

But, how?

The framework needs to figure out **what needs to be updated**, so that the framework will only update the part of the view that needs to be changed.

Without knowing what needs to be updated, the quickest and dirtiest way of updating the view would be to destroy and recreate everything:

```js
function update(root, applicationState) {
  // destroy everything
  root.innerHTML = '';
  // ...and rebuild
  const newElement = buildUi(applicationState);
  root.appendChild(newElement);
}

// building the counter app
function buildUi({ counter }) {
  const div = document.createElement('div');

  const button1 = document.createElement('button');
  button1.textContent = '-';
  div.append(button1);

  const span = document.createElement('span');
  span.textContent = counter;
  div.append(span);

  const button2 = document.createElement('button');
  button2.textContent = '+';
  div.append(button2);

  return div;
}
```

The drawbacks of this method are

#### - Losing element state

We will lose the state of the element, such as:
- input focus
- text highlight
- active state
- ...

if we didnt preserve them before destroying them.

#### - Cost of creating DOM elements

It is much costly to recreate all the DOM elements needed instead of reuse and update the existing DOM elements.


@@@@@@@@@@@@


Now let's 

framework needs to know **what has changed** and then based on that, figure out **what needs to be updated**.



@@@@@@@@@@@@



Different **"templating" strategies** and [WHEN strategies](/reactivity-in-web-frameworks-the-when#the-when) give the framework varying amount of information in terms of **what has changed** and **what needs to be updated**.

We can put that variance in the amount of information into a spectrum.

### Framework knows nothing about what has changed

At one end, our framework **knows nothing about what has changed**. To update the application without knowing what has change, the quickest and dirtiest mechanism would be to recreate everything.



However that would come with costs:

- losing focus
- cost of creating new elements, DOM manipulations

So, a more well-thought mechanism is to create a intermediate representation of the UI. Instead of tearing down and recreate every DOM element everytime when there's an update, we compare the latest intermediate representation with the previous one, figure out the difference between the two representations and generate a list of operations needed to patch the DOM.

```js
let previousUi = null;
function update(root, applicationState) {
  const newUi = buildIntermediateUi(applicationState);
  const operationsNeeded = diff(newUi, previousUi);
  operationsNeeded.forEach(runOperation);
  // keep for comparison in the next update
  previousUi = newUi;
}

// building the counter app
function buildIntermediateUi({ counter }) {
  return {
    element: 'div',
    children: [
      {
        element: 'button',
        text: '-',
      },
      {
        element: 'span',
        text: counter,
      },
      {
        element: 'button',
        text: '+',
      },
    ],
  };
}
```

By finding the differences between the new and old representations, framework figures out **what needs to be updated** without knowing **what has changed**.

The main advantage of this mechanism is that, the intermediate representation is way cheaper to create and manipulate.

### Framework knows exactly what has changed and what needs to be updated

On the other extreme end of the spectrum, framework knows exactly what has changed and what needs to be updated.

This is the most efficient way of updating the UI, where everything needed by the framework has already been figured out. So the only thing the framework needs to do is to apply those updates to the DOM.

```js
function update(root, changes) {
  applyChanges(root, changes);
}

// an example of apply changes for the counter app
function applyChanges(root, changes) {
  // update span's text if `counter` changed
  if ('counter' in changes) {
    root.querySelector('span').textContent = changes.counter;
  }
}
```

### The Component Model

TODO:

Components With component model, we can break the application up into is composed with components.

So, if the framework is able to figure out what needs to be updated early on, then , the more efficient it is (without having to figure out what needs to be updated later on)
decides whether the framework 

Different "templating" strategies and [WHEN strategies

<!-- 

The amount of information that the framework has There are 2 extreme ends of the spectrum of how much does the framework knows about the change in the application state,

The granularity of the information will be the main theme of this article.

The scale would be

- Knowing some application state has changed, but don't know what
- Knowing some application state has changed, don't know what but know that they all belong to a component
- Knowing specific part of the application state has changed

Which leads to

- No idea what needs to be updated, have to recreate everything
- No idea what needs to be updated, but know that they belong to a component, recreate the component
- Know specific elements need to be updated, update them -->
