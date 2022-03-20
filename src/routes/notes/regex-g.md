---
title: "'g' flag in regex"
tags:
  - regex
---

## test and exec with `g`

When having a Regex with `g` (global) flag, the regex instance will store some internal state about the last match.

This happens with `regex.test()` and `regex.exec()`

```js
const sentence = 'car boats car';
const regex = /car/g;

regex.test(sentence); // true
regex.test(sentence); // true
regex.test(sentence); // false

regex.exec(sentence); // [ 'car', index: 0, input: 'car boats car' ]
regex.exec(sentence); // [ 'car', index: 10, input: 'car boats car' ]
regex.exec(sentence); // null
```

This is useful for the following match + while loop pattern:

```js
const regex = /car/g;
let match;

while ((match = regex.exec(sentence))) {
  console.log(match.index);
}
```

**Note the state is stored in the regex instance**, using a different regex instance will not have this behavior:

```js
const sentence = 'car boats car';
const regex = /car/g;

/car/g.exec(sentence); // [ 'car', index: 0, input: 'car boats car' ]
/car/g.exec(sentence); // [ 'car', index: 0, input: 'car boats car' ]
/car/g.exec(sentence); // [ 'car', index: 0, input: 'car boats car' ]
/car/g.exec(sentence); // [ 'car', index: 0, input: 'car boats car' ]
// ...
```

## Related Links

- https://stackoverflow.com/questions/15276873/is-javascript-test-saving-state-in-the-regex
