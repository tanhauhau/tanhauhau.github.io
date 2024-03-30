const App = create_ssr_component(
  ($$result, $$props, $$bindings, $$slots) => {
    let count = 5;
    let values;

    let double = count * 2;
    $: {
      const data = [];
      for (let i = 0; i < double; i++) {
        data[i] = Math.floor(Math.random() * 10);
      }
      values = data;
    }

    return '';
  }
);

export default App;
