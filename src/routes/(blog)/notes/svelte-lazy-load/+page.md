---
title: Lazy Loading Svelte component
tags:
  - lazy load
  - svelte
---

## Lazy Loading Svelte component

```svelte
<script>
	let lazyComponent;

	function load() {
		lazyComponent = import(`./LazyComponent.svelte`);
	}
	let count = 0;
</script>

{#if lazyComponent}
	{#await lazyComponent then { default: LazyComponent }}
		<LazyComponent {count} />
	{/await}
{/if}


<button on:click={load}>Load</button>
<button on:click={() => count ++}>Increment</button>
```

```svelte
<!-- LazyComponent.svelte -->
<script>
	export let count;
</script>

<strong>{count}</strong>
```

### Notes

- For rollup users, dynamic imports only supported in the following output formats:
  - esm
  - amd
  - systemjs

## Dynamic Lazy Component

<blockquote class="twitter-tweet"><p lang="en" dir="ltr">This is great! I tried turning lazy loading into its own component, but got burned by dynamic imports of variables. Any thoughts on how this could work? <a href="https://t.co/yCDadJYFqf">pic.twitter.com/yCDadJYFqf</a></p>&mdash; sean mullen (@srmullen) <a href="https://twitter.com/srmullen/status/1293549224676777984?ref_src=twsrc%5Etfw">August 12, 2020</a></blockquote>

You can't use dynamic expressions for `import()` in rollup.

A better approach for dynamic lazy component would be passing in a function that will return a dynamic component

```svelte
<script>
	import LazyComponent from './LazyComponent.svelte';
	let load = false;
</script>

<LazyComponent 
	when={load}
	component={() => import('./LoadMeLikeLazy.svelte')} />

<button on:click={() => { load = true; }}>Load</button>
```

```svelte
<!-- filename: LazyComponent.svelte -->
<script>
	export let when = false;
	export let component;

	let loading;

	$: if (when) {
		load();
	}

	function load() {
		loading = component();
	}
</script>
{#if when}
	{#await loading then { default: Component }}
		<Component />
	{/await}
{/if}
```