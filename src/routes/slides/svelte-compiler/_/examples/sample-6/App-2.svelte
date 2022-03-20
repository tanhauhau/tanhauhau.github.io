<script>
  let count = 5;
  let values;

  $: double = count * 2;
  $: {
    const data = [];
    for (let i = 0; i < double; i++) {
      data[i] = Math.floor(Math.random() * 10);
    } 
    values = data;
  }
</script>

<input bind:value={count} />

{#each values as value}
  <div class:even={value % 2 === 0} class="svelte-xxx">{value}</div>
{/each}

<style>
  .even.svelte-xxx {
    color: red;
  }
</style>