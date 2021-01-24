<script>
  import { fly } from 'svelte/transition';
  import { cubicIn } from 'svelte/easing';

  export let condition;
</script>

{#if condition}
  <div transition:fly={{ x: 200, easing: cubicIn }} />
{/if}