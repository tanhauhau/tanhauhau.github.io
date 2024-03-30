---
title: ESM in NodeJS
tags:
  - NodeJS
  - ESM
---

To enable es module system in nodejs, it's not as simple as enabling the `--experimental-modules` flag.

You need:
- **use `.mjs` file format to hint as a es module** or **at the nearest `package.json`, specify `"type": "module"`**
- use `import` statement to "require" the module file -> meaning your main file also need to be a `.mjs` file.
- to replace all "require" and "module.exports" in `.mjs` file to `import`.
  - as an escape hatch, you can use [`module.createRequire`](https://nodejs.org/api/modules.html#modules_module_createrequire_filename)
  - see https://nodejs.org/api/esm.html#esm_no_code_require_code_code_exports_code_code_module_exports_code_code_filename_code_code_dirname_code
- es modules import file must specify extension, `.mjs` (es modules), `.cjs` (commonjs) or `.js` (depends on nearest `package.json#type`). 
- for commonjs to import es modules, the only way is to use dynamic import `import()`.
