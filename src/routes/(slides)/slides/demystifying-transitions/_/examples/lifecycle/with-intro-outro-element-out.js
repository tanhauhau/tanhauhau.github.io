// <div transition:fade />
function create_each_block(ctx) {
  return {
    // ...
    i(local) {
      if (div_outro) div_outro.end(1);
    },
    o(local) {
      div_outro = create_out_transition(
        div, fade, { delay: 10 }
      );
    },
    // ...
  };
}

// {#each array as item}
function create_fragment(ctx) { /* ... */ }
