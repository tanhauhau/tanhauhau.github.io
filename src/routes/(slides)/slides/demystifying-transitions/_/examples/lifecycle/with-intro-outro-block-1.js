// <div transition:fade />
function create_each_block(ctx) { /*... */ }

// {#each array as item}
function create_fragment(ctx) {
  let each_block = create_each_block(ctx);

  return {
    // ...
    i(local) {
      transition_in(each_block);
    },
    o(local) {
      transition_out(each_block);
    },
    // ...
  };
}
