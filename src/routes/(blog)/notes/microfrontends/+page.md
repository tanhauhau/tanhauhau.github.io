---
title: Thoughts on Micro-frontends
tags:
  - micro-frontend
---

https://martinfowler.com/articles/micro-frontends.html

Problems:

- If router is asynchronously injected, what should you do when visit a route that is **not yet injected**?
  - Define a routing schema, eg, when you are visiting `/foo/bar` and your local routing registry does not contain the path, you should visit a predefine location for the script/manifest, eg: `server.com/sites/foo-bar/manifest.json`, and load the script. If there's no such file, it meant there's no such path.

- Multiple webpack built runtime
  - async chunks will rely on the `window['webpackJsonp']` to `require` and `exports` module.
  - multiple webpack built may have conflicting `chunkIds`
  - thankfully this can be solved via [webpack-custom-chunk-id-plugin](https://github.com/darshanlsagar/webpack-custom-chunk-id-plugin)

