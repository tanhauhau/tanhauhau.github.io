<script context="module">
	export async function load({ fetch }) {
		const response = await fetch('/api/series.json');
		const data = await response.json();
		return {
			props: { series: data }
		};
	}
</script>

<script>
	export let series = [];
</script>

<main class="series">
	<h1>Series</h1>
	<ul>
		{#each series as series (series)}
			<li><a href="/series/{series}">{series}</a></li>
		{/each}
	</ul>
</main>

<style>
	main {
		max-width: 675px;
		margin: auto;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		margin: 8px;
		/* margin-right: 12px; */
		font-weight: 500;
		background: white;
		color: var(--secondary-color);
		border: 2px solid var(--secondary-color);
		box-shadow: 2px 2px var(--secondary-color);
		display: inline-block;
		transition: var(--easing);
	}
	li:hover {
		transform: translate(-2px, -2px);
		box-shadow: 5px 5px var(--secondary-color);
	}
	li:active {
		transform: translate(2px, 2px);
		box-shadow: none;
	}
	a {
		text-decoration: none;
		position: relative;
		display: block;
		padding: 12px;
		color: inherit;
	}
</style>
