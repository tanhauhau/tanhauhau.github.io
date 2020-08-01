<script>
  import img from 'file://../../../content/assets/profile-pic.png';
  import Links from '../layout/Links.svelte';
</script>

<main>
  <div><img src={img} alt="Tan Li Hau" /></div>
  <h1>Tan Li Hau</h1>
  <h2>Frontend Developer at <a href="https://www.linkedin.com/company/shopee/" aria-label="Shopee LinkedIn page">Shopee
      Singapore</a></h2>

  <Links />
</main>


<style>
  main {
    max-width: 675px;
    min-height: 100vh;
    margin: auto;
    padding: calc(3 * var(--prism-padding)) 0 var(--prism-padding);
    word-break: break-word;
    text-align: center;
    box-sizing: border-box;
  }

  @media only screen and (max-width: 755px) {
    main {
      padding: calc(3 * var(--prism-padding)) calc(2 * var(--prism-padding));
    }
  }

  img {
    width: 230px;
    max-width: 100%;
    border: 4px solid;
    box-shadow: var(--box-shadow);
  }

  h2 {
    margin-bottom: var(--margin);
  }
</style>