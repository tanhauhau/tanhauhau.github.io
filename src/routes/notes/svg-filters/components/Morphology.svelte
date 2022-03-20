<script>
	import Prism from 'prismjs';

	let radius = 0;
	
	function highlight(node, str) {
		function h(str) {
			node.innerHTML = Prism.highlight(str.trim(), Prism.languages.html)
				.split('\n')
  			.map(line => line.replace(/^(\s+)/, (_, m) => '<span class="tab"></span>'.repeat(m.length)))
				.join('<br />');	
		}
		h(str);
		return {
			update(str) {
				h(str);
			}
		}
	}
</script>

<div class="row">
	

<div class="container">
	<img src="https://lihautan.com/03b36a9f76000493.png" alt=""/>
</div>
<div class="container">
	<img class="dilate" src="https://lihautan.com/03b36a9f76000493.png" alt=""/>	
	<div use:highlight={`
<filter>
	<feMorphology
		operator="dilate"
		radius="${radius}" />
</filter>`} />
</div>
<div class="container">
	<img class="erode" src="https://lihautan.com/03b36a9f76000493.png" alt=""/>
	<div use:highlight={`
<filter>
	<feMorphology
		operator="erode"
		radius="${radius}" />
</filter>`} />
</div>
<svg>
	<filter id="dilate">
		<feMorphology {radius} operator="dilate" />
	</filter>
	<filter id="erode">
		<feMorphology {radius} operator="erode" />
	</filter>
</svg>

</div>

<div class="input">
	Radius: {radius}
	<input type="range" min=0 max="20" step=1 bind:value={radius} />
</div>

<style>
  svg {
    display: none;
  }
	img {
		width: 200px;
		margin: 40px 10px;
    border: none;
    box-shadow: none;
	}
	.dilate {
		filter: url(#dilate)
	}
	.erode {
		filter: url(#erode)
	}
	.row {
		display: flex;
	}
	.container {
		display: inline-block;
	}
	.input {
		display: flex;
		align-items: center;
		justify-content: center;
		margin: 10px;
	}
	input {
		margin: 0;
		margin-left: 5px;
	}
	.container :global(span.tab) {
		width: 2ch;
    display: inline-block;
	}
	.container :global(.token.attr-name) {
		color: #ff0000;
	}
	.container :global(.token.punctuation),
	.container :global(.token.operator) {
    color: #393A34;
	}
	.container :global(.token.string) {
    color: #A31515;
  }
	.container :global(.token.attr-value) {
		color: #0000ff;
	}
	.container :global(.token.tag) {
    color: #9a050f;
  }
</style>