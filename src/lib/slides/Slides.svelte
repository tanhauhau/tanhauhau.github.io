<script>
	import { page } from '$app/stores';
	import { browser } from '$app/env';
	export let slides = [];

	let slideInstances = [];

	let slideIndex = 0;

	const hash = $page.url.hash;
	if (hash) {
		slideIndex = Number(hash.slice('page-'.length + 1));
	}

	$: if (browser) window.location.hash = `page-${slideIndex}`;
	$: currentSlide = slideInstances[slideIndex];

	function onKeyDown(event) {
		switch (event.key) {
			case 'ArrowLeft':
			case 'j':
			case 'J': {
				prev();
				break;
			}
			case 'ArrowRight':
			case 'k':
			case 'K': {
				next();
				break;
			}
			case 'p':
			case 'P': {
				if (!document.fullscreenElement) {
					document.documentElement.requestFullscreen({ navigationUI: 'hide' });
				} else {
					if (document.exitFullscreen) {
						document.exitFullscreen();
					}
				}
				break;
			}
		}
	}
	function prev() {
		if (!(currentSlide && typeof currentSlide.prev === 'function' && currentSlide.prev())) {
			slideIndex = Math.max(slideIndex - 1, 0);
		}
	}
	function next() {
		if (!(currentSlide && typeof currentSlide.next === 'function' && currentSlide.next())) {
			slideIndex = Math.min(slideIndex + 1, slides.length - 1);
		}
	}
</script>

<svelte:body on:keydown={onKeyDown} />

{#each slides as Slide, index (index)}
	<section
		id="page-{index}"
		style="
  transform: translateX({(index - slideIndex) * 100}%) scale({index === slideIndex ? 1 : 0.8});
"
	>
		<Slide bind:this={slideInstances[index]} />
	</section>
{/each}

<style>
	:global(body) {
		overflow: hidden;
	}
	section {
		width: 100vw;
		height: 100vh;
		box-sizing: border-box;
		position: fixed;
		top: 0;
		left: 0;
		overflow: scroll;
		transition: transform 0.25s ease-in-out;
		padding: 16px;
		overflow-x: hidden;
	}
</style>
