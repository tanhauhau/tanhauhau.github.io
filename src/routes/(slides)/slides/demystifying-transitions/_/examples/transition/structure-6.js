export function create_in_transition(node, fn, params) {
  let config = fn(node, params);
  let running = false;

  function go() {
    running = true;
  }

  let started = false;

  return {
    start() {
      if (started) return;

      if (is_function(config)) {
        config = config();
        wait().then(go);
      } else {
        go();
      }
    },

    invalidate() {
      started = false;
    },

    end() {
      if (running) {
        running = false;
      }
    },
  };
}
