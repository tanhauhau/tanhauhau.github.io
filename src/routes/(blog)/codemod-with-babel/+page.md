---
title: Codemod with babel
date: '2019-03-13T08:00:00Z'
lastUpdated: '2019-09-13T08:00:00Z'
description: 'A template which I used'
label: blog
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

[Updated on 2019-09-13]

I have written a [step-by-step guide](/step-by-step-guide-for-writing-a-babel-transformation) on how to write a babel transformation plugin.

The only difference in this template than the guide is that there's this `manipulateOptions` where you can add additional parser options to enable ES2015+ syntax.