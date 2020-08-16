---
title: Getting module dependency from Node.js
tags:
  - NodeJs
---

## module.children

- [module.children](https://nodejs.org/api/modules.html#modules_module_children) can give you a list of modules required by the current module.
  - can use the dependency tree of current module

## require and watch
- requires a file, and pass a callback whenever the module + dependencies changed

```js
const chokidar = require('chokidar');

function getValueAndDependencies(requirePath) {
  const value = require(requirePath);
  const valueMod = module.children.find(mod => mod.id === requirePath);

  const deps = [];
  const stack = [valueMod];
  while (stack.length) {
    const child = stack.pop();
    deps.push(child.id);
    child.children.forEach(mod => stack.push(mod));
  }
  return { value, deps };
}

function requireAndWatch(requirePath, callback) {
  let dependencies = [],
    value;
  const watcher = chokidar.watch([]);
  watcher.on('ready', function() {
    watcher.on('change', function() {
      startWatch();
    });
  });

  function startWatch() {
    watcher.unwatch(dependencies);
    dependencies.forEach(dep => {
      delete require.cache[dep];
    });

    ({ value, deps: dependencies } = getValueAndDependencies(requirePath));

    watcher.add(dependencies);
    callback(value);
  }

  startWatch();
}

module.exports = requireAndWatch;
```
  