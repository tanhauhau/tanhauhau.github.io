<script>
  import { slide } from 'svelte/transition';

  export let condition;
</script>

{#if condition}
  <div transition:slide />
{/if}