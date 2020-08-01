---
title: "Contributing to Svelte - Fixing issue #4392"
date: '2020-05-23T08:00:00Z'
tags: 
  - Svelte
  - JavaScript
  - Open Source
series: Contributing to Svelte
description: I am going to tell you an anecdote on how I investigated and fixed a bug in Svelte. I documented down my train of thoughts as detailed as possible. I hope this gives anyone who is reading, a glimpse on how to work on the Svelte source code.
wip: true
---


supports optional chaining

- ESTree specifications PR https://github.com/estree/estree/pull/204
- https://github.com/estree/estree/blob/master/es2020.md

- https://www.npmjs.com/package/@types/estree
- MR https://github.com/DefinitelyTyped/DefinitelyTyped/pull/45470
- learn from the previous MR https://github.com/DefinitelyTyped/DefinitelyTyped/pull/43103