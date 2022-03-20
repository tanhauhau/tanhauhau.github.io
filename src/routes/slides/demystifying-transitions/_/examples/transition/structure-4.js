export function create_in_transition(node, fn, params) {
  let config = fn(node, params);
  let running = false;

  function go() {
    running = true;
  }

  return {
    start() {
      if (is_function(config)) {
        config = config();
        wait().then(go);
      } else {
        go();
      }
    },

    invalidate() {},

    end() {
      if (running) {
        running = false;
      }
    },
  };
}
