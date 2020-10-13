// <div transition:fade />
function create_each_block(ctx) {
  return {
    // ...
    i(local) {
      add_render_callback(() => {
        if (!div_transition) {
          div_transition =
            create_bidirectional_transition(
              div, fade, { delay: 10 }, true
            );
        }
        div_transition.run(1);
      });
    },
    o(local) {},
    // ...
  };
}

// {#each array as item}
function create_fragment(ctx) {
  /* ... */
}
