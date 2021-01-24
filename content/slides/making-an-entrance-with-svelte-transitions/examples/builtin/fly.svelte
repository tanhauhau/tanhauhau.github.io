<script>
  import { fly } from 'svelte/transition';

  export let condition;
</script>

{#if condition}
  <div transition:fly={{ x: 50, y: 100 }} />
{/if}