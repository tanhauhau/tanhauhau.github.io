---
title: Reduce minified code size by property mangling
date: '2020-08-08T08:00:00Z'
tags: 
  - JavaScript
  - Terser
label: blog
---

## What is Mangling Property

Assume you have the following JavaScript code:

```js
class Human {
  constructor(chewAmount) {
    this.chewAmount = 3;
  }
  eat() {
    for (let amount = 3; amount < this.chewAmount; amount++) {
      this.chew();
    }
  }
  chew() {}
}

function getHumanEating() {
  const lihau = new Human();
  return lihau.eat();
}
```

**Original: 268 Bytes**

If you minify this with the default options with [Terser](https://github.com/terser/terser), you probably get something like:

```js
class Human {
  constructor(chewAmount) {
    this.chewAmount = 3;
  }
  eat() {
    for (let i = 3; i < this.chewAmount; i++) {
      this.chew();
    }
  }
  chew() {}
}
function getHumanEating() {
  return new Human().eat();
}
```

**207 Bytes (77.2%)**

_(Usually Terser would compress whitespace too, but for ease of reading, allow me to keep the whitespace)_

Your code still behaves the same, even though the variable name has changed.

This behavior of renaming variable name to compress JavaScript code is called **Mangle**.

Terser has several [Mangle options](https://github.com/terser/terser#mangle-options), that allows you to control whether or not to mangle **class name**, **function name**, **property name**, or specify any reserved keywords to not mangle, or should it mangle global variable.

If the above code is written within a ES Module, then probably we wont refer the class `Human` globally, rather refer it through `import`, then the name of the class probably does not matter:

```js
// Terser option: { mangle: { module: true } }
class H {
  constructor(chewAmount) {
    this.chewAmount = 3;
  }
  eat() {
    for (let i = 3; i < this.chewAmount; i++) {
      this.chew();
    }
  }
  chew() {}
}
function e() {
  return new H().eat();
}
export { H as Human, e as getHumanEating };
```

**186 Bytes (69.4%)**

But can we do better?

Well, if you look at the code, the property named `chewAmount` takes up 20 characters, which is almost 10% of the code.

If we rename all the property name to 1 character variable, then we would end up with a much smaller code:

```js
class H {
  constructor(t) {
    this.c = 3;
  }
  a() {
    for (let t = 3; t < this.c; t++) this.s();
  }
  s() {}
}
function e() {
  return new H().a();
}
export { H as Human, e as getHumanEating };
```

**107 Bytes (39.9%)**

If it ends up with a much smaller bundle, should we rename our property name and method name to a shorter name? And why didn't Terser do this by default?

**Should we rename our property name and method name to something short?**

No! That would hurt the readability of the code. 😥

Also, what if someone else imports the class `Human` and wants to use the property `chewAmount`?

He would have to rename it to `human.c` instead of `human.chewAmount` and probably scratching his head everytime he reads his code, wondering what does `human.c` mean?

**Why Terser didn't mangle property name by default?**

Because property mangling requires certain assumption on your code, therefore it is marked as **very unsafe** in the [Terser documentation](https://github.com/terser/terser#cli-mangling-property-names---mangle-props) to turn it on entirely.

### Why is property mangling considered unsafe?

If you are a library author, or you wrote a module that will be used by others, and if you mangle the property of the library / module **alone**, all your method name, object property name will be mangled, and therefore all your APIs will be broken!

```js
/// filename: source.js
export function doSomething({ paramA, paramB }) {
  return { sum: paramA + paramB };
}
export class Car {
  constructor({ model }) {
    this.model = model;
  }
  drive() {}
}
```

```js
/// filename: source.min.js
export function doSomething({ o: t, t: o }) {
  return { m: t + o };
}
export class Car {
  constructor({ s: t }) {
    this.s = t;
  }
  i() {}
}
```

Your user that calls `doSomething({ paramA: 1, paramB: 2 })` or `car.drive()` will not work with the minified code!

The same ways goes if you are importing some other library or module, and you mangle your code **alone**, your code will be broken too!

```js
/// filename: source.js
import { doSomething } from 'some-library';

doSomething({ paramA: 1, paramB: 2 });
```

```js
/// filename: source.min.js
import { doSomething as r } from 'some-library';

r({ m: 1, o: 2 });
```

I ran both the code above through the same Terser configuration, which means it also serves as a good example that the property name Terser mangles into is not consistent. It is computed and assigned at _"random"_. You should not expect that `paramA` always get mangled into `m` everytime!

In summary, property mangling will break your code if you mangle your code alone. It will break at the boundary of your code, where you exports your functions or class that relies on **public property or method**; or where you import functions or class which you **pass in an object or calls a public method**.

If you **do neither of those**, you are actually safe to mangle all properties by default.

If you have a standalone script that:

- does not import nor export anything
- does not set or read any property from the global scope (\*)

Then you are safe to mangle all your properties. Property or method name across the file will be mangled consistently:

```js
/// filename: source.js
class CarA {
  drive() {}
}
class CarB {
  drive() {}
}
const car = Math.random() > 0.5 ? new CarA() : new CarB();
car.drive();

foo({ drive: 'bar' });
```

```js
/// filename: source.min.js
class s {
  s() {}
}
class e {
  s() {}
}
const a = Math.random() > 0.5 ? new s() : new e();
a.s(), foo({ s: 'bar' });
```

If you use the property or method named `"drive"`, it will be mangled to the same name throughout the file.

In the example above, the method `drive` in both classes and the property `drive` in `foo({ drive: 'bar' })` means different things, but they are mangled into the same name, `s`.

#### Set or get property from the global scope

**Rule of thumb:** If you set or get property from global scope, property mangling blindly will break your code.

Of course, there's caveat of when this might be safe, protected by `default: false` options that you can turn on at your own risk. 🙈

**Accessing DOM properties or method from built-in Objects**

Terser keeps a list of property names that exempt from mangling, such as:

- DOM properties: `window.location`, `document.createElement`
- Methods of built-in objects: `Array.from`, `Object.defineProperty`

The list can be found in [domprops.js](https://github.com/terser/terser/blob/aacd5770d9364ecaca80ff450fe329e021ac98aa/tools/domprops.js) and [`find_builtins`](https://github.com/terser/terser/blob/aacd5770d9364ecaca80ff450fe329e021ac98aa/lib/propmangle.js#L67).

This behavior is protected by the `builtins` option in the [Mangle properties option](https://github.com/terser/terser#mangle-properties-options), set it to `true` to mangle builtin properties as well. **Override at your own risk**

**Accessing property or method of a undeclared variable**

Variable that is not declared within the code, can be considered as global variable that is defined outside. Their properties or methods will not be mangled too.

You can override this behavior via the `undeclared` option in the [Mangle properties option](https://github.com/terser/terser#mangle-properties-options), set it to `true` to mangle them too.

### Mangling for rollup / webpack bundled code

If you add [terser-webpack-plugin](https://webpack.js.org/plugins/terser-webpack-plugin/) or [rollup-plugin-terser](https://www.npmjs.com/package/rollup-plugin-terser) to your bundling step, are you safe to mangle properties?

**Rule of thumb:** If your bundler emits more than 1 file, No.

This means any bundling set up that involves code-splitting.

It is not safe because, terser is run after the code is split into separate files. Thus, the property or method names across files will not be mangled consistently.

## How to mangle property responsibly and safely

With so much restrictions in mind, you may wonder how can I utilise property mangling safely and responsibly?

Property mangling is not a all-or-nothing option in Terser, there's a few options you can play around to do property mangling safely.

### Private property

In the following example, the only publicly documented method in the class `Car` is `driveTo()`, so it is okay to mangle other private methods.

```js
/// filename: source.js
class Car {
  driveTo({ destination }) {
    this.destination = destination;
    this.calculateRoute();
    this.startDriving();
  }
  calculateRoute() {
    this.planRoute(this.currentLocation, this.destination);
  }
  startDriving() {}
  planRoute() {}
}
```

We want to mangle `this.currentLocation`, `this.destination`, `this.calculateRoute`, `this.startDriving`, `this.planRoute`, but give `this.driveTo` untouched.

You can choose to either

**1. mangle all methods and properties, except a reserved list of names:**

```js
/// filename: terser_options.js
const terserOptions = {
  mangle: {
    properties: {
      reserved: ['driveTo'],
    },
  },
};
```

**2. specify a list of names to be mangled with a regex:**

```js
/// filename: terser_options.js
const terserOptions = {
  mangle: {
    properties: {
      regex: /^(destination|calculateRoute|currentLocation|startDriving|planRoute)$/,
    },
  },
};
```

Here, a [unofficial JavaScript naming convention](https://www.robinwieruch.de/javascript-naming-conventions) for private method / properties come in handy. Often times, when a variable name starts with `_`, it is intended to be private.

```js
/// filename: source.js
class Car {
  driveTo({ destination }) {
    this._destination = destination;
    this._calculateRoute();
    this._startDriving();
  }
  _calculateRoute() {
    this._planRoute(this._currentLocation, this._destination);
  }
  _startDriving() {}
  _planRoute() {}
}
```

This way, it makes our regex much easier:

```js
/// filename: terser_options.js
const terserOptions = {
  mangle: {
    properties: {
      regex: /^_/,
    },
  },
};
```

### Consistent property mangling across subsequent minifications

If you want `_calculateRoute` to always mangled to the same name no matter how much you have changed the input file, the `nameCache` may come in handy.

`nameCache` is the internal state of Terser, that can be serialised and deserialised to seed the Terser mangling state.

```js
const fs = require('fs').promises;
const terser = require('terser');
const nameCache = {};
await terser.minify(code, {
  nameCache,
});

// serialise and store `nameCache`
await fs.writeFile('nameCache.json', JSON.stringify(nameCache), 'utf-8');

// deserialise and seed Terser
const nameCache = JSON.parse(await fs.readFile('nameCache.json', 'utf-8'));
await terser.minify(code, {
  nameCache,
});
```

### Consistent property mangling across different builds

What if you have multiple independent projects, and you want to make sure property mangling work across these projects?

If the variables you mangled are private properties or methods, then, you don't have an issue with this. Different projects should be nicely encapsulated, and should not depends on internal properties or methods.

So, what I am describing now is for public API methods and properties.

What if you want to mangle them as well, how do you make sure that they wont break the user after mangling the public methods or properties?

Since it involves public methods and properties, additional steps in setting up is understandable.

In that case, I would recommend maintain a name mapping of how the properties should mangle into, and use [babel-plugin-transform-rename-properties](https://www.npmjs.com/package/babel-plugin-transform-rename-properties) to rename them.

The name mapping is a manually curated list of names of your public properties and methods, and only need to be updated whenever there's a change in your public API.

Think of it as part of your documentation, which should be updated whenever you change your public API.

```js
/// filename: babel.config.js
const nameMapping = {
  driveTo: 'd', // rename all `.driveTo` to `.d`
};

return {
  plugins: [
    [
      'babel-plugin-transform-rename-properties',
      {
        rename: nameMapping,
      },
    ],
  ],
};
```

## Misc

### Webpack and Rollup

Throughout the article, we mentioned Terser and `terserOptions`, and didnt really go into how you would use it for projects bundled with [webpack](https://webpack.js.org/) or [rollup](https://rollupjs.org/).

For webpack user, you can use [terser-webpack-plugin](https://github.com/webpack-contrib/terser-webpack-plugin/).

```js
/// filename: webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          mangle: {
            properties: {
              regex: /^_/,
            },
          },
        },
      }),
    ],
  },
};
```

For rollup user, you can use [rollup-plugin-terser](https://www.npmjs.com/package/rollup-plugin-terser)

```js
/// filename: rollup.config.js
import { terser } from 'rollup-plugin-terser';
rollup({
  plugins: [
    terser({
      mangle: {
        properties: {
          regex: /^_/,
        },
      },
    }),
  ],
});
```

### A curious case of Preact

> The rabbit hole of how to mangle property names starts with investigating the [Preact](https://github.com/preactjs/preact) [Suspense bug](https://github.com/preactjs/preact/pull/2661), but that would be a story for another time.

Preact is a fast 3kB React alternative, with the same modern API.

Property mangling contributed an important part to keep the library slim.

| Without mangling          | With mangling                           |
| ------------------------- | --------------------------------------- |
| 10.7 KB minified          | 9.7 Kb minified (reduced ~10%)          |
| 4.2 KB minified + gzipped | 3.9 KB minified + gzipped (reduced ~5%) |

There's several different builds for `preact`:

- `preact/core`
- `preact/compat` - a compat layer on top of preact to provide all React API
- `preact/debug` - a layer on top of `preact/core` that provides a better debugging experience
- `preact/devtools` - the bridge between `preact/core` and the devtools extension.

To have a consistent mangle properties across different builds, `babel-plugin-transform-rename-properties` is used, and the name mapping is stored at [`mangle.json`](https://github.com/preactjs/preact/blob/c2c9b9414bc4202b2ac487b55be626f955fba65f/mangle.json).

> Check out this Pull Request that adds `babel-plugin-transform-rename-properties` into Preact: https://github.com/preactjs/preact/pull/2548

For mangling private properties, the bundling process of Preact is abstracted in [microbundle](https://github.com/developit/microbundle), which reads the mangle options from `mangle.json` or the `mangle` property from `package.json`. See [Mangling Properties for microbundle](https://github.com/developit/microbundle#mangling-properties).

## Closing Note

We've covered what is property mangling and all the caveats come along with it.

With the full grasp of the caveats, we looked at various tactics that we can use to utilise property mangling to reduce our minified code output.

## Further Reading

- [Terser Mangle options](https://github.com/terser/terser#mangle-options)
- [microbundle Mangling Properties](https://github.com/developit/microbundle#mangling-properties)
- [babel-plugin-transform-rename-properties](https://www.npmjs.com/package/babel-plugin-transform-rename-properties)
