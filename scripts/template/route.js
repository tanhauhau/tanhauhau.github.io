import PageComponent from '@@route.svelte';

const app = new PageComponent({
  target: document.querySelector('#app'),
  hydrate: true,
});
