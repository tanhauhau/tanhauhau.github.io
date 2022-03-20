<script>
	import { page } from '$app/stores';
	import '$lib/assets/blog-base.css';
	import '$lib/assets/code-snippet.css';

	import * as copyable from '$lib/code-snippet/copyable';
	import { getContext } from 'svelte';

	export let title = '';
	export let description = '';
	export let tags = [];

	const { image = '' } = getContext('blog') || {};

	copyable.init();
	// export let series;
</script>

<svelte:head>
	<title>{title} | Tan Li Hau</title>
	<meta name="description" content={description} />
	<meta name="image" content={image} />

	<meta name="og:image" content={image} />
	<meta name="og:title" content={title} />
	<meta name="og:description" content={description} />
	<meta name="og:type" content="website" />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:creator" content="@lihautan" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />

	{#each tags as tag}
		<meta name="keywords" content={tag} />
	{/each}

	<meta itemprop="url" content="https://lihautan.com{$page.url.pathname}" />
	<meta itemprop="image" content={image} />
</svelte:head>

<h1>{title}</h1>

{#each tags as tag}
	<span>{tag}</span>
{/each}

<article class="blog">
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
