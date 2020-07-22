https://github.com/sveltejs/svelte/issues/4993

- $$props always get `$$invalidate` whenever `.$set` is called, may be called with an empty object
- not sure what's the best way to implement it?
- consideration: 
  - least code added?

- add a runtime utils from @is_empty
  - referenced using `@` prefix, 
  `src/compiler/compile/Component.ts#245`
  - it also auto suffix `_dev`, you can have prod / dev implementation
  - choose based on compile options.dev

----

https://github.com/sveltejs/svelte/issues/3364

$$props not reactive?

```
<script>
export let a;
</script>
<slot props={$$props} {a}/>
```

```js
p(ctx, [dirty]) {
  if (default_slot) {
    if (default_slot.p && dirty & /*$$scope, a*/ 5) {
      update_slot(default_slot, default_slot_template, ctx, /*$$scope*/ ctx[2], dirty, get_default_slot_changes, get_default_slot_context);
    }
  }
},
```

see difference?

where to find ?
- render related code
 -> render_dom / render_ssr?
 -> name of nodes
- lifecycle?
  --> block.chunks.update ?
  --> block.chunks.xxx ?
- 
