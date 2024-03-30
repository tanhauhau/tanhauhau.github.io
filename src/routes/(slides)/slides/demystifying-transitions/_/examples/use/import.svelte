<script>
  import { fade } from 'svelte/transition';  
</script>

{#each items as item}
  <div>{item}</div>
{/each}