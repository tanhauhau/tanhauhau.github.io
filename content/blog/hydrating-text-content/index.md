---
title: Hydrating text content from Server-Side Rendering
date: '2020-02-28T08:00:00Z'
---

## Disclaimer

I am not going to talk about what is hydration, to know more about client-side rendering, server-side rendering and hydration, please [read this amazing article](https://developers.google.com/web/updates/2019/02/rendering-on-the-web) by [Jason Miller](https://twitter.com/_developit) and [Addy Osmani](https://twitter.com/addyosmani).

I am not going to share about how to do rehydration in React as well, you can read about that from [here](https://hackernoon.com/whats-new-with-server-side-rendering-in-react-16-9b0d78585d67) and [here](https://www.freecodecamp.org/news/demystifying-reacts-server-side-render-de335d408fe4/).

I am going to share a story, how I "understand" more about the mechanics of rehydration in React, and how I apply it in real life.

## Background

Recently, I was bewildered by a React hydration warning:

```
Text content did not match. Server: "Count: 0" Client: "Count: "
```

To give you a sense of the situation, this is the component I was trying to rehydrate:

```js
function App() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}
```

Although React warned about the mismatch in the console, the hydrated app still worked fine.

So I can actually ignore it. 🙈

Still, my curiosity made me dig deeper, to find out the reason behind it.

## The investigation

So, the first thing I looked at, was the server-rendered HTML, which will be hydrated by React later.

```html
<div>
  <div>Count: 0</div>
  <button>Increment</button>
</div>
```

Looks pretty normal right?

Somehow, my gut feeling telling me to look at the DOM with and without hydration next:

```html
<!-- disabled javascript -->
└─ <div>
    ├─ <div>
    │   └─ "Count: 0"
    └─ <button>
        └─ "Increment"
```

```html
<!-- enabled javascript -->
└─ <div>
    ├─ <div>
    │   ├─ "Count: "
    │   └─ "0"
    └─ <button>
        └─ "Increment"
```

A-ha! Noticed the difference in the DOM?

Although they both looked visually the same, but in the DOM created by the initial HTML has only 1 text node, `"Count: 0"`, but the DOM after hydration has 2 text nodes, `"Count: "` and `"0"`.

Why is that so? The secret lies in the component `App`.

The functional component `App` returns the following React element when `count` is `0`:

```jsx
<div>
  <div>Count: {0}</div>
  <button onClick={() => setCount(1)}>Increment</button>
</div>
```

which itself is a plain JavaScript object, which is roughly:

```js
{
  type: 'div',
  props: {
    children: [{
      type: 'div',
      props: {
        children: [
          'Count: ',
          0,
        ],
      },
    }, {
      type: 'button',
      props: {
        onClick: () => setCount(0),
        children: [
          'Increment',
        ],
      },
    }],
  },
}
```

Noticed the `div` has 2 children? That's why it rendered 2 text nodes!

So, when React tries to hydrate the `div` from SSR, it starts with comparing all the props from the React element and the attributes from the DOM. Then, it compares the element's children.

Based on the React element, React expects 2 text nodes, but the DOM only have 1. So it tries to mactch with the 1st text node, and create the 2nd one.

It is when the matching happens, where React realises that it is expecting the text node to contain `"Count: "`, but the server content is `"Count: 0"`, thus the error message:

```
Text content did not match. Server: "Count: 0" Client: "Count: "
```

Then, React patches the text node, by setting the content to the expected `"Count: "`, and created another text node, `"0"`, so visually there's no change, but in the DOM, React has changed the text content and created a new text node.

## Is this a bug?

So, is this a React hydration bug? or is this an expected behavior?

Turns out that, it was my bug 🤮🤮.

I used [`ReactDOMServer.renderToStaticMarkup`](https://reactjs.org/docs/react-dom-server.html#rendertostaticmarkup) instead of [`ReactDOMServer.renderToString`](https://reactjs.org/docs/react-dom-server.html#rendertostring).

The docs says clearly,

> If you plan to use React on the client to make the markup interactive, do not use this method. Instead, use `renderToString` on the server and `ReactDOM.hydrate()` on the client.

🙈

So, what is the difference between [`ReactDOMServer.renderToStaticMarkup`](https://reactjs.org/docs/react-dom-server.html#rendertostaticmarkup) and [`ReactDOMServer.renderToString`](https://reactjs.org/docs/react-dom-server.html#rendertostring) ?

This is what [`ReactDOMServer.renderToString`](https://reactjs.org/docs/react-dom-server.html#rendertostring) generates:

```diff
- <div>
+ <div data-reactroot="">
-  <div>Count: 0</div>
+  <div>Count: <!-- -->0</div>
  <button>Increment</button>
</div>
```

It adds a `data-reactroot` which is used by React internally. (From what I read from the code, it seemed to be used by React only to warn legacy code to [switch from `render()` to `hydrate()`](https://hackernoon.com/whats-new-with-server-side-rendering-in-react-16-9b0d78585d67) before stopping support in React v17, correct me if I'm wrong).

Besides, it adds a comment in between `"Count: "` and `"0"`, so the initial DOM looks like this:

```html
<!-- disabled javascript -->
└─ <div>
    ├─ <div>
    │   ├─ "Count: "
    │   ├─ <!-- -->
    │   └─ "0"
    └─ <button>
        └─ "Increment"
```

A [comment node](https://developer.mozilla.org/en-US/docs/Web/API/Comment) sits in between 2 text nodes, nicely separate the boundary of the 2 text nodes.

As you could expect, this time round, there's no more hydration error.

The initial DOM provided 2 text nodes as React would expect, and [React would skip comment nodes and only hydrate element nodes and text nodes](https://github.com/facebook/react/blob/1a6d8179b6dd427fdf7ee50d5ac45ae5a40979eb/packages/react-dom/src/client/ReactDOMHostConfig.js#L703-L709).

## Apply what I've learned

So, the next obvious place to apply what I've learned is [Svelte](http://github.com/sveltejs/svelte).

I found out there are 2 places that Svelte can use this technique for a better hydration.

The first is obviously hydrating text node. I found out that Svelte hydrates neighboring text nodes the same way as I described as "a bug", modifying the 1st text node and creating the 2nd text node. It gets "worse" when you have more neighboring text nodes:

```html
<div>{a} + {b} = {a + b}</div>
```
_5 neighboring text nodes_

The second place I found the technique is useful, is hydrating [HTML tags (`{@html string}`)](https://svelte.dev/tutorial/html-tags).

HTML tags allow you to render arbitrary HTML into the DOM, just like React's [dangerouslySetInnerHTML](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml).

```html
<script>
  const string = `
    <h1>Introduction</h1>
    <div>Hello World</div>
  `;
</script>
{@html string}
```

So, why is hydrating HTML tag hard?

HTML tag allow multiple elements to be passed in, which makes it hard to determine the bound of the HTML tag when hydrating.

Take this example:

```html
<script>
  import Header from './Header.svelte';
  import Footer from './Footer.svelte';
  
  const string = `
    <h1>Introduction</h1>
    <div>Hello World</div>
  `;
</script>

<Header>This is header</Header>
{@html string}
<Footer>This is footer</Footer>
```

The rendered HTML may look something like this:

```html
<header>This is header</header>
<nav>
  <ul>
    <li><a href="#">Home</a></li>
  </ul>
</nav>
<h1>Introduction</h1>
<div>Hello World</div>
<div class="footer">
  <img src="footer-img" />
  This is footer
</div>
```

Now, can you tell me which elements are belong to `<Header />`, `{@html string}` and `<Footer />`?

Let's walk through it step by step.

Hydrating this component meant that we are going to claim components belong to `<Header>`, `{@html string}` then `<Footer>`.

> **Claiming** in Svelte means marking the element as part of the component, and hydrate it by providing reactivity to the element.

Claiming the `<Header />` component, by itself, will claim away `<header>` and `<nav>`, because in `Header.svelte` contains these 2 elements:

```html
<!-- Header.svelte -->
<header><slot></slot></header>
<nav>
  <ul>
    <li><a href="#">Home</a></li>
  </ul>
</nav>
```

> You can learn about Svelte `<slot>` [here](https://svelte.dev/tutorial/slots)

Now claiming for `{@html string}` is tricky, because you have no idea when it ends and when is the start of the `<Footer />` component

If we put a comment as a marker for the end of the HTML tag, it would make things easier:

```html
<header>This is header</header>
<nav>
  <ul>
    <li><a href="#">Home</a></li>
  </ul>
</nav>
<h1>Introduction</h1>
<div>Hello World</div>
<!-- HTML Tag Ends Here -->
<div class="footer">
  <img src="footer-img" />
  This is footer
</div>
```

```js
// claim HTML node until a comment that matches the `commentMarker`
function claimUntil(nodes, commentMarker) {
  let i = 0;
  while(i < nodes.length) {
    const node = nodes[i];
    if (node.nodeType === 8 /* comment node */ && node.textContent.trim() === commentMarker) {
      break;
    }
  }
  return nodes.splice(0, i);
}

function claimHtmlTag(nodes) {
  const htmlTagNodes = claimUntil(nodes, 'HTML Tag Ends Here');
  return new HtmlTag(htmlTagNodes);
} 
```

## dangerouslySetInnerHtml

React has [dangerouslySetInnerHTML](https://reactjs.org/docs/dom-elements.html#dangerouslysetinnerhtml) right? Does it have the same issue?

Apparently not. `dangerouslySetInnerHTML` is always used inside a HTML element, so the parent element is the boundary of the inner html content.

```js
function MyComponent() {
  return <div dangerouslySetInnerHTML={{__html: `
    <h1>Introduction</h1>
    <div>Hello World</div>
  `
  }} />;
}
```

```html
<!-- the parent `<div>` act as a boundary -->
<div>
  <h1>Introduction</h1>
  <div>Hello World</div>
</div>
```

Unless `dangerouslySetInnerHTML` is supported on `React.Fragment`, then it would not be a problem.

## React Partial Hydration

Partial hydration in React is a mechanism to partially hydrate a server-rendered result while other parts of the pages are still loading the code or data.

This is helpful when you are hydrating a [`<Suspense>` component](https://reactjs.org/docs/react-api.html#reactsuspense). The server-rendered HTML may have rendered based on the code or data, which is yet to be fetched by the component. If React now shows the fallback content during the hydration, the user may see a flash of the actual content, before turning into a loading state until the code or data is ready.

Partial hydration allows React to not hydrate those `<Suspense />` component until the code or data is ready.

So, how does React knows the boundary of `<Suspense />` from the server-rendered html which it could safely skip, before hydrate them when it's ready?

It's [the marker comment](https://github.com/facebook/react/blob/1a6d8179b6dd427fdf7ee50d5ac45ae5a40979eb/packages/react-dom/src/client/ReactDOMHostConfig.js#L131-L134) to the rescue again!

> **Disclaimer**
> The section above is entirely based on my understanding by reading the [Partial Hydration PR](https://github.com/facebook/react/pull/14717), please feel free to correct me if I'm wrong.

## References

- Some interesting React commits and PRs that serves as a good entry point to understand hydration:
  - [Remove most comments from HTML generation output](https://github.com/facebook/react/commit/e955008b9bbee93fcaf423d4afaf4d22023e2c3f)
  - [Warn When The HTML Mismatches in DEV](https://github.com/facebook/react/pull/10026/files)
  - [Partial Hydration PR](https://github.com/facebook/react/pull/14717)
