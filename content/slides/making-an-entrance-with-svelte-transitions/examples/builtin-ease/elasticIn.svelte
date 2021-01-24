<script>
  import { fly } from 'svelte/transition';
  import { elasticOut } from 'svelte/easing';

  export let condition;
</script>

{#if condition}
  <div transition:fly={{ x: 200, easing: elasticOut }} />
{/if}