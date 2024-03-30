<script>
	import { navigating } from '$app/stores';
	import PreloadingIndicator from '$lib/PreloadingIndicator.svelte';
</script>

{#if $navigating}
	<PreloadingIndicator />
{/if}

<main id="content">
	<slot />
</main>

<style>
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

	main {
		max-width: 675px;
		margin: auto;
		word-break: break-word;
	}
	@media only screen and (max-width: 755px) {
		main {
			padding: 0 calc(2 * var(--prism-padding));
		}
	}
</style>
