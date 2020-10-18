<script>
	let text = 'Hello World';
	let color = '#ff0000';
	let background = '#ffff00';
</script>

<div class="canvas" style="background: {background};">
	<h1 style="filter: url(#outline); color: {color};">{text}</h1>
</div>

<input bind:value={text} />
<input type="color" bind:value={color} />
<input type="color" bind:value={background} />

<svg height="0">
	<filter id="outline">
		<feMorphology result="THICK" operator="dilate" radius="4" />
		<feComposite operator="out" in="THICK" in2="SourceGraphic" />
	</filter>
</svg>

<style>
	svg {
		display: none;
	}
	.canvas {
		padding: 0 10px;
		margin: 10px 0;
	}
	h1 {
		font-size: 94px;
		margin: 0;
	}
</style>