function create_fragment(ctx) {
  let input;

  return {
    c() {
      input = element("input");
    },
    m(target, anchor) {
      insert(target, input, anchor);
    },
    p() {},
    d() {},
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
