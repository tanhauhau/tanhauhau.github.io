<script>
  import { slide } from 'svelte/transition';
  export let slides = [];
  let slideIndex = 0;

  const hash = window.location.hash;
  if (hash) {
    slideIndex = Number(hash.slice('page-'.length + 1));
  }

  $: window.location.hash = `page-${slideIndex}`;

  function onKeyDown(event) {
    switch(event.key) {
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
    }
  }
  function prev() {
    slideIndex = Math.max(slideIndex - 1, 0);
  }
  function next() {
    slideIndex = Math.min(slideIndex + 1, slides.length - 1);
  }
</script>

<svelte:body on:keydown={onKeyDown} ></svelte:body>

{#each slides as Slide, index (index)}
  <section
    id="page-{index}"
    style="
  transform: translateX({(index - slideIndex) * 100}%) scale({index === slideIndex ? 1 : 0.8});
">
    <Slide />
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
  }
</style>