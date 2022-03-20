function get_each_context(ctx, i) { /* ... */ }
function create_each_block(ctx) { /* ... */ }
function create_fragment(ctx) { /* ... */ }

function instance($$self, $$props, $$invalidate) {
  let count = 5;
  let values;

  function input_input_handler() {
    count = this.value;
    $$invalidate('count', count);
  }

  $$self.$$.update = () => { /* */ };

  return { count, values, input_handler };
}

class App extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, {});
  }
}

export default App;
