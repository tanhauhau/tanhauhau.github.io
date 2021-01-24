<script>
  import { fade } from 'svelte/transition';  

  let items = $$$$;
</script>

{#each items as item}
  <div out:fade={{ duration: 1000, delay: 500 }}>{item}</div>
{/each}