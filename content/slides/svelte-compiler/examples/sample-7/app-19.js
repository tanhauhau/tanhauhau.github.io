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

  $$self.$$.update = () => {
    if ('count' in $$self.$$.dirty) {
      $: double = count * 2;
      $$invalidate('double', double);
    }

    if ('double' in $$self.$$.dirty) {
      $: {
        const data = [];

        for (let i = 0; i < double; i++) {
          data[i] = Math.floor(Math.random() * 10);
        }

        values = data;
        $$invalidate('values', values);
      }
    }
  };

  return { count, values, input_handler };
}

class App extends SvelteComponent {
  constructor(options) {
    super();
    init(this, options, instance, create_fragment, safe_not_equal, {});
  }
}

export default App;
