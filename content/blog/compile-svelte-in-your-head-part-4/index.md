---
title: Compile Svelte in your head (Part 4)
date: '2020-05-07T08:00:00Z'
tags: 
  - Svelte
  - JavaScript
series: Compile Svelte in your head
wip: true
---

**⬅ ⬅  Previously in [Part 3](/compile-svelte-in-your-head-part-3/).**

<!-- [Previously](/compile-svelte-in-your-head-part-2/), I detailed how `$$invalidate` works, described how bitmask was used in `$$invalidate`, and explained how reactive declarations work as well. -->

In this article, we are going to cover our first logic block, the **if block**.

To make sure we are on the same page, let's first explain how if block works.

## The `{#if}` block

To render content conditionally, you can wrap it with the `{#if}` block:

```svelte
{#if condition}
  <div>Conditionally rendered content</div>
{/if}
```
