---
title: 'Reactivity in Web Frameworks (Part 1)'
date: '2020-01-05T08:00:00Z'
lastUpdated: '2020-01-08T08:00:00Z'
description: 'Reactivity is the ability of a web framework to update your view whenever the application state has changed. How do web frameworks achieve reactivity?'
---

# What is Reactivity?

Reactivity is the ability of a web framework to update your view whenever the application state has changed.

It is the core of any modern web framework.

To understand what reactivity is, let’s look at an example counter app.

This is how you would write in plain JavaScript:

```js
const root = document.getElementById('app');
root.innerHTML = `
  <button>-</button>
  <span>0</span>
  <button>+</button>
`;

const [decrementBtn, incrementBtn] = root.querySelectorAll('button');
const span = root.querySelector('span');
let count = 0;
decrementBtn.addEventListener('click', () => {
  count--;
  span.innerText = count;
});
incrementBtn.addEventListener('click', () => {
  count++;
  span.innerText = count;
});
```

This is how you would do it in Vue:

```html
<template>
  <div>
    <button v-on:click="counter -= 1">-</button>
    <span>{{ counter }}</span>
    <button v-on:click="counter += 1">+</button>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        counter: 0,
      };
    },
  };
</script>
```

… and this in React:

```js
function App() {
  const [counter, setCounter] = React.useState(0);
  return (
    <>
      <button onClick={() => setCounter(counter => counter - 1)}>-</button>
      <span>{counter}</span>
      <button onClick={() => setCounter(counter => counter + 1)}>+</button>
    </>
  );
}
```

Notice that with a web framework, your code focus more on _<u>updating the application state based on business requirements</u>_ and _<u>describing how our view looks like using templating language or JSX expression</u>_.
The framework will bridge the application state and the view, updating the view whenever the application state changes.

No more pesky DOM manipulation statements (`span.innerText = counter`) sprinkled alongside with state update statements (`counter ++;`). No more elusive bugs of unsynchronized view and application state, when one forgets to update the view when updating the application state.

All these problems are now past tense when web frameworks now ship in reactivity by default, always making sure that the view is up to date of the application state changes.

<!-- (it's been a while since the last time I read an article about MVC/MVVM pattern) -->

So the main idea we are going to discuss next is,

> How do web frameworks achieve reactivity?

# The WHEN and the WHAT

To achieve reactivity, the framework has to answer 2 questions

- When does the application state change?
- What has the application state changed?

**The WHEN** answers when the framework needs to start to do its job on updating the view. Knowing **the WHAT**, allows the framework to optimise it's work, only update part of the view that has changed.

We are going to discuss different strategies to determine **the WHEN** and **the WHAT**, along with code snippets for each strategy. You could combine different strategies to determine **the WHEN** and **the WHAT**, yet certain combinations may remind you of some of the popular web frameworks.

## the WHEN

The WHEN notifies the framework that the application state has changed, so that the framework knows that it needs to do its job to update the view.

Different frameworks employ different strategies to detect when the application state has changed, but in essence, it usually boils down to calling a `scheduleUpdate()` in the framework.
`scheduleUpdate` is usually a debounced `update` function of the framework. Because changes in the application state may cause derived state changes, or the framework user may change different parts of the application state consecutively. If the framework updates the view on every state change, it may change the view too frequent, which may be inefficient, or it may have an inconsistent view ([may result in tearing](https://techterms.com/definition/screen_tearing)).

Imagine this contrived React example:

```js
function Todos() {
  const [todos, setTodos] = useState([]);
  const [totalTodos, setTotalTodos] = useState(0);

  const onAddTodo = todo => {
    setTodos(todos => [...todos, todo]);
    setTotalTodos(totalTodos => totalTodos + 1);
  };
  // ...
}
```

If the framework synchronously updates the todos in the view then updates the total todos count, it may have a split second where the todos and the count go out of sync. _(Although it may seem impossible even in this contrived example, but you get the point. )_

> By the way, you should not set `totalTodos` this way, you should derived it from `todos.length`, see ["Don't Sync State. Derive it!" by Kent C. Dodds.](https://kentcdodds.com/blog/dont-sync-state-derive-it)

So how do you know when the application state has changed?

## Mutation Tracking

So we want to know when the application state has changed? Let’s track it!

First of all, why is it called mutation tracking? That’s because we can only track mutation.

By the word mutation, it infers that our application state has to be an object, because you can’t mutate a primitive.

Primitives like numbers, string, boolean, are passed by value into a function. So, if you reassign the primitive to another value, the reassignment will never be able to be observed within the function:

```js
let data = 1;
render(data);
// changes to the data will not be propagated into the render function
data = 2;

function render(data) {
  // data is a value
  // however it is changed in the outside world
  // got nothing to do with me
  setInterval(() => {
    console.log(data); // will always console out `1`
  }, 1000);
}
```

Object on the other hand, is passed by reference. So any changes to the same object can be observed from within:

```js
let data = { foo: 1 };
render(data);
// mutate data some time later
setTimeout(() => {
  data.foo = 2;
}, 1000);

function render(data) {
  // data is referenced to the same object
  // changes to data.foo can be observed here
  setInterval(() => {
    console.log(data.foo); // initially `1`, after mutation, its `2`
  }, 1000);
}
```

This is also why most frameworks’ application state is accessed via `this`, because `this` is an object, changes to `this.appState` can be observed / tracked by the framework.

Now we understand why is it called mutation tracking, let’s take a look at how mutation tracking is implemented.

We are going to look at the two common types of object in JavaScript, the plain object and the array.

_(Though if you `typeof` for both object or array, they are both `"object"`)_.

With the introduction of ES6 Proxy, the mutation tracking method has become much straightforward. But still, let’s take a look at how you can implement a mutation tracking with / without ES6 Proxy.

### Prior Proxy

To track mutation without proxy, we can define a custom getters and setters for all the property of the object. So whenever the framework user changes the value of a property, the custom setter will be called, and we will know that something has changed:

```js
function getTrackableObject(obj) {
  if (obj[Symbol.for('isTracked')]) return obj;
  const tracked = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    Object.defineProperty(tracked, key, {
      configurable: true,
      enumerable: true,
      get() {
        return obj[key];
      },
      set(value) {
        if (typeof value === 'object') {
          value = getTrackableObject(value);
        }
        obj[key] = value;
        console.log(`'${key}' has changed.`);
      },
    });
  }
  // marked as 'tracked'
  Object.defineProperty(tracked, Symbol.for('isTracked'), {
    configurable: false,
    enumerable: false,
    value: true,
  });
  return tracked;
}

// track app state
const appState = getTrackableObject({ foo: 1 });
appState.foo = 3; // log `'foo' has changed.`
```

Inspired by [Vue.js 2.0’s observer](https://paper.dropbox.com/doc/Reactivity-in-Web-Frameworks--Aroey0wh9iZRE8dm9lC4Ulo0AQ-D6CkkTTpH1AqGvBlKcQ85).

However, you may notice that if we are defining getters and setters on the existing properties of the object, we may miss out changes via adding or deleting property from the object.

This is something you can’t fix without a better JavaScript API, so a probable workaround for this caveat is to provide a helper function instead. For example, in Vue, you need to use the helper function [`Vue.set(object, propertyName, value)`](https://vuejs.org/v2/guide/reactivity.html#Change-Detection-Caveats) instead of `object[propertyName] = value`.

Tracking mutation of an array is similar to mutation tracking for an object. However, besides being able to change the array item through assignment, it is possible to mutate an array through its mutating method, eg: `push`, `pop`, `splice`, `unshift`, `shift`, `sort` and `reverse`.

To track changes made by these methods, you have to patch them:

```js
const TrackableArrayProto = Object.create(Array.prototype);
for (const method of [
  'push',
  'pop',
  'splice',
  'unshift',
  'shift',
  'sort',
  'reverse',
]) {
  const original = Array.prototype[method];
  TrackableArrayProto[method] = function() {
    const result = original.apply(this, arguments);
    console.log(`'${method}' was called`);
    if (method === 'push' || method === 'unshift' || method === 'splice') {
      // TODO track newly added item too!
    }
    return result;
  };
}
function getTrackableArray(arr) {
  const trackedArray = getTrackableObject(arr);
  // set the prototype to the patched prototype
  trackedArray.__proto__ = TrackableArrayProto;
  return trackedArray;
}

// track app state
const appState = getTrackableArray([1, 2, 3]);
appState.push(4); // log `'push' was called.`
appState[0] = 'foo'; // log `'0' has changed.
```

Inspired by [Vue.js 2.0’s array observer](https://github.com/vuejs/vue/blob/22790b250cd5239a8379b4ec8cc3a9b570dac4bc/src/core/observer/array.js).

> CodeSandbox for [mutation tracking of object and array](https://codesandbox.io/s/mutation-tracking-getterssetters-44ono)

In summary, to track mutation on an object or array without Proxy, you need to define custom getters/setters for all properties, so that you can capture when the property is being set. Besides that, you need to patch all the mutating methods as well, because that will mutate your object without triggering the custom setter.

Yet, there’s still edge cases that cannot be covered, such as adding new property or deleting property.

There’s where [ES6 Proxy](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy) comes to help.

### With Proxy

Proxy allow us to define custom behaviours on fundamental operations on the target object. This is great for mutation tracking, because Proxy allow us to intercept setting and deleting property, irrelevant to whether we uses index assignment, `obj[key] = value` or mutating methods, `obj.push(value)`:

```js
function getTrackableObject(obj) {
  for (const key in obj) {
    if (typeof obj[key] === 'object') {
      obj[key] = getTrackableObject(obj[key]);
    }
  }
  return new Proxy(obj, {
    set: function(target, key, value) {
      console.log(`'${key}' has changed`);
      if (typeof value === 'object') {
        value = getTrackableObject(value);
      }
      return (target[key] = value);
    },
    deleteProperty: function(target, key) {
      console.log(`'${key}' was deleted`);
      return delete target[key];
    },
  });
}

const appState = getTrackableObject({ foo: 1, bar: [2, 3] });
appState.foo = 3; // log `'foo' has changed.`
appState.bar.push(4); // log `'2' has changed.`, `'length' has changed`
appState.bar[0] = 'foo'; // log `'0' has changed.
```

**So how do we use mutation tracking?**

The good thing about mutation tracking is that, if you noticed in the example above, the framework user is unaware of the tracking and treats `appState` as a normal object:

```js
appState.foo = 3;
appState.bar.push(4);
appState.bar[0] = 'foo';
```

We can set up the tracking during the initialisation of the component, either:

- track a property of the component,
- track the component instance itself,
- or something in between the above

```js
// track a property of the component
class Component {
  constructor(initialState) {
    this.state = getTrackableObject(initialState);
  }
}
class UserComponent extends Component {
  constructor() {
    super({ foo: 1 });
  }
  someHandler() {
    this.state.foo = 2; // Log `'foo' has changed`
    this.other.foo = 2; // Does not track this
  }
}

// track the component instance itself
class Component {
  constructor() {
    return getTrackableObject(this);
  }
}

class UserComponent extends Component {
  constructor() {
    super();
  }
  someHandler() {
    this.foo = 1; // Log `'foo' has changed`
  }
}
```

Once you’ve able to track application state changes, the next thing to do is to call `scheduleUpdate` instead of `console.log`.

You may concern whether all these complexities is worth the effort. Or you may be worried that [Proxy is not supported to older browsers](https://caniuse.com/#feat=proxy).

Your concern is not entirely baseless. Not all frameworks use mutation tracking.

### Just call `scheduleUpdate`

Some frameworks design their API in the way such that it “tricks” the framework user to tell the framework that the application state has changed.

Instead of remembering to call `scheduleUpdate` whenever you change the application state, the framework forces you to use their API to change application state:

```js
// instead of
this.appState.one = '1';
scheduleUpdate();

// you have to use the frameworks API
this.setAppState({ one: '1' });
```

This gives us a much simpler design and less edge case to handle:

```js
class Component {
  setAppState(appState) {
    this.appState = appState;
    scheduleUpdate();
  }
}
```

Inspired by [React’s `setState`](https://github.com/facebook/react/blob/0cf22a56a18790ef34c71bef14f64695c0498619/packages/react/src/ReactBaseClasses.js#L57).

However, this may trip new developers into the framework:

```js
class MyComponent extends Component {
  someHandler() {
    // if setting the state directly, instead of calling `setAppState`
    // this will not schedule an update, and thus no reactivity
    this.appState.one = '1';
  }
}
```

... and it maybe a bit clumsy when adding / removing items from an array:

```js
class MyComponent extends Component {
  someHandler() {
    // this will not schedule update
    this.appState.list.push('one');
    // you need to call setAppState after the .push()
    this.setAppState({ list: this.appState.list });

    // or instead, for a one-liner
    this.setAppState({ list: [...this.appState.list, 'one'] });
  }
}
```

A different approach that may have the best of both world is to insert `scheduleUpdate` in scenarios that you think that changes may most likely happen:

- Event handlers
- Timeout (eg: `setTimeout`, `setInterval`, ...)
- API handling, promises handling
- ...

So, instead of enforcing framework users to use `setAppState()`, framework users should use the
custom timeouts, api handlers, ...:

```js
function timeout(fn, delay) {
  setTimeout(() => {
    fn();
    scheduleUpdate();
  }, delay);
}
// user code
import { $timeout } from 'my-custom-framework';

class UserComponent extends Component {
  someHandler() {
    // will schedule update after the callback fires.
    $timeout(() => {
      this.appState.one = '1';
    }, 1000);

    setTimeout(() => {
      // this will not schedule update
      this.appState.two = '2';
    }, 1000);
  }
}
```

Inspired by [AngularJS’s \$timeout](https://github.com/angular/angular.js/blob/master/src/ng/timeout.js#L13)

Your framework user can now be free to change the application state the way he wants, as long as the changes are done within your custom handlers. Because at the end of the handler, you will call `scheduleUpdate()`.

Similarly, this may trip new developers into the framework too! Try search ["AngularJS $timeout vs window.setTimeout"](https://www.google.com/search?q=angularjs%20$timeout%20vs%20window.setTimeout)

You may think, what if there are no state changes in the handler function, wouldn’t calling an extra `scheduleUpdate()` be inefficient? Well so far, we haven’t discussed what’s happening in `scheduleUpdate()`, we can check **what has changed** (which will be covered in the next section)**,** and if there’s nothing change, we can skip the subsequent steps.

If you look at the strategies that we have tried so far, you may have noticed a common struggle:

- allow framework user to change the application state in any way he wants
- achieve reactivity without much runtime complexity.

At this point, you got to agree that enforcing framework developers to call `setAppState` whenever they want to change the application state, requires **less runtime complexity** from the framework, and it’s unlikely to have any corner cases or caveats that need to handle.

If the dilemma is between developer expressiveness versus runtime complexity, probably we could get the best of both worlds by shifting the complexity from runtime to build time?

### Static analysis

If we have a compiler that allow framework users to write:

```js
class UserComponent {
  someHandler() {
    this.appState.one = '1';
  }
}
```

and compiles it to:

```js
class UserComponent {
  someHandler() {
    this.appState.one = '1';
    scheduleUpdate(); // <-- insert this during compilation
  }
}
```

Then, we would really have best of both worlds! 😎

Let’s look at different scenarios that the framework user would write, and see whether we know when to insert the `scheduleUpdate()`:

```js
class UserComponent {
  someHandler() {
    this.appState.one = '1'; // <-- ✅changes to application state
    this.foo = 'bar'; // <-- ⛔️ not changing application state

    const foo = this.appState;
    foo.one = '1'; // 🤷‍♂️do we know that this is changing application state?

    doSomethingMutable(this.appState);
    function doSomethingMutable(foo) {
      foo.one = '1'; // 🤷‍♂️do we know that this is changing application state?
    }

    this.appState.obj = {
      data: 1,
      increment() {
        this.data = this.data + 1; // 🤷‍♂️do we know that this is changing application state?
      },
    };
    this.appState.obj.increment();

    this.appState.data.push('1'); // 🤷‍♂️is push mutable?
    this.appState.list = {
      push(item) {
        console.log('nothing change');
      },
    };
    this.appState.list.push('1'); // 🤷‍♂️is this push mutable?
  }
}
```

Allow me to summarise some complexities faced in the example above:

- It is easy to track direct changes to the application state, but it is extremely difficult to track changes made indirectly, eg: `foo.one`, `doSomethingMutable(this.appState)` or `this.appState.obj.increment()`
- It is easy to track changes through assignment statements, but extremely difficult to track changes made through mutating methods, eg: `this.appState.list.push('1')`, I mean how do you know the method is mutating?

So, for [Svelte](http://github.com/sveltejs/svelte), one of the frameworks that use static analysis to achieve reactivity, it only ensures reactivity through assignment operators (eg: `=`, `+=`, …) and unary arithmetic operators (eg: `++` and `--`).

I believe that there’s room yet to be explored in this space, especially at the [rise of TypeScript](https://2019.stateofjs.com/javascript-flavors/typescript/), we may be able to understand our application state better through static types.

## Summary

We’ve gone through different strategies of knowing when the application state has changed:

- mutation tracking
- just call `scheduleUpdate`
- static analysis

Different strategies manifests itself in terms of the API of the framework:

- Is the framework user going to change the application state with simple object manipulation? or have to use API like `setAppState()`?
- Is there caveats that the framework user needs to be aware of?

  For example:

  - Can only use assignment statement to achieve reactivity?
  - Does framework user need to use a helper function for adding new reactive property to the application state?

Knowing when an application state has changed, allow frameworks to know when to update our view. Yet, to optimise the updates, frameworks need to know what has changed in the application state.

Are we going to remove and recreate every DOM element in the view? Do we know that which part of the view is going to change based on what has changed in the application state?

That is, if we know **the WHAT**.

---

I’d like to thank [Rich Harris](https://twitter.com/Rich_Harris) for pointing out some inaccuracies in the previous version of this article and providing valuable feedbacks. All the remaining errors are mine..