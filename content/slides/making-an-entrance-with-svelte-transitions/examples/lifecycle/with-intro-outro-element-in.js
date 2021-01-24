// <div transition:fade />
function create_each_block(ctx) {
  return {
    // ...
    i(local) {
      if (!div_intro) {
        add_render_callback(() => {
          div_intro = create_in_transition(
            div, fade, { delay: 10 }
          );
          div_intro.start();
        });
      }
    },
    // ...
  };
}

// {#each array as item}
function create_fragment(ctx) { /* ... */ }
