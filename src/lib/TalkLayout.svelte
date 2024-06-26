<script>
	import { page } from '$app/stores';
	import '$lib/assets/blog-base.css';
	import '$lib/assets/code-snippet.css';

	import * as copyable from '$lib/code-snippet/copyable';
	import { getContext } from 'svelte';
	import WebMentions from '$lib/WebMentions.svelte';
	import RemarkTableOfContent from '$lib/TableOfContent.svelte';
	import { formatDate } from '$lib/utils/date';
	import ldJsonScript from '$lib/seo/ldjson';

	export let title = '';
	export let description = '';
	export let tags = [];
	export let occasion;
	export let occasionLink;
	export let videoLink;
	export let venue;
	export let venueLink;
	export let tableOfContents;
	export let date;
	export let lastUpdated;

	const { image = '' } = getContext('blog') || {};

	const jsonLdAuthor = {
		['@type']: 'Person',
		name: 'Tan Li Hau'
	};

	copyable.init();

	$: url = `https://lihautan.com${$page.url.pathname}`;
	$: dateString =
		(date ? formatDate(date) : '') +
		(lastUpdated && lastUpdated !== date ? ` (Last updated ${formatDate(lastUpdated)})` : '');
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

	{@html ldJsonScript({
		'@context': 'https://schema.org',
		'@type': 'Article',
		author: jsonLdAuthor,
		copyrightHolder: jsonLdAuthor,
		copyrightYear: '2022',
		creator: jsonLdAuthor,
		publisher: jsonLdAuthor,
		description,
		headline: title,
		name: title,
		inLanguage: 'en'
	})}

	{@html ldJsonScript({
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		description: 'Breadcrumbs list',
		name: 'Breadcrumbs',
		itemListElement: [
			{
				'@type': 'ListItem',
				item: { '@id': 'https://lihautan.com', name: 'Homepage' },
				name: 'Homepage',
				position: 1
			},
			{
				'@type': 'ListItem',
				item: { '@id': `https://lihautan.com${$page.url.pathname}`, name: title },
				name: title,
				position: 2
			}
		]
	})}
</svelte:head>

<h1>{title}</h1>

<ul>
	<li><span class="icon">🗓</span>{dateString}</li>
	{#if occasion && occasionLink}
		<li>
			<span class="icon">👥</span><a href={occasionLink}>{occasion}</a>
		</li>
	{/if}
	{#if venue}
		<li class="venue">
			<span class="icon">📍</span>{#if venueLink}<a href={venueLink}>{venue}</a>{:else}{venue}{/if}
		</li>
	{/if}
	{#if videoLink}
		<li class="video"><span class="icon">📹</span><a href={videoLink}>Video</a></li>
	{/if}
</ul>

{#each tags as tag}
	<a class="tag" href="/tags/{tag}/">{tag}</a>
{/each}

{#if tableOfContents}<RemarkTableOfContent {tableOfContents} />{/if}

<article class="blog">
	<slot />
</article>

<WebMentions link={url} />

<style>
	li {
		margin-bottom: 0.2em;
	}
	ul {
		list-style: none;
		padding-left: 0;
	}
	.icon {
		margin-right: 0.4em;
	}

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
</style>
