---
title: babel flow pragma bug
tags:
  - babel
  - flow
---

## The article

[Parsing error when calling generic function with type arguments](/parsing-error-flow-type-parameter-instantiation)

## Materials for the babel flow bug article

- https://flow.org/en/docs/config/options/#toc-max-header-tokens-integer
- https://github.com/facebook/flow/commit/ef73d5a76fbc52c191e3e0bbbf767c52b78f3fad
- https://github.com/facebookarchive/node-haste/blob/master/README.md
- https://github.com/babel/babylon/pull/76/files
- https://astexplorer.net/

a<x>(y);
// @flow
a<x>(y);

https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=IYHgHgfAFAnglAbgFAHoUAIACAzANgewHclRJZEg&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=es2015%2Cflow%2Cenv&prettier=false&targets=&version=7.4.3&externalPlugins=%40babel%2Fplugin-syntax-flow%407.2.0

- issues
- https://github.com/babel/babel/issues/9240
- https://github.com/facebook/flow/commit/ef73d5a76fbc52c191e3e0bbbf767c52b78f3fad
- https://flow.org/en/docs/config/options/#toc-max-header-tokens-integer

