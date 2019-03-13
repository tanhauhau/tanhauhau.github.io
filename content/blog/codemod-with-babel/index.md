---
title: Codemod with babel
date: '2019-03-13T08:00:00Z'
description: 'A template which I used'
---

A general template that I used:

```js
const babel = require('@babel/core');
const { promisify } = require('util');
const { writeFile } = promisify(require('fs').writeFile);

(async function() {
  const { code } = await babel.transformFileAsync(filename, {
    plugins: [
      function() {
        return {
          manipulateOptions(opts, parserOpts) {
            /*
             add to parserOpts.plugins to enable the syntax
             eg: 
              jsx, flow, typescript, objectRestSpread, pipelineOperator, 
              throwExpressions, optionalChaining, nullishCoalescingOperator, 
              exportDefaultFrom, dynamicImport, ...
            */
            parserOpts.plugins.push(
              'classProperties',
              'classPrivateProperties'
            );
          },
          visitor: {
            // fill in a transformer here
          },
        };
      },
    ],
  });
  await writeFile(filename, code, 'utf-8');
})();
```

[WIP] I am going to explain how it works and how to use it.