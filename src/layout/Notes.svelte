<script>
  import Header from './Header.svelte';
  export let data = [];
</script>

<Header />

<main class="blogs">
  <h1>Li Hau's Notes</h1>
  <ul>
  {#each data as { metadata: { title, tags } = {}, slug } (slug)}
    <li>
      <a href="/{slug}">
        <p class="title">{title}</p>
        {#if tags}<p>{#each tags as tag}<span>{tag}</span>{/each}</p>{/if}
      </a>
    </li>
  {/each}
  </ul>
</main>

<style>
  main {
    max-width: 675px;
    margin: auto;
  }
  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    border: 4px solid;
    box-shadow: var(--box-shadow);
    background: white;
    margin: 16px 0 24px;
    transition: var(--easing);
  }
  li:hover {
    transform: translate(-2px, -2px);
    box-shadow: var(--box-shadow-hover);
  }
  li:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }
  span {
    padding: 4px 8px;
    margin-right: 12px;
    font-size: 0.6em;
    font-weight: 400;
    background: white;
    color: var(--secondary-color);
    border: 2px solid var(--secondary-color);
    box-shadow: 2px 2px var(--secondary-color);
  }
  a {
    text-decoration: none;
    position: relative;
    padding: 16px;
    display: block;
  }
  a:link::after {
    content: 'Unread';
    position: absolute;
    top: 0px;
    right: 0;
    font-size: 0.8em;
    font-weight: 400;
    padding: 10px 16px 10px;
    color: var(--secondary-color);
  }
  a:visited::after {
    color: white;
    background: white;
  }
  .title {
    font-weight: 700;
    font-size: 32px;
    margin: 10px 0;
  }
</style>