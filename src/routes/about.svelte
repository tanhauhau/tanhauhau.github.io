<script>
  // import Newsletter from '../layout/Newsletter.svelte';
</script>

<!-- <Header /> -->

<main>
  <h1>About Tan Li Hau</h1>

  <div class="facts">
    <h3>3 Fun Facts ✌️</h3>
    <ol>
      <li>🇲🇾 Growing up from Penang, Malaysia, I am a multilingual, speaking Chinese, English, Malay and Hokkien</li>
      <li>💻 I contribute to open source projects. I am a core maintainer of <a href="https://github.com/sveltejs/svelte" target="_blank" rel="noopener noreferrer">Svelte</a>.</li>
      <li>🎹 I play piano and played <a href="https://en.wikipedia.org/wiki/Pipa">pipa</a> in a Chinese Orchestra during highschool.</li>
    </ol>
  </div>
</main>

<style>
  main {
    max-width: 675px;
    margin: auto;
    word-break: break-word;
    box-sizing: border-box;
  }

  @media only screen and (max-width: 755px) {
    main {
      padding: 0 calc(2 * var(--prism-padding));
    }
  }

  ol {
    list-style: none;
    padding-left: 0;
  }

  li {
    margin-bottom: 10px;
  }
</style>