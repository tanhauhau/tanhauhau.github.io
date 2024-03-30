function create_fragment(ctx) {
  return {
    /* create */  c() { /* ... */ },
    /* mount */   m(target, anchor) { /* ... */ },
    /* update */  p(ctx, dirty) { /* ... */ },
    /* destroy */ d(detaching) { /* ... */ }
  };
}
