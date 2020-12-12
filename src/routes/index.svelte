<script>
  import img from 'file://../../../content/assets/profile-pic.png';
  import ogImage from 'file://../../../content/assets/og-image.jpg';
  import twitterImage from 'file://../../../content/assets/twitter-card-image.jpg';
  import Links from '../layout/Links.svelte';
</script>

<svelte:head>
  <meta property="og:title" content="Tan Li Hau">
  <meta property="og:description" content="Frontend Developer at Shopee Singapore.">
  <meta property="og:image" content={ogImage}>
  <meta property="og:url" content="https://lihautan.com">
  <meta property="og:site_name" content="Tan Li Hau">
  
  <meta name="twitter:title" content="Tan Li Hau">
  <meta name="twitter:description" content="Frontend Developer at Shopee Singapore.">
  <meta name="twitter:site" content="@lihautan">
  <meta name="twitter:image" content={twitterImage}>
  <meta name="twitter:image:alt" content="Tan Li Hau">
  <meta name="twitter:card" content="summary_large_image">
</svelte:head>

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