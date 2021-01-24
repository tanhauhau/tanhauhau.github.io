<script>
  import { scale } from 'svelte/transition';

  export let condition;
</script>

{#if condition}
  <div transition:scale={{ start: 0 }} />
{/if}