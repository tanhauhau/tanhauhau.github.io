<script>
  import { fade } from 'svelte/transition';  

  let items = $$$$;
</script>

{#each items as item}
  <div transition:fade>{item}</div>
{/each}