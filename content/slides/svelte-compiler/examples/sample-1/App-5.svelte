<script>
  let count = 0;
</script>

{count}
<button on:click={() => count++}>Increment</button>

<style>
  button {
    font-size: 2em;
    background: red;
  }
</style>