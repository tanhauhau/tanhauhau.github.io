<script lang="ts">
	import { onMount } from 'svelte';

	export let link: string;

	let page = 0;
	let mentions = [];
	let hasMore = false;
	let isFetching = false;

	type WebMention = {
		type: 'entry';
		author: {
			type: 'card';
			name: string;
			photo: string;
			url: string;
		};
		url: string;
		/** @example "2021-09-13T02:43:28Z" */
		'wm-received': string;
		/** @example "https://www.iitter.com/other/12677.html" */
		'wm-source': string;
		'wm-property': 'mention-of';
		'wm-private': boolean;
		content?: {
			html: string;
			text: string;
		};
	};

	onMount(() => {
		getWebMentions();
	});

	async function getWebMentions() {
		if (isFetching) return;
		isFetching = true;
		const response = await fetch(
			`https://webmention.io/api/mentions.jf2?page=${page}&per-page=20&wm-property=mention-of&target=${link}`
		);
		const { children } = await response.json();
		hasMore = children.length === 20;
		const result = (children as WebMention[]).filter(
			(mention) =>
				mention.type === 'entry' &&
				mention['wm-property'] === 'mention-of' &&
				!mention['wm-private']
		);
		mentions = mentions.concat(result);
		page++;
		isFetching = false;
	}

	function sliceHtml(html: string) {
		if (html.length > 100) {
			return html.slice(0, 100) + '...';
		}
		return html;
	}
</script>

{#if mentions.length > 0}
	<hr />
	<h2>WebMentions</h2>
	<ul>
		{#each mentions as mention}
			<li>
				{#if mention.author.name}
					<a class="author" href={mention.author.url} target="_blank" rel="noreferrer noopener">
						{#if mention.author.photo}<img
								class="avatar"
								src={mention.author.photo}
								alt={mention.author.name}
							/>{/if}
						{mention.author.name}
					</a>
				{/if}
				<a href={mention.url} target="_blank" rel="noreferrer noopener"
					>{mention.author.name ? ' mentioned' : 'Mentioned'}</a
				>
				{#if mention.content}
					{#if mention.content.html}
						<div class="content">{@html sliceHtml(mention.content.html)}</div>
					{:else}
						<div class="content">{mention.content.text}</div>
					{/if}
				{:else}
					{'in '}
					<a href={mention.url} target="_blank" rel="noreferrer noopener"
						>{mention.url}</a
					>
				{/if}
				<span class="timestamp">{mention['wm-received'].slice(0, 10)}</span>
			</li>
		{/each}

		{#if hasMore}{#if isFetching}Fetching...{:else}<li class="more" on:click={getWebMentions}>
					Fetch More
				</li>{/if}{/if}
	</ul>
{/if}

<style>
	hr {
		margin-top: 5rem;
	}
	ul {
		padding: 0;
	}
	li {
		margin-bottom: 1em;
		list-style: none;
		border-bottom: 1px solid var(--primary-color);
		padding-bottom: 1em;
	}
	.author {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--primary-color);
		color: inherit;
		text-decoration: none;
		padding: 0.3em 0.65em;
		border-radius: 0.85em;
		font-size: 0.8em;
	}
	.avatar {
		width: 1em;
		height: 1em;
		border-radius: 50%;
		margin-right: 4px;
	}
	.content {
		display: inline;
	}
	.timestamp {
		font-size: 0.8em;
		opacity: 0.5;
	}
	.more {
		cursor: pointer;
	}
</style>
