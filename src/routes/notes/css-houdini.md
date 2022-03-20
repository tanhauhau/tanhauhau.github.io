---
title: CSS Houdini
tags:
  - css houdini
---

## Make custom property animatable

- registerProperty

```html
<div id="hero"></div>

<style>
  #hero {
    display: block;
    height: 100px;
    width: 100px;
    background: red;
    transform: scaleY(var(--scale, 1));
    animation: scale 1s linear infinite;
  }

  @keyframes scale {
    to {
      --scale: 1.5;
    }
  }
</style>

<script>
  CSS.registerProperty({
    name: '--scale',
    syntax: '<number>',
    inherits: true,
    initialValue: '1',
  });
</script>
```