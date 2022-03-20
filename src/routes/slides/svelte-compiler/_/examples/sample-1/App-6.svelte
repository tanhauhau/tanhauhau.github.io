<script>
  let count = 0;

  $: double = count * 2;
</script>

{count} x 2 = {double}
<button on:click={() => count++}>Increment</button>

<style>
  button {
    font-size: 2em;
    background: red;
  }
</style>