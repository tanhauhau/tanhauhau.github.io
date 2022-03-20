<script>
	import Folder from './Folder.svelte';
	export let folder = [];
	export let examples = [];
	let highlightedPath;
	let step = -1;
</script>

<Folder {folder} bind:highlightedPath />

{#each examples as example}
	<div on:click={() => (highlightedPath = example.target)}>
		{example.code}
	</div>
{/each}

<style>
	div {
		margin-top: 8px;
		cursor: pointer;
	}
</style>
