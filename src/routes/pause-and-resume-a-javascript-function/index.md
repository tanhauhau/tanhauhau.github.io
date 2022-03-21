---
title: Pause and resume a JavaScript function
date: '2019-12-09T08:00:00Z'
description: A thought experiment on how you can pause and resume the execution of a JavaScript function
tags: 
  - JavaScript
  - React
label: blog
---

## Asynchronous JavaScript

In JavaScript, IO (eg Filesystem IO, Network IO) is **asynchronous**. That means when you are calling a function that involves IO, you got to have a callback function passed in to be notified when the IO is done.

```js
function getWeddingDetail(itemId, callback) {
  // call IO
  window.fetch(`https://api.com/wedding/${itemId}`, function callback(
    error,
    wedding
  ) {
    // get notified when the result is back
    if (error) {
      handleError(error);
    } else {
      callback(wedding);
    }
  });
}
```

It may seemed innocent at first, but once we start to chain multiple asynchronous calls, we end up in a situation known as the **callback hell**, which without a doubt, is something really not nice to work with:

```js
function getProfile(userId, callback) {
  return window.fetch(`https://api.com/user/${userId}`, callback);
}

function getWeddingDetail(itemId, callback) {
  // call IO
  window.fetch(`https://api.com/wedding/${itemId}`, function callback(
    error,
    wedding
  ) {
    // get notified when the result is back
    if (error) {
      handleError(error);
    } else {
      getProfile(wedding.groomId, function(groomError, groom) {
        if (groomError) {
          handleError(groomError);
        } else {
          getProfile(wedding.brideId, function(brideError, bride) {
            if (brideError) {
              handleError(brideError);
            } else {
              callback({ wedding, bride, groom });
            }
          });
        }
      });
    }
  });
}
```

So we came up with [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) and [`async-await`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function), to make life easier.

`async-await` allows us to write asynchronous code like a synchronous one, using `await`, you can pause the function, wait for the IO, and continue the execution.

```js
function getProfile(userId) {
  return window.fetch(`https://api.com/user/${userId}`);
}

async function getWeddingDetail(weddingId) {
  try {
    // pause to get detail through IO
    const wedding = await window.fetch(`https://api.com/wedding/${weddingId}`);
    // and resume when the result is back, and pause again...
    const groom = await getProfile(wedding.groomId);
    // ... and resume and pause ...
    const bride = await getProfile(wedding.brideId);
    // ... and resume
    return { wedding, bride, groom };
  } catch (error) {
    handleError(error);
  }
}
```

What's more, you can catch all the error at once, magical right?

### Every function has a color

Still, `async-await` has its short-coming. Things go wrong when you forgot to use `await`.

This could happen if you didn't know the implementation detail of `getProfile` where `getProfile` is asynchronous, because it makes an asynchronous IO call.

This leads to another problem, which is [every function has a color](https://journal.stuffwithstuff.com/2015/02/01/what-color-is-your-function/). As soon as you make an asynchronous call in a function, you have to make the function itself asynchronous, and the caller of this function to be asynchronous, and its caller too, ...!

So, is there another way to pause a JavaScript function, without having to `await`?

```js
function getWeddingDetail(weddingId) {
  // dont need await
  const wedding = window.fetch(`https://api.com/wedding/${weddingId}`);
  // `getProfile` could be synchronous or asynchronous
  // but `getWeddingDetail` shouldn't care
  const groom = getProfile(wedding.groomId);
  const bride = getProfile(wedding.brideId);
  return { wedding, bride, groom };
}
```

This would be arguably much simpler, making everything seemingly "synchronous".

So, is this possible?

To be able to pause a JavaScript function, is something decided in the JavaScript runtime.

**So are we diving into the JavaScript runtime engine today?**

Not really, I don't know much about C++ or whatever language the JavaScript runtime is implemented. 🙈

But we are going to write a simple runtime in JavaScript, with some constraints. _(Come on, it is hard to write a full blown runtime, adding constraints will make it easier for me to finish it in one blog post)_

## Writing "the runtime"

### The first constraint: entry point

The first constraint for the runtime, is to have an entry point.

In our case, we are going to make `main` our entry point:

```js
function main() {
  const id = 123;
  console.log('Getting wedding:', id);

  const { wedding, bride, groom } = getWeddingDetail(id);

  console.log('Wedding detail:', wedding);
}
```

So our runtime looks something like this:

```js
function runtime(mainFn) {
  // run our entry point
  mainFn();
}

// start runtime
runtime(main);
```

Ok, so we have our basic structure, what's next?

Firstly, we need to figure how to pause a JS function midway, without using `await`.

Well, there's `throw` or `return`, which is able to exit the JS function midway. I gonna choose `throw`, which is more suited to exit the function "unexpectedly", rather than `return` which is more for exit normally:

```js
function runtime(mainFn) {
  // highlight-start
  // patch the `window.fetch` to make it "pause" the function
  const _originalFetch = window.fetch;
  window.fetch = (url, options) => {
    // "pause" the function
    throw new Error();
  };

  // run our entry point
  try {
    mainFn();
  } catch (error) {
    // function "paused"
  }
  // highlight-end
}

function getWeddingDetail(weddingId) {
  // calling `window.fetch` will "pause" the function and stop executing the next line.
  const wedding = window.fetch(`https://api.com/wedding/${weddingId}`);
  // ...
}
```

But in both cases, there's no way to "resume" the function. However, it is still a good starting point.

One way of "resuming" the function is to rerun the `main` function again.

```js
function runtime(mainFn) {
  // patch the `window.fetch` to make it "pause" the function
  const _originalFetch = window.fetch;
  window.fetch = (url, options) => {
    // "pause" the function
    throw new Error();
  };

  // run our entry point
  function runMain() {
    try {
      mainFn();
    } catch (error) {
      // function "paused"
      // highlight-start
      // resumed by rerun the `mainFn`
      runMain();
      // highlight-end
    }
  }
  runMain();
}
```

Ignore all the doubts you have for why rerunning the entire `main` function is a bad idea for "resuming" the function for now.

The current implementation is inaccurate, and will lead us to an infinite loop, because we "resumed" the "paused" function immediately, which should be only after the `window.fetch` had succeeded:

```js
function runtime(mainFn) {
  // patch the `window.fetch` to make it "pause" the function
  const _originalFetch = window.fetch;
  window.fetch = (url, options) => {
    _originalFetch(url, options).then(result => {
      // highlight-start
      // resume only when the result is back
      runMain();
      // highlight-end
    });

    throw new Error();
  };

  // run our entry point
  function runMain() {
    try {
      mainFn();
    } catch (error) {
      // function "paused"
      // highlight-next-line
      // no rerun
    }
  }
  runMain();
}
```

Still the infinite-loop still happened, that's because `window.fetch` should return the response object when "resumed":

```js
// ...
// 1st time running `getWeddingDetail`
// call `window.fetch`, throw Error and "paused"
const wedding = window.fetch(`https://api.com/wedding/${weddingId}`);
// ...
// when fetch response returns, rerun the main function
// 2nd time running `getWeddingDetail`
// call `window.fetch`, and should return the response to "resume"
const wedding = window.fetch(`https://api.com/wedding/${weddingId}`);
// ...
```

How do we throw Error when the `fetch` is called the 1st time, and return the response for the subsequent calls?

One can achieve it by caching the response:

```js
function runtime(mainFn) {
  // patch the `window.fetch` to make it "pause" the function
  const _originalFetch = window.fetch;
  window.fetch = (url, options) => {
    // highlight-start
    // return immediately if response is cached.
    if (cache.has([url, options])) {
      return cache.get([url, options]);
    }

    _originalFetch(url, options).then(result => {
      cache.set([url, options], result);
      // resume only when the result is back
      runMain();
    });
    // highlight-end

    throw new Error();
  };

  // run our entry point ...
}
```

It works!

After running the main function a few times, by "pausing" and "resuming", or shall I say, "early exit" and "rerun", we finally hit the last statement of the main function and finish the function.

Except, if you look at the console, because of rerunning multiple times, we see the `"Getting wedding: 123"` multiple times!

That is because, `console.log` has side effects!

### **The second constraint: pure functions**

The second constraint of our runtime is to use only pure functions. If you wish to call functions with side effects, you have to use our special construct, `runSideEffects()`:

```js
function main() {
  const id = 123;
  // highlight-next-line
  runSideEffects(() => console.log('Getting wedding:', id));

  const { wedding, bride, groom } = getWeddingDetail(id);

  // highlight-next-line
  runSideEffects(() => console.log('Wedding detail:', wedding));
}
```

So, how is `runSideEffects` implemented?

```js
function runtime(mainFn) {
  // patch the `window.fetch` to make it "pause" the function...

  // highlight-start
  // provide `runSideEffects`
  const sideEffects = [];
  window.runSideEffects = fn => {
    sideEffects.push(fn);
  };
  // highlight-end

  // run our entry point
  function runMain() {
    try {
      mainFn();
      // highlight-next-line
      sideEffects.forEach(fn => fn());
    } catch (error) {
      // highlight-start
      // clear side effects
      sideEffects.splice(0, sideEffects.length);
      // highlight-end
    }
  }
  runMain();
}
```

What we are trying to do here is that, we push all the side effects into an array, and only run all of them when we finally finish our `main` function.

And if we "paused" our function, before rerunning the `main` function to "resume", we clear all the side effects, since the same side effects will be pushed into the array again.

Run it again, and yes it works!

You can try out the complete code in the CodeSandbox:

<iframe
	src="https://codesandbox.io/embed/pausing-a-javascript-function-dh0mw?expanddevtools=1&fontsize=14&hidenavigation=1&theme=dark&view=editor"
	style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
	title="Pausing a JavaScript function"
	allow="geolocation; microphone; camera; midi; vr; accelerometer; gyroscope; payment; ambient-light-sensor; encrypted-media; usb"
	sandbox="allow-modals allow-forms allow-popups allow-scripts allow-same-origin"
></iframe>

## What have we done so far?

To mimic a pause and resume a function in JavaScript, we can throw an error to "pause" the execution of the function halfway, and "resume" it by reruning the function.

To "resuming" from where it left off, the point of where we threw an error should now returning a value instead, so that it feels like we are picking up and resuming from that point. To achieve this, we can use some caching mechanism.

Lastly, to safely reruning the function multiple times, we need to make sure that the function is pure. If we have side effects, we need to collect them and only apply them when the function has successfully reach the end.

## Okay cool. Why are we doing this?

Well, the idea of how to pause and resume a JavaScript function comes when I was reading about [React Suspense](https://reactjs.org/docs/concurrent-mode-suspense.html#what-suspense-lets-you-do). With Suspense, fetching / getting data can be written declaratively:

```js
function Component() {
  const data = getDataFromNetwork();
  return <div />;
}
```

`getDataFromNetwork` will get actually get the data from the network, which is asynchronous, but how did React make it look like it is synchronous?

Think of how you would have written in React:

- Instead of providing an entry point, your `render` function is the entry point for React. To "resume" each "pause" the render, React calls the `render` function multiple times.
- Your render function has to be pure and side-effects free
- To `runSideEffects`, you use `React.useEffect` instead.
- To fetch + cache, you use `react-cache` to create a resource.
- Except, instead of "pause" and do nothing, React handles the "pause" with the nearest `<Suspense />` componnet to render some fallback content. When the promise is resolve, React "resumes" the render and render the content with the data.

### Yet, this is not Suspense.

No, I dont think so.

Suspense is based on some function programming concept, called the "one-shot delimited continuation", which is explained in Dan Abramov's ["Algebraic Effects for the Rest of Us"](https://overreacted.io/algebraic-effects-for-the-rest-of-us/).

## Closing Note

This whole article is based on a thought experiment I had when I was trying to understand the mechanics of [React Suspense](https://reactjs.org/docs/concurrent-mode-suspense.html). So, pardon me if the flow of the content is a bit awkward or crude.

Yet, after writing my thought process out, I did more research, and realised that "pausing and resuming execution" is a concept called ["continuations"](https://en.wikipedia.org/wiki/Continuation) in functional programming.

So, if you are interested to learn more, here are some starting points:
- James Long's [What's in a Continuation](https://jlongster.com/Whats-in-a-Continuation)
- Florian Loitsch's [Exceptional Continuations in JavaScript](http://www.schemeworkshop.org/2007/procPaper4.pdf)