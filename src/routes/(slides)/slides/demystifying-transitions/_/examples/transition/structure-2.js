export function create_in_transition(node, fn, params) {
  let config = fn(node, params);

  return {
    start() {
      if (is_function(config)) {
        config = config();
      }
    },

    invalidate() {},

    end() {},
  };
}
