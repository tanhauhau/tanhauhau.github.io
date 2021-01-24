<script>
  import { fly } from 'svelte/transition';

  export let condition;
</script>

{#if condition}
  <div transition:fly={{ x: 200 }} />
{/if}