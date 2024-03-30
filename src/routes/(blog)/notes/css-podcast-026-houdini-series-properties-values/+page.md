---
title: 'The CSS Podcast: 026: Houdini Series: Properties & Values'
tags:
  - css houdini
  - The CSS Podcast
---

## CSS Houdini

- Umbrella term that covers a set of low-level APIs that exposes parts of the CSS rendering engine
- Give developers access to CSS Object Model.
- Enable developers to extends CSS by hooking into the styling and layout processes
- No need to wait for browsers to implement CSS primitives
- Write your own painting and layout algorithm using worklet
- Write less JS dependencies and polyfills, allow users write true CSS polyfills that browser can better understand
- Allow more semantic CSS, allow performance optimisations in how the browser actually reads and parses CSS
- Allow typechecking CSS

## Properties and Values API
- create rich and typed property
- error free, error gracefully, fallback to initial value
- provide semantic meaning to the variable
- custom property values are no longer a string
- allow you to interpolate the value as you transition from 1 value to another
- be known and passed to the function as accepted and identified parameter
- cascade still applies

## 2 ways to register houdini custom properties
- `CSS.registerProperty` in JS
- `@property` in CSS

```js
CSS.registerProperty({
  name: '--colorPrimary',  // start with `--`
  syntax: '<color>',       // syntax value
  initialValue: 'magenta', // initial value if not defined
  inherits: false,         // inherit from parent
});
```

```css
/* Included in Chromium 85 */
@property --colorPrimary {
  syntax: '<color>';      /* syntax value */
  initial-value: magenta; /* does not need to be a string */
  inherits: false;        /* inherit from parent */
}
```

- enforces it the `--colorPrimary` to be a value of color
- if it is not a color, will error gracefully by fallback to its initial value
- trying to see the console, but haven't see it in the console yet

## Syntax
- CSS definition syntax https://web.dev/at-property/#syntax
- [`<length>`](https://developer.mozilla.org/en-US/docs/Web/CSS/length), eg: 1px, 2rem, 3vw
- [`<percentage>`](https://developer.mozilla.org/en-US/docs/Web/CSS/percentage), eg: 4%
  - in linear-gradient
- [`<length-percentage>`](https://developer.mozilla.org/en-US/docs/Web/CSS/length-percentage)
  - superset of length + percentage
  - you can use `calc()` of mixing percentage and length, eg: `calc(100% - 35px)` 
- [`<angle>`](https://developer.mozilla.org/en-US/docs/Web/CSS/angle), eg: 1deg
  - in hsl, conic-gradient
- [`<time>`](https://developer.mozilla.org/en-US/docs/Web/CSS/time), eg: 1s
  - in animation, transition
- [`<resolution>`](https://developer.mozilla.org/en-US/docs/Web/CSS/resolution) , eg: 300dpi
  - in media query
- [`<integer>`](https://developer.mozilla.org/en-US/docs/Web/CSS/integer), positive / negative whole number
  - in z-index, grid-row
- [`<number>`](https://developer.mozilla.org/en-US/docs/Web/CSS/number)
- `<color>`
- [`<transform-function>`](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-function), 2d / 3d transform function
- [`<custom-ident>`](https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident)
  - eg: animation-name

### Multipliers
[Component value multipliers](https://developer.mozilla.org/en-US/docs/Web/CSS/Value_definition_syntax#Component_value_multipliers)
- `<length>+`, length can appear one or more times, eg: `"1px 2px 3px"`
- `<length>#`, length appear one or more times with comma separated, eg: `"1px, 2px 3px"`

### Combinators
[Component value combinators](https://developer.mozilla.org/en-US/docs/Web/CSS/Value_definition_syntax#Component_value_combinators)
- `|`, eg: `<percentage> | <length>`, must be either percentage or length, and appear only once


## References
- https://developer.mozilla.org/en-US/docs/Web/CSS/Value_definition_syntax
- https://heyjiawei.com/how-to-read-css-specification-syntax
- https://web.dev/at-property