<script>
	import { setContext } from 'svelte';
	import CarbonAd from '$lib/CarbonAd.svelte';
	import { page } from '$app/stores';
	import Links from '$lib/Links.svelte';
	import Sidebar from '$lib/Sidebar.svelte';
	import { navigating } from '$app/stores';
	import PreloadingIndicator from '$lib/PreloadingIndicator.svelte';

	let tableOfContents = [];

	setContext('toc', {
		set(toc) {
			tableOfContents = toc;
		},
		reset() {
			tableOfContents = [];
		}
	});
</script>

{#if $navigating}
	<PreloadingIndicator />
{/if}

{#if $page.url.pathname !== '/'}
	<a href="#content" class="skip">Skip to content</a>

	<header>
		<nav>
			<Links mode="sidebar" />
		</nav>
	</header>

	<Sidebar {tableOfContents} />
{/if}

<main id="content">
	<slot />
</main>

<footer>
	{#if $page.url.pathname !== '/'}
		<CarbonAd />
	{/if}
</footer>

<style>
	header {
		position: fixed;
		top: 1.5em;
		left: 1.5em;
	}

	@media only screen and (max-width: 1100px) {
		header {
			position: static;
			text-align: center;
			margin-top: 1em;
		}
	}

	:global(html) {
		font-family: 'Lato', sans-serif;
		font-weight: 400;
		font-size: 19px;
		background: linear-gradient(
			0deg,
			var(--background-color-1),
			var(--background-color-2),
			var(--background-color-1)
		);
	}

	:global(html),
	:global(body) {
		margin: 0;
		padding: 0;
	}

	:global(:root) {
		--prism-padding: 20px;
		--margin: 1.62em;
		--box-shadow-size: 6px;
		--box-shadow: var(--box-shadow-size) var(--box-shadow-size) var(--primary-color);
		--box-shadow-hover: 10px 10px var(--primary-color);
		--easing: 200ms ease-in-out;
		--primary-color: #bd93f9;
		--secondary-color: #9547b7;
		--background-color-1: white;
		--background-color-2: #bd93f917;
		--header-link-color: #4e1e86;
	}

	.skip {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
	}
	.skip:focus {
		width: unset;
		height: unset;
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
</style>
