---
title: Lazy quantifier in regex
tags:
  - regex
---

Lazy quantifier in regex `?`

Add `?` at the behind `*` or `+` to make them less greedy.

```js
const sentence = `a "witch" and her "broom" is one`;

sentence.match(/".+"/); // `"witch" and her "broom"`
// lazy
sentence.match(/".+?"/); // `"witch"`
```

- https://twitter.com/lihautan/status/1177476277277560832
- https://javascript.info/regexp-greedy-and-lazy
