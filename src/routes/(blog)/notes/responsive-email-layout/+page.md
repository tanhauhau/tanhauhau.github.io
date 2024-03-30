---
title: "Responsive email layout"
tags:
  - email
  - layout
  - responsive
  - media query
---

[The Fab Four technique to create Responsive Emails without Media Queries](https://www.freecodecamp.org/news/the-fab-four-technique-to-create-responsive-emails-without-media-queries-baf11fdfa848/)

Instead of using media query to switch between mobile / desktop layout, here's a trick that uses `calc`, `min-width`, `max-width` and `width`

```html
<style>
  .item {
    display: inline-block;
    min-width: 50%;
  }
  @media(min-width: 720px) {
    .item {
      width: 25%;
    }
  }
</style>	

<div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
</div>
```

```html
<style>
  .item {
    display: inline-block;
    min-width: 25%;
    max-width: 50%;
    width: calc((720px - 100%) * 720);
  }
</style>	

<div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
</div>
```

💡 The key idea is that 
- 📝 if `max-width < width`, the width = `max-width`
- 📝 if `min-width > width`, the width = `min-width`

if the viewport is below breakpoint, make `width` to be extremely large  ~> `max-width`⬜️

otherwise, make `width` extremely small ~> `min-width`▫️

It also listed how to support some older email clients that does not support `calc()`

- 📝 fallback to use a fixed width
- 📝 there's 2 `min-width`, fixed px width for case if `calc()` is not supported, % width if `calc()` is supported

```html
<style>
  .item {
    display: inline-block;
    min-width: 180px; /* fallback, 720px * 25% */
    min-width: calc(25%);
    max-width: 50%;
    width: 25%; /* fallback, size for desktop layout */
    width: calc((720px - 100%) * 720);
  }
</style>	

<div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
</div>
```

or browsers that requires a vendor prefix

```html
<style>
  .item {
    display: inline-block;
    min-width: 180px; /* fallback, 720px * 25% */
    min-width: -webkit-calc(25%);
    min-width: calc(25%);
    max-width: 50%;
    width: 25%; /* fallback, size for desktop layout */
    width: -webkit-calc((720px - 100%) * 720);
    width: calc((720px - 100%) * 720);
  }
</style>	

<div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
</div>
```

There are a few mail client quirks to be wary too 😱

- 📝 Outlook(dot)com removes `calc()` that includes parenthesis `()`
- 📝 Outlook Web App removes inline-styles that contains `calc()` with multiplication *

```html
<style>
  .item {
    display: inline-block;
    min-width: 180px; /* fallback, 720px * 25% */
    min-width: -webkit-calc(25%);
    min-width: calc(25%);
    max-width: 50%;
    width: 25%; /* fallback, size for desktop layout */
    width: -webkit-calc(518400px — 72000%);
    width: calc(518400px — 72000%);
  }
</style>	

<div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
  <div class="item"></div>
</div>
```