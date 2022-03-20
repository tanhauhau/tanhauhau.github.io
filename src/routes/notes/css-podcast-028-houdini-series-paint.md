---
title: 'The CSS Podcast: 028: Houdini Series: Paint'
tags:
  - css houdini
  - The CSS Podcast
---

worklet

paint worklet
- a.k.a CSS Paint API
- allow developers to define canvas like custom painting functions, that can be used directly in CSS as background, border, ...

worklet
- self-contained, can be run off the main thread
- all worklets are workers, worklet is more specific workers
- worklet have a tight limited contract between the script and the application that created it
- limited in the hopes of doing something powerful
- worklet scripts are always invoked in their own sandbox, with their allocated computing power, allow them to be created and destroyed very quickly
- secure, served and run from a https server
- will run off the main thread

- browser will forward the request found in the CSS for background paint job from a custom houdini worklet, worklet will run in it's own thread, and will return a painted canvas for the browser to use
- secure, fast, off-the-main thread

gotcha: if run locally, need to serve from a local server

registerPaint(name, workletClass)

```js
// worklet.js
// 1️⃣ define the worklet class
class CheckerboardPainter {
  paint(ctx, geometry, property, args) {
    // ...    
  }
}
// 2️⃣ register the worklet: registerPaint(name, workletClass)
registerPaint('checkerboard', CheckerboardPaint);

// ---------------------
// main.js
// 3️⃣ add worklet
CSS.paintWorklet.addModule('worklet.js');

// main.css
// 4️⃣ use the paint worklet
li { 
  background-image: paint(checkerboard);
  border-image: paint(checkerboard);
}
```

paint(ctx, geometry, property, arguments)
- ctx
  - akin to the canvas context, `canvas.getContext('2d')`
  - same full API as canvas context, `ctx.fill()`
- geometry
  - height and width of your element
  - `geometry.height`, `geometry.width`
- property
  - pull in input properties, custom properties in CSS, and used them as values to customise the worklet
  - can use together with CSS Properties and Values API

```js
// worklet.js
class SuperUnderlinePainter {
  // return an array of input properties
  static get inputProperties() {
    return ['--underlineWidth', '--underlineColor'];
  }
  paint(ctx, geometry, properties) {
    // get the property value from CSS
    const underlineWidth = properties.get('--underlineWidth');
    const underlineColor = properties.get('--underlineColor');

    // use them to paint
    ctx.fillStyle = underlineColor;
    ctx.fillRect(0, 0, 3, underlineWidth);
  }
}
// main.css
li { 
  --underlineWidth: 3;
  --underlineColor: red;
  background: paint(super-underline);
}
```

- arguments
  - don't have to share the same property if using the multiple paint worklet on the same element
  - can give different argument for each of the paint worklet

```js
// worklet.js
class SuperUnderlinePainter {
  // return an array of input argument types
  static get inputArguments() {
    return [
      '<number>', // underline width
      '<color>',  // underline color
    ];
  }
  paint(ctx, geometry, properties, args) {
    // get the argument value
    const [underlineWidth, underlineColor] = args;
    // use them to paint
    ctx.fillStyle = underlineColor.cssText;
    ctx.fillRect(0, 0, 3, underlineWidth.value);
  }
}
// main.css
li { 
  background: paint(super-underline, 3, red);
}
```

```js
// worklet.js
class Painter {
  /* 
    define if alphatransparency is allowed
  */
  static get contextOptions() { 
    return { alpha: true }; 
  }
}
```

- take note if using `Math.random()` within paint() to paint a random background
- background will change when you are typing, or resizing, because it repaints
- https://jakearchibald.com/2020/css-paint-predictably-random/

PIZZA NIGHT