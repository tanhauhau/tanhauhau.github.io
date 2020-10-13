<script>
  import { fade } from 'svelte/transition';  
</script>

{#each items as item}
  <div out:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}