---
title: Amazing Animation Techniques with GSAP
tags:
  - greensock
  - web animation
---

Link: https://frontend.horse/articles/amazing-animation-techniques-with-gsap/

## Split text from phrase to animate character individually

- Greensock [SplitText](https://greensock.com/splittext/) plugin

```js
const mySplitText = new SplitText("#quote", {type:"words,chars"}),
//an array of all the divs that wrap each character
const chars = mySplitText.chars;
```

- Splitting.js https://splitting.js.org/

Add data-splitting to element

```html
<div data-splitting>ABC</div>
<script>
  Splitting();
</script>
```

## Cylinder Rotation Effect

```css
.element {
  /* make the center of origin behind the characters */
  transform-origin: center center -100px;
  /* comment this out to see the back of the letters */
  backface-visibility: hidden;
  animation: rotate 5s linear infinite;
}
@keyframes rotate {
  from {
    transform: rotateX(0deg);
  }
  to {
    transform: rotateX(360deg);
  }
}
```

## Create custom easing function using GreenSock Ease Visualiser

https://greensock.com/docs/v3/Eases

## Infinite looping

- use linear ease
- animate until the ending point is the same as starting point, then restart the animation

## Masking using svg mask

```html
<svg>
  <defs>
    <mask id="jm-mask">
      <path d="..." />
    </mask>
  </defs>
  <rect class="stage" width="716" height="1020" fill="red" mask="url(#jm-mask)"/>
</svg>
```

