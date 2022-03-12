<script>
	import Newsletter from '$lib/Newsletter.svelte';
	import CarbonAd from '$lib/CarbonAd.svelte';
	import '$lib/assets/blog-base.css';
	export let title;
	export let tags = [];
	// export let series;
</script>

<main id="content" class="blog">
	<h1>{title}</h1>

	{#each tags as tag}
		<span>{tag}</span>
	{/each}

	<article>
		<slot />
	</article>
</main>

<footer>
	<Newsletter />
	<CarbonAd />
</footer>

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
	main,
	footer {
		max-width: 675px;
		margin: auto;
		word-break: break-word;
	}
	@media only screen and (max-width: 755px) {
		main,
		footer {
			padding: 0 calc(2 * var(--prism-padding));
		}
	}

	:global(.sitemap li:nth-child(n + 2)) {
		margin-top: 8px;
	}
</style>
