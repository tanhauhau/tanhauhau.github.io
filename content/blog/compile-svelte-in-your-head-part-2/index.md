---
title: Compile Svelte in your head (Part 2)
date: '2020-03-04T08:00:00Z'
tag: Svelte, JavaScript
series: Compile Svelte in your head
---

Previously, when I mentioned the `$$invalidate` function, I explained that the `$$invalidate` function works conceptually like the following:

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

// gets called when update is scheduled
function flushUpdate() {
  // update the fragment
  fragment.p(ctx, dirty);
  // clear the dirty
  dirty.clear();
}
```

but that's not the exact implementation of the `$$invaldiate` function. So in this article, we are going to look at how `$$invalidate` is implemented in Svelte.

At the point of writing, Svelte is at [v3.19.2](https://github.com/sveltejs/svelte/blob/master/CHANGELOG.md#3192).

## Pre 3.16.0

There's a big optimisation that changes the underlying implementation of the `$$invalidate` function in [v3.16.0](https://github.com/sveltejs/svelte/blob/master/CHANGELOG.md#3160), namely in [#3945](https://github.com/sveltejs/svelte/pull/3945). The underlying concept doesn't change, but the compiled output has reduced TODO: percent!

`ctx` and `changed`