Found 570KB (145KB gzipped) in our bundle, contributed by `node-libs-browser`.

This is for webpack v4.35.3

Hmm.. this doesnt ring a bell, what is this package doing in my bundle? Who is importing this package?

After a global search in the repository, I found out that `node-libs-browser` is a dependency of the webpack.

```
// filename: yarn.lock
<!-- highlight-next-line -->
webpack@4.35.3:
  version "4.35.3"
  resolved "https://npm.garenanow.com/webpack/-/webpack-4.35.3.tgz#66bc35ef215a7b75e8790f84d560013ffecf0ca3"
  integrity sha512-xggQPwr9ILlXzz61lHzjvgoqGU08v5+Wnut19Uv3GaTtzN4xBTcwnobodrXE142EL1tOiS5WVEButooGzcQzTA==
  dependencies:
    "@webassemblyjs/ast" "1.8.5"
    "@webassemblyjs/helper-module-context" "1.8.5"
    "@webassemblyjs/wasm-edit" "1.8.5"
    "@webassemblyjs/wasm-parser" "1.8.5"
    acorn "^6.2.0"
    ajv "^6.1.0"
    ajv-keywords "^3.1.0"
    chrome-trace-event "^1.0.0"
    enhanced-resolve "^4.1.0"
    eslint-scope "^4.0.0"
    json-parse-better-errors "^1.0.2"
    loader-runner "^2.3.0"
    loader-utils "^1.1.0"
    memory-fs "~0.4.1"
    micromatch "^3.1.8"
    mkdirp "~0.5.0"
    neo-async "^2.5.0"
    <!-- highlight-next-line -->
    node-libs-browser "^2.0.0"
    schema-utils "^1.0.0"
    tapable "^1.1.0"
    terser-webpack-plugin "^1.1.0"
    watchpack "^1.5.0"
    webpack-sources "^1.3.0"
```

So I looked into webpack source code. Global search for "node-libs-browser" and found it was being imported in `lib/node/NodeSourcePlugin.js`.

Glancing through the code, I'm guessing it's to inject `node-libs-browser` whenever we imports nodejs API, with the `NodeSourcePlugin`, webpack will try to mock it or [ponyfill](https://github.com/sindresorhus/ponyfill) it.

In fact you can check the list of implementations `node-libs-browser` provides:

```js
exports.assert						= require.resolve('assert/');
exports.buffer						= require.resolve('buffer/');
exports.child_process				= null;
exports.cluster						= null;
exports.console						= require.resolve('console-browserify');
exports.constants					= require.resolve('constants-browserify');
exports.crypto						= require.resolve('crypto-browserify');
exports.dgram						= null;
exports.dns							= null;
exports.domain						= require.resolve('domain-browser');
exports.events						= require.resolve('events/');
exports.fs							= null;
...
```

Source: [https://github.com/webpack/node-libs-browser](https://github.com/webpack/node-libs-browser/blob/master/index.js)

So 2 questions are floating in my head:
1. When did I ask webpack to mock these NodeJS API?
1. Where and how did I import NodeJS API?

**When did I ask webpack to mock these NodeJS API?**

Tracing through webpack source code again.

Searching the usage of `NodeSourcePlugin`, found that it was instantiatiated by [`WebpackOptionsApply`](https://github.com/webpack/webpack/blob/master/lib/WebpackOptionsApply.js), with `options.node`.

```js
switch (options.target) {
  case "web":
    // ...
    NodeSourcePlugin = require("./node/NodeSourcePlugin");
    new NodeSourcePlugin(options.node).apply(compiler);
```

Okay, I know `options.node`, it is [documented here](https://webpack.js.org/configuration/node/).

Apparently, the behavior of `NodeSourcePlugin` is that if it is not turn off, it will try to use the polyfill / mock.

So i turn entirely it off, and then when i build, i see warnings, for crytojs

```
Module not found: Error: Can't resolve 'crypto' in '/Users/tanlh/Shopee/shopee_react_native/shopee-lite/node_modules/crypto-js'
 @ /Users/tanlh/Shopee/shopee_react_native/shopee-lite/node_modules/crypto-js/core.js
 @ /Users/tanlh/Shopee/shopee_react_native/shopee-lite/node_modules/crypto-js/md5.js
 @ /Users/tanlh/Shopee/shopee_react_native/packages/fetch-utils/src/fetch-handlers.js
 @ /Users/tanlh/Shopee/shopee_react_native/packages/fetch-utils/src/index.js
 @ /Users/tanlh/Shopee/shopee_react_native/shopee-lite/src/utils/fetch-utils.js
 @ /Users/tanlh/Shopee/shopee_react_native/shopee-lite/src/platform/index.js
 @ /Users/tanlh/Shopee/shopee_react_native/shopee-lite/src/micro-frontend.js
 @ /Users/tanlh/Shopee/shopee_react_native/shopee-lite/src/index.js
 @ multi ./src/utils/polyfills-essentials.js preact/devtools ./src/utils/patch-preact-unsafe.js ./src/index.js
 ```

crypto-js includes xxx into our bundle.

