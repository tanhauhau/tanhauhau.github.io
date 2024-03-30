function get_each_context(ctx, i) {
  return {
    ...ctx,
    value: ctx.values[i],
  }
}

function create_each_block(ctx) {
  return {
    c() {},
    m() {},
    p() {},
    d() {},
  };
}

function create_fragment(ctx) {
  let input, dispose;

  return {
    c() {
      input = element("input");
      create_each_blocks(ctx.values, create_each_block, get_each_context);
    },
    m(target, anchor) {
      insert(target, input, anchor);
      set_input_value(input, ctx.count);

      dispose = listen(input, "input", ctx.input_handler);
    },
    p(ctx, dirty) {
      if ('count' in dirty && input.value !== ctx.count) {
        set_input_value(input, ctx.count);
      }
    },
    d(detaching) {
      if (detaching) detach(input);
      dispose();
    },
  };
}

function instance($$self, $$props, $$invalidate) {
  
}

class App extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, {});
  }
}

export default App;
