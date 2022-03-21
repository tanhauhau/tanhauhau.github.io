<script>
	import { page } from '$app/stores';
	import '$lib/assets/blog-base.css';
	import '$lib/assets/code-snippet.css';

	import * as copyable from '$lib/code-snippet/copyable';
	import { getContext } from 'svelte';
	import WebMentions from './WebMentions.svelte';

	export let title = '';
	export let description = '';
	export let tags = [];
	export let series;

	$: url = `https://lihautan.com${$page.url.pathname}`;

	const { image = '' } = getContext('blog') || {};

	copyable.init();
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

	<meta itemprop="url" content={url} />
	<meta itemprop="image" content={image} />
</svelte:head>

<h1>{title}</h1>

{#if series}
	<a class="tag series" href="/series/{series}">Series: {series}</a>
{/if}

{#each tags as tag}
	<a class="tag" href="/tags/{tag}">{tag}</a>
{/each}

<article class="blog">
	<slot />
</article>

<WebMentions link={url} />

<style>
	.tag {
		padding: 4px 8px;
		margin-right: 12px;
		margin-bottom: 12px;
		font-size: 0.6em;
		font-weight: 500;
		background: white;
		color: var(--secondary-color);
		border: 2px solid var(--secondary-color);
		box-shadow: 2px 2px var(--secondary-color);
		text-decoration: none;
		display: inline-block;
		transition: var(--easing);
	}
	.tag:hover {
		transform: translate(-2px, -2px);
		box-shadow: 5px 5px var(--secondary-color);
	}
	.series {
		--secondary-color: blue;
	}
</style>
