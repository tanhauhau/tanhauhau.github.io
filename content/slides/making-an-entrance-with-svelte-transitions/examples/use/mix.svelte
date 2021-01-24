<script>
  import { fade, fly } from 'svelte/transition';  

  let items = $$$$;
</script>

{#each items as item}
  <div
    in:fly={{ y: 30, duration: 500 }}
    out:fade={{ duration: 1000 }}
  >{item}</div>
{/each}