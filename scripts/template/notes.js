import Pages from '../../src/layout/Notes.svelte';
import data from '@@data.json';

const app = new Pages({
  target: document.querySelector('#app'),
  hydrate: true,
  props: {
    data,
  },
});
