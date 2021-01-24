<script>
  import { fade, slide } from 'svelte/transition';
</script>

{#if condition1}
	<div class="parent" transition:fade>
		Parent
		{#if condition2}
			<div class="child" transition:slide|local>
				Child
			</div>
		{/if}
	</div>
{/if}