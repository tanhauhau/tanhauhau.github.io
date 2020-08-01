---
title: Retry asynchronous function using the callback pattern, promise chain and async await
date: '2020-06-21T08:00:00Z'
tags: 
  - JavaScript
  - Asynchronous
  - Problem Solving
description: How to retry asynchronous function using the callback pattern, promise chain and async await. Mental model for asynchronous JavaScript.
---

JavaScript is a single-threaded programming language, which means only one thing can happen at a time in a single thread.

That’s where asynchronous JavaScript comes into play. Using asynchronous JavaScript (such as callbacks, promises, and async/await), you can perform long network requests without blocking the main thread.

In this article, I'm going to show how you can retry an asynchronous function in JavaScript, using the callback pattern, promise chain pattern and async await. Also, I'll show you how to write test to verify it works.

## The callback pattern

Let's take a look at retrying asynchronous function that takes in a callback function that follows [the callback convention](https://gist.github.com/sunnycmf/b2ad4f80a3b627f04ff2):

- The first argument of the callback function is an error object
- The second argument contains the callback results.

```js
function callback(error, result) {
  // ...
}
```

So we are going to implement the `retry` function, that takes in the asynchronous function to retry, `fn` and a callback function, `cb`, that will be called when the function succeeded or failed after all the retry attempts.

```js
function retry(fn, cb) {
  //
}
```

The first thing we are going to do is to call the function `fn`:

```js
function retry(fn, cb) {
  // highlight-start
  fn(function(error, data) {
    //
  });
  // highlight-end
}
```

We check if there's an error, if there's no error, we can call the `cb` function to indicate the function succeeded. However, if there's an error, we are going to call the function again to retry.

```js
function retry(fn, cb) {
  fn(function(error, data) {
    // highlight-start
    if (!error) {
      cb(null, data);
    } else {
      fn(function(error, data) {
        //
      });
    }
    // highlight-end
  });
}
```

Let's retry at most 3 times:

```js
function retry(fn, cb) {
  // 1st attempt
  fn(function(error, data) {
    if (!error) {
      cb(null, data);
    } else {
      // 2nd attempt
      fn(function(error, data) {
        if (!error) {
          cb(null, data);
        } else {
          // 3rd attempt
          fn(function(error, data) {
            if (!error) {
              cb(null, data);
            } else {
              // failed for 3 times
              cb(new Error('Failed retrying 3 times'));
            }
          });
        }
      });
    }
  });
}
```

Notice that it starts to get unwieldy as we are nesting more callback functions. It's hard to figure out which close bracket `}` is belong to without proper indentation.

This is the so-called ["Callback Hell"](http://callbackhell.com/) in JavaScript.

Let's make it more unbearable to prove the point by flipping the if case:

```js
function retry(fn, cb) {
  // 1st attempt
  fn(function(error, data) {
    if (error) {
      // 2nd attempt
      fn(function(error, data) {
        if (error) {
          // 3rd attempt
          fn(function(error, data) {
            if (error) {
              // failed for 3 times
              cb(new Error('Failed retrying 3 times'));
            } else {
              cb(null, data);
            }
          });
        } else {
          cb(null, data);
        }
      });
    } else {
      cb(null, data);
    }
  });
}
```

Now can you tell which `data` is belong to which function?

Now, instead of always retry at most 3 times, we are going to retry at most `n` times.

So we are going to introduce a new argument, `n`:

```js
function retry(fn, n, cb) {
  // highlight-next-line
  let attempt = 0; // 1st attempt
  fn(function(error, data) {
    if (!error) {
      cb(null, data);
    } else {
      // highlight-start
      if (attempt++ === n) {
        cb(new Error(`Failed retrying ${n} times`));
      } else {
        // highlight-end
        // 2nd attempt
        fn(function(error, data) {
          if (!error) {
            cb(null, data);
          } else {
            // highlight-start
            if (attempt++ === n) {
              cb(new Error(`Failed retrying ${n} times`));
            } else {
              // highlight-end
              fn(/* this goes forever ...*/);
            }
          }
        });
      }
    }
  });
}
```

The function keeps going forever, until it reaches `n` attempt.

If you stare at the code hard enough, you would notice that the code starts to repeat itself:

![recursive pattern](./images/recursive.png)

Note that the code within the outer red square is the same as the code within the inner red square, which is the same as the inner inner red square ...

So, let's extract the code within the red square out into a function and replace the red squares with the function:

```js
function retry(fn, n, cb) {
  let attempt = 0;

  // highlight-start
  function _retry() {
    fn(function(error, data) {
      if (!error) {
        cb(null, data);
      } else {
        if (attempt++ === n) {
          cb(new Error(`Failed retrying ${n} times`));
        } else {
          _retry();
        }
      }
    });
  }

  _retry();
  // highlight-end
}
```

And there you go, retrying an asynchronous function with callback pattern.

Does it work? Well, we have to test it to verify it. Stay till the end to see how we are going to write unit test to verify it.

## The promise chain

A [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise), according to MDN, object represents the eventual completion of an asynchronous operation, and its resulting value.

A Promise object provides `.then` and `.catch` method, which takes in callback function to be called when the promise is resolved or rejected respectively. The `.then` and `.catch` method then returns a new Promise of the return value of the callback function.

```js
getPromiseA() // a promise
  .then(handleA) // returns a new promise
  .then(handleB); // returns another new promise

getPromiseB() // a promise
  .catch(handleA) // returns a new promise
  .catch(handleB); // returns another new promise
```

The chaining of `.then` and `.catch` is a common pattern, called [Promise chaining](https://www.javascripttutorial.net/es6/promise-chaining/).

Now, lets implement the `retry` function, which takes in the asynchronous function to retry, `fn` and return a promise, which resolved when the function succeeded or resolved after failing all the retry attempts.

```js
function retry(fn) {
  //
}
```

The first thing we are going to do is to call the function `fn`:

```js
function retry(fn) {
  // highlight-next-line
  fn(); // returns a promise
}
```

We need to retry calling `fn` again, if the first `fn` is rejected

```js
function retry(fn) {
  fn() // returns a promise
    // highlight-next-line
    .catch(() => fn()); // returns a new promise
}
```

If that new promise rejected again, we retry by calling `fn` again

```js
function retry(fn) {
  fn() // returns a promise (promise#1)
    .catch(() => fn()) // returns a new promise (promise#2)
    // highlight-next-line
    .catch(() => fn()); // returns yet a new promise (promise#3)
}
```

The last promise _(promise#3)_ will reject if the 3rd `fn()` attempt rejects, and resolve if any of the `fn()` attempts resolve.

The callback method within `.catch` will be called only when the previous `fn()` attempt rejects.

We are going to return a rejected promise with the error indicating max retries has met, if the last promise `(promise#3)` rejected, and a resolved promise with the result from `fn()`.

```js
function retry(fn) {
  const promise3 = fn() // returns a promise (promise#1)
    .catch(() => fn()) // returns a new promise (promise#2)
    .catch(() => fn()); // returns yet a new promise (promise#3)

  return promise3.then(
    data => data, // resolved with the result from `fn()`
    () => {
      // reject with the max retry error
      throw new Error('Failed retrying 3 times');
    }
  );
}
```

And we can make the code more concise, as the following two are equivalent, in terms of what is being resolved and rejected:

```js
promise3.then(
  data => data, // resolved with the result from `fn()`
  () => {
    // reject with the max retry error
    throw new Error('Failed retrying 3 times');
  }
);
// is equivalent to
promise3 // resolved with the result from `fn()`
  .catch(() => {
    // reject with the max retry error
    throw new Error('Failed retrying 3 times');
  });
```

Also, we can substitute the variable `promise3` with it's promise chain value:

```js
// prettier-ignore
function retry(fn) {
  // highlight-start
  return fn() // returns a promise (promise#1)
    .catch(() => fn()) // returns a new promise (promise#2)
    .catch(() => fn()) // returns yet a new promise (promise#3)
    // highlight-end
    .catch(() => {
      // reject with the max retry error
      throw new Error('Failed retrying 3 times');
    });
}
```

Now, instead of always retry at most 3 times, we are going to retry at most `n` times.

So we are going to introduce a new argument, `n`:

```js
// prettier-ignore
function retry(fn, n) {
  return fn() // attempt #1
    .catch(() => fn()) // attempt #2
    // ...
    .catch(() => fn()) // attempt #n
    .catch(() => { throw new Error(`Failed retrying ${n} times`); });
}
```

Instead of writing `.catch(() => fn())` `n` number of times, we can build the Promise up using a for loop.

**Assuming `n` is always greater or equal to 1,**

```js
function retry(fn, n) {
  let promise = fn();
  for (let i = 1; i < n; i++) {
    promise = promise.catch(() => fn());
  }
  promise.catch(() => {
    throw new Error(`Failed retrying ${n} times`);
  });
  return promise;
}
```

What if `n` is `0` or negative? We shouldn't call `fn()` at all!

```js
function retry(fn, n) {
  let promise;
  for (let i = 0; i < n; i++) {
    // highlight-start
    if (!promise) promise = fn();
    else promise = promise.catch(() => fn());
    // highlight-end
  }
  promise.catch(() => {
    throw new Error(`Failed retrying ${n} times`);
  });
  return promise;
}
```

Well, this maybe a little bit inelegant, having to execute the `if (!promise) ... else ...` on every loop, we can initialise the promise with a rejected promise, so that we can treat the 1st `fn()` called as the 1st retry:

```js
function retry(fn, n) {
  // highlight-next-line
  let promise = Promise.reject();
  for (let i = 0; i < n; i++) {
    // highlight-next-line
    promise = promise.catch(() => fn());
  }
  promise.catch(() => {
    throw new Error(`Failed retrying ${n} times`);
  });
  return promise;
}
```

And there you go, retrying an asynchronous function with promise chain.

## Async await

When you use a promise, you need to use `.then` to get the resolved value, and that happened asynchronously.

Meaning, if you have

```js
let value;
promise.then(data => {
  value = data;
  console.log('resolved', value);
});
console.log('here', value);
```

You would see

```js
"here" undefined
```

first, and then some time later,

```js
"resolved" "value"
```

This is because the function in the `.then` is called asynchronously, it is executed in a separate timeline of execution, so to speak.

And `async` + `await` in JavaScript allow us to stitch multiple separate timeline of execution into disguisedly 1 timeline of execution flow.

Everytime when we `await`, we jump into a different asynchronous timeline.

So, with the code with Promise + `.then`:

```js
function foo() {
  // timeline #1
  promise
    .then(data => {
      // timeline #2
      return doSomething(data);
    })
    .then(data2 => {
      // timeline #3
      doAnotherThing(data2);
    });
  // timeline #1
}
```

can be written in `async` + `await` in the following manner:

```js
async function foo() {
  // timeline #1
  let data = await promise;
  // timeline #2
  let data2 = await doSomething(data);
  // timeline #3
  doAnotherThing(data2);
}
```

Now, lets implement the `retry` function using `async` + `await`.

```js
async function retry(fn) {
  //
}
```

The first thing we are going to do is to call the function `fn`:

```js
async function retry(fn) {
  // highlight-next-line
  fn(); // returns a promise
}
```

We need to retry calling `fn` again, if the first `fn` is rejected. Instead of `.catch`, we use `await` + `try catch`

```js
async function retry(fn) {
  // highlight-next-line
  try {
    await fn();
    // highlight-start
  } catch {
    fn();
  }
  // highlight-end
}
```

If the 2nd `fn()` rejected again, we retry by calling `fn` again

```js
async function retry(fn) {
  try {
    await fn();
  } catch {
    // highlight-start
    try {
      await fn();
    } catch {
      fn();
    }
    // highlight-end
  }
}
```

And if the last `fn()` rejected again, we are going to return a rejected promise with an error indicating max retries has met by throw the error

```js
async function retry(fn) {
  try {
    await fn();
  } catch {
    try {
      await fn();
    } catch {
      try {
        await fn();
      } catch {
        // highlight-next-line
        throw new Error('Failed retrying 3 times');
      }
    }
  }
}
```

Now, if we need to return a Promise resolved with the resolved value from `fn()`

```js
async function retry(fn) {
  try {
    // highlight-next-line
    return await fn();
  } catch {
    try {
      // highlight-next-line
      return await fn();
    } catch {
      try {
        // highlight-next-line
        return await fn();
      } catch {
        throw new Error('Failed retrying 3 times');
      }
    }
  }
}
```

Since we are ending early in the `try` block, and we are not using the error from the `catch` block, we can make the code less nested

```js
async function retry(fn) {
  try {
    return await fn();
  } catch {}

  try {
    return await fn();
  } catch {}

  try {
    return await fn();
  } catch {}

  throw new Error('Failed retrying 3 times');
}
```

Now, instead of always retry at most 3 times, we are going to retry at most `n` times.

So we are going to introduce a new argument, `n`:

```js
async function retry(fn, n) {
  try {
    return await fn(); // 1st attempt
  } catch {}

  try {
    return await fn(); // 2nd attempt
  } catch {}

  // ...

  try {
    return await fn(); // nth attempt
  } catch {}

  throw new Error(`Failed retrying ${n} times`);
}
```

Instead of writing it `n` number of times, we can achieve it using a `for` loop:

```js
async function retry(fn, n) {
  for (let i = 0; i < n; i++) {
    try {
      return await fn();
    } catch {}
  }

  throw new Error(`Failed retrying ${n} times`);
}
```

And there you go, retrying an asynchronous function using `async` + `await`.

## Testing

To test whether our `retry` function works, we need to have a max number of retry in mind, say 3. And we need a function, `fn` that we can control when it succeed and when it failed.

So we can have the following test cases:

- `fn` always succeed;
  - verify `fn` get called only 1 time
  - verify we get the return value from the 1st attempt
- `fn` failed on 1st attempt, and succeed thereafter;
  - verify `fn` get called only 2 times
  - verify we get the return value from the 2nd attempt
- `fn` failed on 1st, 2nd attempt, and succeed thereafter;
  - verify `fn` get called only 3 times
  - verify we get the return value from the 3rd attempt
- `fn` failed on 1st, 2nd, 3rd attempt, and succeed thereafter;
  - verify `fn` get called only 3 times
  - verify we get the max retry error

So, the key is to devise such `fn` that we can control when it succeed and when it failed.

We can create a function that returns such function

```js
function mockFnFactory() {
  return function() {};
}
```

The function takes in number indicating how many time the return function would fail, before succeeding thereafter

```js
// highlight-next-line
function mockFnFactory(numFailure) {
  return function() {};
}
```

To know how many times the function is called, we can track it with a variable

```js
function mockFnFactory(numFailure) {
  // highlight-next-line
  let numCalls = 0;
  return function() {
    // highlight-next-line
    numCalls++;
  };
}
```

As long as the number of times called is less than the number of time it should fail, it will fail.

```js
// calback version
function mockFnFactory(numFailure) {
  let numCalls = 0;
  return function(callback) {
    numCalls++;
    if (numCalls <= numFailure) {
      callback(new Error());
    } else {
      callback(null, numCalls);
    }
  };
}

// promise version
function mockFnFactory(numFailure) {
  let numCalls = 0;
  return function(callback) {
    numCalls++;
    if (numCalls <= numFailure) {
      return Promise.reject(new Error());
    } else {
      return Promise.resolve(numCalls);
    }
  };
}
```

Next, to verify the function get called a certain number of times, we can create a "spy" function:

```js
function spy(fn) {
  let numCalled = 0;
  return {
    fn: function(...args) {
      numCalled++;
      return fn(...args);
    },
    getNumberOfTimesCalled() {
      return numCalled;
    },
  };
}
```

So, let's put all of them together:

```js
describe('`fn` failed on 1st attempt, and succeed thereafter (callback based)', () => {
  const fn = mockFnFactory(1);
  const spied = spy(fn);

  // retry at most 3 times
  retry(spied.fn, 3, (error, data) => {
    // verify `fn` get called only 2 times
    assert(spied.getNumberOfTimesCalled() === 2);

    // verify we get the return value from the 2nd attempt
    assert(data === 2);
  });
});

describe('`fn` failed on 1st attempt, and succeed thereafter (promise based)', () => {
  const fn = mockFnFactory(1);
  const spied = spy(fn);

  // retry at most 3 times
  retry(spied.fn, 3).then(
    data => {
      // verify `fn` get called only 2 times
      assert(spied.getNumberOfTimesCalled() === 2);

      // verify we get the return value from the 2nd attempt
      assert(data === 2);
    },
    error => {}
  );
});
```

## Closing Note

We've seen how we can retry an asynchronous function using the callback pattern, promise chain pattern and `async` + `await`.

Each of the 3 methods is important in its on right, albeit some is more verbose than another.

Lastly, we also cover how to write test to verify our code, and also how to create the mock function to facilitate our test cases.