---
title: Async initialisation of node lib
tags:
  - nodejs
---

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">I have a library that needs to be called synchronously but has an async initialization step.<br><br>Can I use pkg.exports or something else to use top-level await when supported, and fallback to export the initialization promise so that Node.js 12-13 users can await it themselves?</p>&mdash; Nicolò Ribaudo 🏳️‍🌈 (@NicoloRibaudo) <a href="https://twitter.com/NicoloRibaudo/status/1304710001982877697?ref_src=twsrc%5Etfw">September 12, 2020</a></blockquote>

```json
// package.json
{
  "name": "your-pkg",
  "exports": {
    ".": "./with-top-level-await.js",
    "./init": "./without-top-level-await.js"
  }
}
```

```js
// >= node 14 (with top-level await support)
import api from 'your-pkg';

// < node 14
import init from 'your-pkg/init';

(async function() {
  const api = await init();
})();
```