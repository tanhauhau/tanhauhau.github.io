<script>
	import '$lib/assets/blog-base.css';
	import '$lib/assets/code-snippet.css';

	import * as copyable from '$lib/code-snippet/copyable';

	export let title;
	export let tags = [];

	copyable.init();
	// export let series;
</script>

<h1>{title}</h1>

{#each tags as tag}
	<span>{tag}</span>
{/each}

<article>
	<slot />
</article>

<style>
	span {
		padding: 4px 8px;
		margin-right: 12px;
		font-size: 0.6em;
		font-weight: 500;
		background: white;
		color: var(--secondary-color);
		border: 2px solid var(--secondary-color);
		box-shadow: 2px 2px var(--secondary-color);
	}

	:global(.sitemap li:nth-child(n + 2)) {
		margin-top: 8px;
	}
</style>
