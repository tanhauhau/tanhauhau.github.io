---
title: Who accessed my property?
date: '2019-03-24T08:00:00Z'
description: 'How to know when object property get accessed or modified'
---

Say you defined an object `const obj = { awesome: true }` so that anywhere within your code, you can access the value of `obj.awesome` as well as modify its value via `obj.awesome = false`.

**Question**: How do you know where and when `obj.awesome` is being accessed or modified?

---

**So why is this important?** If you are using frontend framework that does [2-way binding](https://stackoverflow.com/a/13504965), eg: [Angular](https://angular.io/guide/ajs-quick-reference#ng-model), [Vue](https://vuejs.org/v2/guide/forms.html), do you know how does the framework “watch” your `state` object? How does the framework knows when to update your DOM when you set some property of the `state` object?

```js
// setting a property in the `$scope` object triggers
// the framework to update the model and the DOM
$scope.name = 'Hello';
```

---

**Answer:** You use [`Object.defineProperty()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty).

`Object.defineProperty(obj, prop, descriptor)` allows us to define a property to an object with a descriptor for the property being defined.

Well, nothing special about defining a property of an object, you can do it easily with `obj[prop] = value`. What so special about this `Object.defineProperty()` is the `descriptor` object that you pass in. Lets' take a look at what can be configured through the `descriptor`:

- `enumerable`

  `true` if and only if this property shows up during enumeration of the properties on the corresponding object.

  **Defaults to `false`**.

  If you have a property's `enumerable` set to `false`, meaning you will not see the property when you do `Object.keys(obj)` or `for (const key in obj) { ... }`

- `writable`

  `true` if and only if the value associated with the property may be changed with an assignment operator.

  **Defaults to `false`**

  This allows us to create `read-only` property of an object.

- `get`

  A function which serves as a getter for the property, or `undefined` if there is no getter. The return value will be used as the value of the property.

  **Defaults to `undefined`**

- `set`

  A function which serves as a setter for the property, or `undefined` if there is no setter. When the property is assigned to, this function is called with one argument (the value being assigned to the property).

  **Defaults to `undefined`**

So, there you have it. What you need is to define the getter and setter function of the property, and they will be called when the property is accessed or being assigned to a value.

You can add a breakpoint via [`debugger;`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger) in your getter and setter function, to invoke the debugging feature of your development tools to look at the call stack.

Another way of looking at the call stack without using a debugger is to **throw an Error** in the getter and setter function.

Yes. You hear me right. Throwing an error will allow you to get the call stack when the error is thrown:

```js
let _value;
Object.defineProperty(obj, 'awesome', {
  get: () => {
    // highlight-start
    try {
      // intentionally throw an Error to get the call stack
      throw new Error();
    } catch (error) {
      // stack is the stack trace, 
      // containing error message and the stack
      const stack = error.stack;
      // print the callee stack
      console.log(
        stack
          .split('\n')
          .slice(2)
          .join('\n')
      );
    }
    // highlight-end
    return _value;
  },
});
```
