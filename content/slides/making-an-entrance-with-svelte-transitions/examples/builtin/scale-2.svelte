<script>
  import { scale } from 'svelte/transition';

  export let condition;
</script>

{#if condition}
  <div transition:scale={{ start: 3 }} />
{/if}