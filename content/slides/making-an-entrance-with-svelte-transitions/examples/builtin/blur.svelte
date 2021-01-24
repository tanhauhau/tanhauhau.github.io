<script>
  import { blur } from 'svelte/transition';

  export let condition;
</script>

{#if condition}
  <div transition:blur={{ amount: 10 }} />
{/if}