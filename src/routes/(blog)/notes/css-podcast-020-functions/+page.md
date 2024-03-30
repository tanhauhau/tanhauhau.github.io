---
title: 'The CSS Podcast: 020: Functions'
tags:
  - css functions
  - The CSS Podcast
---

## CSS Functions

Runtime contextual expressions that return dynamic real-time value per the state of the browser in that moment

- within global space, no need to import
- can be nested, calc(var(--v))
- typed, wrong type may fail, eg: `rotate(45px)` will not work
- type cast, eg: `calc(5 * 60 * 60s)`
- keep the function live, recompute on value changes and updates
- many of them are pure functions, counter-example: `counter()`

## 1️⃣Color functions

- `rgb()`, `rgba()`, `hsl()`, `hsla()`, `lab()`, `lch()`
- [`color()`](https://www.w3.org/TR/css-color-4/#icc-colors)

* [newer browser supports comma-less notation](https://css-tricks.com/no-comma-color-functions-in-css/)

```css
.element {
  color: rgb(255, 0, 0);
  color: rgba(255, 0, 0, 1);
  color: hsl(0deg, 100%, 50%);
  color: hsla(0deg, 100%, 50%, 100%);
  color: lab(53.23% 80.11 67.22);
  color: lch(53.23% 104.58 40);
}
```

## 2️⃣Gradient functions

- `linear-gradient()`, `repeating-linear-gradient()`
  top -> bottom
- `radiant-gradient()`, `repeating-radiant-gradient()`
  center -> outer
- `conic-gradient()` and `repeating-conical-gradient()`
  clockwise

```css
.element {
  background: linear-gradient(45deg, lightcoral, beige);
  background: repeating-linear-gradient(45deg, lightcoral 25px, beige 50px);
  background: radial-gradient(lightcoral 25px, beige 50px);
  background: repeating-radial-gradient(lightcoral 25px, beige 50px);
  background: conic-gradient(lightcoral 25deg, beige 50deg);
  background: repeating-conic-gradient(lightcoral 25deg, beige 50deg);
}
```

## 3️⃣ `attr()`

- allow you to read value from attribute of the element you are targeting

```html
<div class="element" data-color="red" data-title="hello"></div>
<style>
  .element::before {
    content: attr(data-title);
    /* Providing type-or-unit and fallback to `attr()` is still experimental */
    color: attr(data-color color, blue);
  }
</style>
```

## 4️⃣ `var()`

- allow you to insert value of the CSS Custom Property

```css
:root {
  --item-height: 42px;
}
.element {
  height: var(--item-height);
  /* with fallback value */
  width: var(--item-width, 50px);
}
```

## 5️⃣ `url()`

- use for fetching assets

```css
.element {
  /* absolute url */
  background-image: url(https://example.com/image.jpg);
  /* relative url */
  background-image: url(image.jpg);
  /* base 64 data uri */
  background-image: url(data:image/png;base64,iRxVB0…);
  /* reference to ID of an SVG shape */
  offset-path: url(#mask);
}
```

## 6️⃣ `image-set()`

- grab image based on resolution

```css
.element {
  background-image: image-set(
    'cat.png' 1x,
    'cat-2x.png' 2x,
    'cat-print.png' 600dpi
  );
}
```

## 7️⃣ Functional Selectors

- `:is()`, `:where()` `:not()`, `:lang()`, `:dir()`,
- `nth-child()`, `nth-last-child()`, `nth-of-type()`, `nth-last-of-type()`
- [see pseudo selectors](https://twitter.com/lihautan/status/1278189274114842624?s=20)

## 8️⃣ Mathematical Functions

- `calc()`, `min()`, `max()`, `clamp()`

```css
.element {
  height: calc(100vh - 42px);
  /* set to smallest value between 8vw and 200px */
  width: min(8vw, 200px);
  /* set to biggest value between 8vw and 16px */
  margin-top: max(8vw, 16px);
  /* set to 2.5vw, but wont go smaller than 1rem and not larget than 2rem */
  /* clamp(MIN, VAL, MAX) === max(MIN, min(VAL, MAX)) */
  font-size: clamp(1rem, 2.5vw, 2rem);
}
```

## 9️⃣ Trigonometry Functions

- `sin()`, `cos()`, `acos()`, `asin()`, `atan()`, `atan2()`, `sqrt()`, `hypot()`, `pow()`

## 1️⃣0️⃣ `cubic-bezier()`

- @wgao19's [article](https://dev.wgao19.cc/cubic-bezier/) and [talk](https://engineers.sg/video/the-obscurities-of-bezier-curves-explained-to-my-computer-engineer-friends-talk-css-52--4057) on bezier curves

```css
.element {
  animation: swing 1s cubic-bezier(0.6, 0, 1, 1);
}
```

## 1️⃣1️⃣ `steps()`

- divide the output value into equal distance steps.
- useful for animating sprites

```css
.element {
  animation: drive 10s steps(5, end);
}
```

## 1️⃣2️⃣ Shape Functions

- `path()`, `circle()`, `ellipse()`, `polygon()`, `inset()`

```css
.element {
  offset-path: path('m5 0 l 300 300 l 0 300 l 5 0');
  clip-path: ellipse(5px 8px);
  shape-outside: circle(10px);
  offset-path: inset(4px 16px);
  clip-path: polygon(5px 0px, 300px 300px, 0 300px);
}
```

## 1️⃣3️⃣ Transform Functions

- scaleX(), scaleY(), scaleZ(), scale(), scale3d()
- perspective()
- translateX(), translateY(), translateZ(), translate(), translate3d()
- rotateX(), rotateY(), rotateZ(), rotate(), rotate3d()
- skewX(), skewY(), skew()

## 1️⃣4️⃣ Filter Functions

- blur(), brightness(), contrast(), grayscale(), hue-rotate(), invert(), opacity(), saturate(), sepia(), drop-shadow(), url()

```css
.element {
  filter: blur(1px);
  filter: brightness(1.3);
  filter: contrast(0.5);
  filter: grayscale(0.4);
  filter: sepia(1);
  filter: invert(1);
  filter: hue-rotate(45deg);
  filter: opacity(0.5);
  filter: drop-shadow(2px 4px 6px black);
}
```

## 1️⃣5️⃣ Grid Template Functions

- `fit-content()`, `min-max()`, `repeat()`

## 1️⃣6️⃣ Media Queries
- @media
- @support

```css
@media (min-width: 600px) {
  .element {
    background: blue;
  }
}

/* Display-P3 color, when supported. */
@supports (color: color(display-p3 1 1 1)) {
  .element {
      color: color(display-p3 0 1 0);
  }
}
```

## 1️⃣7️⃣ Vulnerabilities

- Billion Laughs Attack (https://drafts.csswg.org/css-variables/#long-variables)
- XSS through `url()` + `attr()`
- [Third party CSS is not safe](https://jakearchibald.com/2018/third-party-css-is-not-safe/)

```css
/* Billion Laughs Attack */
/* create a value in custom property so big that it runs out of memory */
:root {
  --v1: "lol";
  --v2: var(--v1) var(--v1) var(--v1) var(--v1) var(--v1) var(--v1) var(--v1) var(--v1) var(--v1) var(--v1);
  --v3: var(--v2) var(--v2) var(--v2) var(--v2) var(--v2) var(--v2) var(--v2) var(--v2) var(--v2) var(--v2);
  --v4: var(--v3) var(--v3) var(--v3) var(--v3) var(--v3) var(--v3) var(--v3) var(--v3) var(--v3) var(--v3);
  --v5: var(--v4) var(--v4) var(--v4) var(--v4) var(--v4) var(--v4) var(--v4) var(--v4) var(--v4) var(--v4);
  --v6: var(--v5) var(--v5) var(--v5) var(--v5) var(--v5) var(--v5) var(--v5) var(--v5) var(--v5) var(--v5);
  --v7: var(--v6) var(--v6) var(--v6) var(--v6) var(--v6) var(--v6) var(--v6) var(--v6) var(--v6) var(--v6);
  --v8: var(--v7) var(--v7) var(--v7) var(--v7) var(--v7) var(--v7) var(--v7) var(--v7) var(--v7) var(--v7);
  --v9: var(--v8) var(--v8) var(--v8) var(--v8) var(--v8) var(--v8) var(--v8) var(--v8) var(--v8) var(--v8);
  --v10: var(--v9) var(--v9) var(--v9) var(--v9) var(--v9) var(--v9) var(--v9) var(--v9) var(--v9) var(--v9);
}
```

