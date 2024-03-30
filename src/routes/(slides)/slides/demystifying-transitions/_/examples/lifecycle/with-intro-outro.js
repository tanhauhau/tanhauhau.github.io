function create_fragment(ctx) {
  return {
    /* create */  c() { /* ... */ },
    /* mount */   m(target, anchor) { /* ... */ },
    /* update */  p(ctx, dirty) { /* ... */ },

    /* intro */   i(local) { /* ... */ },
    /* outro */   o(local) { /* ... */ },

    /* destroy */ d(detaching) { /* ... */ }
  };
}
