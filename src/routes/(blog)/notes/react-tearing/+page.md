---
title: React Tearing
tags:
  - tearing
  - rendering
  - zombie child
---

Saw an issue about [fixing tearing issue in React](https://github.com/facebook/react/pull/16623)

A good explanation of tearing is here: https://stackoverflow.com/questions/54891675/what-is-tearing-in-the-context-of-the-react-redux

In short, tearing is an potential issue when React concurrent mode interacts with external state management tools.

React Concurrent mode allows React to render asynchronously. Rendering phase is no longer happening at one go, but split up into multiple small chunks.
And the tearing issue arise if the external state changes in the middle of rendering phase, causing part of the application rendered 
with the old data, and part with the latest data.

This somehow reminds me of the zombie child, stale props issue of redux: https://kaihao.dev/posts/Stale-props-and-zombie-children-in-Redux
