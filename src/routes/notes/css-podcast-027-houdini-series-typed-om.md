---
title: 'The CSS Podcast: 027: Houdini Series: Typed Object Model'
tags:
  - css houdini
  - The CSS Podcast
---

## CSS Typed Object Model (Typed OM)
- CSS Typed OM API allow manipulating CSS styles through a typed JS representation rather than a simple string.
- Provide performance win. Browser understands the structured JS representation and no longer needs to parse CSS string from scratch.

```js
const div = document.createElement('div');

// browser needs to parse the string to understand and use it
div.style.height = '5px';

// browser understands and use the value as 5px
div.style.height = CSS.px(5);
```

- Built-in error handling. You can't provide invalid value to a type.

```js
div.attributeStyleMap.set('color', CSS.px(10))
// TypeError: Failed to set, invalid type for property
```

- Rather than manipulating raw string, developer can create / transform CSS in a meaningful object

```js
const _5px = CSS.px(5); // 5px
const _15px = _5px.add(CSS.px(10)); // 15px;

const div = document.createElement('div');
div.style.height = _15px;
// <div style="height: 15px;"></div>
```

- API based on functional programming concept
- To check browser support Typed OM, currently (21 Nov 2020) supported in Safari Tech Preview & Chromium

```js
// checking browser support
if (window.CSS && CSS.number) {
  // 😍 browser supports Typed OM!
}
```

## computedStyleMap

```html
<script>
  const element = document.querySelector('#app');
  
  console.log(element.computedStyleMap().get('font-size'));
  // Specification: CSSUnitValue { value: 2, unit: 'rem' }
  // Chrome: CSSUnitValue { value: 32, unit: 'px' }

  console.log(window.getComputedStyle(element).fontSize);
  // "32px"
</script>

<div id="app" style="font-size: 2rem;"></div>
```

## attributeStyleMap

- parse, modify inline styles

```html
<script>
  const element = document.querySelector('#app');
  
  const inlineStyles = element.attributeStyleMap;

  console.log(inlineStyles.get('font-size'));
  // CSSUnitValue { value: 2, unit: 'rem' }

  inlineStyles.set('height', CSS.px(10));
  // <div id="app" style="font-size: 2rem; height: 10px;"></div>

  inlineStyles.clear();
  // <div id="app" style=""></div>

  inlineStyles.append('background-image', 'linear-gradient(yellow, green)');
  inlineStyles.append('background-image', 'linear-gradient(to bottom, blue, red)');
  // <div id="app" 
  //   style="background-image: linear-gradient(yellow, green), 
  //                      linear-gradient(to bottom, blue, red)"></div>

  inlineStyles.delete('background');
  // <div id="app" style=""></div>

  inlineStyles.has('opacity');
  // false
</script>

<div id="app" style="font-size: 2rem;"></div>
```

```html
<script>
  // `attributeStyleMap` only gets inline style
  console.log(element.attributeStyleMap.get('color'));
  // null
  console.log(element.computedStyleMap().get('color'));
  // CSSStyleValue { /* red */ }
</script>

<div id="app" style="font-size: 2rem;"></div>

<style>
  #app {
    color: red;
  }
</style>
```

## Types of CSSStyleValue

- CSSImageValue
- CSSKeywordValue
- CSSNumericValue
- CSSPositionValue
- CSSTransformValue
- CSSUnparsedValue

### create CSSStyleValue

```js
CSSStyleValue.parse('font-size', '32px');
// CSSUnitValue { value: 2, unit: 'px' }

CSSStyleValue.parse('transform', 'translate3d(10px, 20px, 30px) scale(1.5)');
/* 
CSSTransformValue {
  0: CSSTranslate {
    is2D: false
    x: CSSUnitValue { value: 10, unit: 'px' }
    y: CSSUnitValue { value: 20, unit: 'px' }
    z: CSSUnitValue { value: 30, unit: 'px' }
  }
  1: CSSScale {
    is2D: true
    x: CSSUnitValue { value: 1.5, unit: 'number' }
    y: CSSUnitValue { value: 1.5, unit: 'number' }
    z: CSSUnitValue { value: 1, unit: 'number' }
  }
}
*/
```

### CSSImageValue

- does not cover `linear-gradient`

### CSSKeywordValue

- `display: none`, `none` is a CSSKeywordValue

```js
CSSStyleValue.parse('display', 'none');
// CSSKeywordValue { value: 'none' }
const keywordValue = new CSSKeywordValue('flex');
// CSSKeywordValue { value: 'flex' }
keywordValue.value;
// 'flex'
```

### CSSNumericValue
- CSSNumericValue has a few subclasses, eg: CSSUnitValue, CSSMathValue

```js
// Convert units
CSS.px(48).to('in')
// CSSUnitValue { value: 0.5, unit: 'in' }

CSS.px(48).to('rem')
// Error
// Cannot transform absolute unit to relative unit
```

### CSSMathValue
- CSSMathNegate, CSSMathMin, CSSMathMax, CSSMathSum, CSSMathProduct, CSSMathInvert

```js
new CSSMathSum(CSS.px(5), CSS.px(10)); // 15px

div.attributeStyleMap.set('width', new CSSMathMax(CSS.rem(10), CSS.px(30)));
// <div style="width: max(10rem, 30px)"></div>
```

### CSSPositionValue

```js
const position = new CSSPositionValue(CSS.px(20), CSS.px(50))
position.x; // CSSUnitValue { value: 20, unit: 'px' }
position.y; // CSSUnitValue { value: 50, unit: 'px' }
```

### CSSTransformValue

- CSSTranslate, CSSScale, CSSRotate, CSSSkew, CSSSkewX, CSSSkewY, CSSPerspective, CSSMatrixComponent

```js
const transformValue = CSSStyleValue.parse('transform', 'translate3d(10px, 20px, 30px) scale(1.5)');

// iterate through each transformation
for (const transform of transformValue) {
  console.log(transform);
}
// CSSTranslate { ... }
// CSSScale { ... }

// get DOMMatrix out of the transformValue
transformValue.toMatrix();
// DOMMatrix { a: 1.5, b: 0, c: 0, ... }
```

### CSSUnparsedValue

- CSSCustomProperty, that is not Houdini Property
- the value is parsed as string

```html
<script>
  const element = document.querySelector('#app');
  
  element.attributeStyleMap.get('--length');
  // CSSUnparsedValue { 0: 3px }
</script>
<div id="app" style="--length: 3px;">
```

### References
- Specifications https://www.w3.org/TR/css-typed-om-1/
- MDN https://developer.mozilla.org/en-US/docs/Web/API/CSS_Typed_OM_API
- caniuse `attributeStyleMap` https://caniuse.com/mdn-api_element_attributestylemap
- caniuse `computedStyleMap` https://caniuse.com/mdn-api_element_computedstylemap