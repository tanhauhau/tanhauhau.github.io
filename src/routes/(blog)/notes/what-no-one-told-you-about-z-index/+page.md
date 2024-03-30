---
title: What No One Told You About Z-Index
tags:
  - z-index
  - stacking-order
---

## Stacking Order within the same Stacking Context

From back to front

**1. stacking context root element**

```html
<div class="parent">
  <div class="child"></div>
</div>
<style>
  div {
    height: 50px;
    width: 50px;
  }
  .child {
    background: red;
    z-index: -1;
    position: relative;
  }
  .parent {
    background: green;
    /* creates a new stacking context */
    transform: scale(1);
  }
</style>
```

> Adding `transform: scale(1)` creates a new stacking context.
> `.child` initially stacks behind `.parent`, but as `.parent` becomes the root of the new stacking context, `.child` comes in front of `.parent`.

**2. positioned element with negative z-index**

- Higher values stacked in front of lower values, `z-index: -1` in front of `z-index: -2`

**3. positioned element with `z-index: auto`**

**4. positioned element with positive z-index**

- Higher values stacked in front of lower values, `z-index: 2` in front of `z-index: 1`

## Global Stacking Order with Stacking Context

All the elements within the same stacking context move forward / backward together along with the root element.

## Links

- [What No One Told You About Z-Index](https://philipwalton.com/articles/what-no-one-told-you-about-z-index/)