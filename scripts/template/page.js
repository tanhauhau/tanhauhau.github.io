import PageComponent from '@@page-markup.svelte';

const app = new PageComponent({
  target: document.querySelector('#app'),
  hydrate: true,
});
