<script>
  export let components;
</script>

<pre>
  {components[0].source}
</pre>

<!-- <script>
  import Repl from '@sveltejs/svelte-repl';

  let repl;
  export let components;
  const rollupUrl = `https://unpkg.com/rollup@1/dist/rollup.browser.js`;
  const svelteUrl = `https://unpkg.com/svelte@3.24.1`;

  function keyDown(event) {
    event.stopPropagation();
  }

  $: repl && repl.set({ components })
</script>

<div on:keydown={keyDown}>
  <Repl 
    bind:this={repl}
    workersUrl="worker"
    {rollupUrl}
    {svelteUrl}
  />
</div>

<style>
  div {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
</style> -->