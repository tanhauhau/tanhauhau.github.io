<script>
  import { fade } from 'svelte/transition';  
</script>

{#each items as item}
  <div in:fade>{item}</div>
{/each}