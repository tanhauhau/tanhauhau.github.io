- https://github.com/sveltejs/svelte/issues/3180
```js
console.log('multiselect_selectedValues_binding updating_selectedValues', updating_selectedValues);
if (!updating_selectedValues) {
  updating_selectedValues = true;
  /*multiselect_selectedValues_binding*/ ctx[4].call(null, value);
  add_flush_callback(() => updating_selectedValues = false);
}
```

- https://github.com/sveltejs/svelte/issues/3364
$$props dependencies?