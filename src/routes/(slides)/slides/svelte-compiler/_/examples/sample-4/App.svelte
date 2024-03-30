<script>
  import { fade, fly, blur } from 'svelte/transition';

  let array = [];
  
  function add() {
    array.push(Math.round(Math.random() * 100));
    array = array;
  }
  function remove() {
    array = array.slice(0, -1);
  }
</script>

<button on:click={add}>Add</button>
<button on:click={remove}>Remove</button>

<ul>
  {#each array as item}
    <li transition:blur>{item}</li>
    <li in:fade out:fly={{y:30}}>{item}</li>
  {/each}
</ul>
