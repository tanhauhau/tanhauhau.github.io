function create_fragment(ctx) {
  return {
    c() {},
    m() {},
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
