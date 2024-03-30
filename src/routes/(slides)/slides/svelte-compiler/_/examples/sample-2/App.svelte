<script>
  import { getRandomDogImage } from './api';
  let ready = false;
  $: someApi = ready && getRandomDogImage();
</script>

{#if ready}
  {#await someApi}
    Loading...
  {:then list}
    {#each list as item}
      <img src={item} alt="dog ceo"/>
    {/each}
  {/await}
{:else}
  Are you ready?
  <button on:click={() => { ready = true; }}>
    I'm ready
  </button>
{/if}

<style>
  img {
    width: 100%;
  }
</style>