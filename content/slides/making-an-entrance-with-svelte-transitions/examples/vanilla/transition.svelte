<script>
  function swoosh(node, params) {
    return {
      delay: params.delay,       // delay in ms
      duration: params.duration, // duration in ms
      easing: params.easing,     // easing function
      css: (t, u) => {           // css transition
        return `transform: translateX(${t * 100}px)`;
      },
      tick: (t, u) => {           // callback
        node.textContent = t;
      },
    }
  }

  function cubicIn(t) {
    return t * t * t;
  }
</script>

<div
  transition:swoosh={{
    delay: 3000,
    duration: 1000,
    easing: cubicIn,
  }}
/>