function get_each_context(ctx, i) { /* ... */ }
function create_each_block(ctx) { /* ... */ }
function create_fragment(ctx) { /* ... */ }

function instance($$self, $$props, $$invalidate) {
  
}

class App extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, {});
  }
}

export default App;
