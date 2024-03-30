// <div transition:fade />
function create_each_block(ctx) { /*... */ }

// {#each array as item}
function create_fragment(ctx) {
  let each_block = create_each_block(ctx);

  return {
    // ...
    i(local) {},
    o(local) {},
    // ...
  };
}
