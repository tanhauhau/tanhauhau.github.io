import PageComponent from '@@page-markup.svelte';

setTimeout(() => {
  const app = new PageComponent({
    target: document.querySelector('#app'),
    hydrate: true,
  });
}, 3000);
