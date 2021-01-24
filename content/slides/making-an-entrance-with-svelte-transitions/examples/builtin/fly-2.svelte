<script>
  import { fly } from 'svelte/transition';

  export let condition;
</script>

{#if condition}
  <div transition:fly={{ y: -50 }} />
{/if}