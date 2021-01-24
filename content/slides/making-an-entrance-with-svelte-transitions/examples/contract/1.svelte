<script>
  function myCustomTransition(node) {
    return {
      delay: 0,        // delay in ms
      duration: 300,   // duration in ms
      easing: linear,  // easing function
      css: (t, u) => { // css transition
        return `transform: translateX(${t * 100}px)`;
      },
      tick: (t, u) => { // callback
        node.styles.color = getColor(t);
      },
    }
  }
</script>

<div transition:myCustomTransition />