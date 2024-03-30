<script>
	import {
		bounceOut,
		bounceIn,
		bounceInOut,
		quadIn,
		quadOut,
		quadInOut,
		cubicIn,
		cubicInOut,
		cubicOut,
		quartIn,
		quartInOut,
		quartOut
	} from 'svelte/easing';
	import { browser } from '$app/environment';
	import { prismJs } from '$lib/slides/prism';
	import { onDestroy } from 'svelte';
	function linear(t) {
		return t;
	}
	let fns = [
		{ name: 'linear', fn: linear },
		{ name: 'bounceInOut', fn: bounceInOut },
		{ name: 'bounceIn', fn: bounceIn },
		{ name: 'bounceOut', fn: bounceOut },
		{ name: 'cubicInOut', fn: cubicInOut },
		{ name: 'cubicIn', fn: cubicIn },
		{ name: 'cubicOut', fn: cubicOut },
		{ name: 'quadInOut', fn: quadInOut },
		{ name: 'quadIn', fn: quadIn },
		{ name: 'quadOut', fn: quadOut },
		{ name: 'quartInOut', fn: quartInOut },
		{ name: 'quartIn', fn: quartIn },
		{ name: 'quartOut', fn: quartOut }
	];
	let fn = fns[0];
	let value = 50;
	let start = Date.now();
	let duration;
	let t = 0,
		u = 0;
	export let i = 3;
	$: d = i < 5 ? 2000 : 8000;

	$: points = generatePoints(fn.fn);
	let cx = 0,
		cy = 0;

	let frameId;
	function loop() {
		const now = Date.now();
		duration = (now - start) % d;
		t = duration / d;
		u = fn.fn(t);

		value = u * 100;
		cy = t * 200;
		cx = fn.fn(t) * 200;

		frameId = requestAnimationFrame(loop);
	}
	if (browser) {
		frameId = requestAnimationFrame(loop);
		onDestroy(() => {
			cancelAnimationFrame(frameId);
		});
	}

	function generatePoints(fn) {
		let point = '';
		for (let i = 0; i < 1; i += 0.005) {
			point += `${fn(i) * 200},${i * 200} `;
		}
		return point;
	}
	function throttle(v) {
		return v - (v % 5);
	}
</script>

<div class="container">
	<div class="left">
		<select class:hidden={i < 2} bind:value={fn}>
			{#each fns as fn}
				<option value={fn}>{fn.name}</option>
			{/each}
		</select>
		<svg width="200" height="200">
			<defs>
				<marker id="head" orient="auto" markerWidth="6" markerHeight="12" refX="0.1" refY="6">
					<path d="M0,0 V12 L6,6 Z" fill="black" />
				</marker>
			</defs>
			<!-- x axis -->
			<path d="M0,0 200,0" marker-end="url(#head)" stroke="black" />
			<g class="x" transform="translate(0,-10)">
				<text x="0">0</text>
				<text x="200">1</text>
				<text x="100">eased time</text>
			</g>

			<!-- y axisx -->
			<path d="M0,0 0,200" marker-end="url(#head)" stroke="black" />
			<g class="y" transform="translate(-10,0)">
				<text y="200">1</text>
				<text y="0">0</text>
				<text y="100">time</text>
			</g>

			<!-- data -->
			<polyline {points} />

			<circle class:hidden={i < 1} r="5" fill="red" {cx} {cy} />
		</svg>
		<svg class:hidden={i < 1} height="5" width="200" style="margin: 1em 0;">
			<path d="M-50,0 250,0" stroke="#ddd" stroke-width="2" />
			<path d="M0,0 200,0" stroke="black" stroke-width="3" />
			<circle r="5" fill="black" {cx} cy="0" />
		</svg>
		<div
			class="square"
			class:hidden={i < 8}
			style="transform: translateX({(i === 9 || i === 8 ? u : i === 10 ? 1 - u : 0) * 250}px)"
		>
			{i === 11 ? u.toFixed(3) : i === 12 ? 'Hello World'.slice(0, Math.round(11 * u)) : ''}
		</div>
	</div>
	<div class="right" class:hidden={i < 3}>
		<div class="code" use:prismJs={fn.fn.toString()} />
		<br />
		<div class="code" class:hidden={i < 4} use:prismJs={'let start = Date.now();'} />
		<div
			class="code"
			class:hidden={i < 5}
			use:prismJs={`let t = Date.now() - start; // ${throttle(duration)}`}
		/>
		<div class="code" class:hidden={i < 6} use:prismJs={`t = t / duration; // ${t.toFixed(3)}`} />
		<div
			class="code"
			class:hidden={i < 7}
			use:prismJs={`t = ${fn.fn.name}(t); // ${u.toFixed(3)}`}
		/>
		<br />
		<div
			class="code"
			class:none={i !== 8}
			use:prismJs={`node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(
				u * 250
			).toFixed(1)}px)`}
		/>
		<div
			class="code"
			class:none={i !== 9}
			use:prismJs={`css: (t, u) => \`translateX(\${t * 250}px)\``}
		/>
		<div
			class="code"
			class:none={i !== 10}
			use:prismJs={`css: (t, u) => \`translateX(\${u * 250}px)\``}
		/>
		<div class="code" class:none={i !== 11} use:prismJs={`tick: (t, u) => node.textContent = t`} />
		<div
			class="code"
			class:none={i !== 12}
			use:prismJs={`const string = 'Hello World';\ntick: (t, u) => {\n  node.textContent = string.slice(0, Math.round(string.length * t));\n}`}
		/>
	</div>
</div>

<style>
	.container {
		display: grid;
		grid-template-columns: 1fr 1fr;
		height: 100%;
	}
	.left {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
	.right {
		margin-top: 100px;
	}
	svg {
		overflow: visible;
		margin: 3em;
	}
	polyline {
		fill: none;
		stroke: black;
	}
	polyline {
		stroke: red;
		stroke-width: 2;
	}

	.x text {
		text-anchor: middle;
	}

	.y text {
		text-anchor: end;
		dominant-baseline: middle;
	}

	.square {
		margin-top: 50px;
		background: red;
		height: 50px;
		width: 50px;
		position: relative;
		left: -100px;
	}
	.none {
		display: none;
	}

	select {
		font-family: inherit;
		font-size: inherit;
		padding: 0.2em 0.4em;
		box-sizing: border-box;
		border: 1px solid #ccc;
		border-radius: 2px;
	}
</style>
