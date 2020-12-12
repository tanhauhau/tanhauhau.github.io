<script>
  import Header from '../layout/Header.svelte';
  import Newsletter from '../layout/Newsletter.svelte';
  import ogImage from 'file://../../../content/assets/newsletter-og-image.png';
</script>

<svelte:head>
  <meta property="og:title" content="Li Hau's Weekly Learning">
  <meta property="og:description" content="In this weekly newsletter I'm going to share with you what I've learned in this week in the world of web development, with my notes and thoughts.">
  <meta property="og:image" content={'https://lihautan.com/' + ogImage}>
  <meta property="og:url" content="https://lihautan.com/newsletter">
  <meta property="og:site_name" content="Tan Li Hau">
  <meta property="og:type" content="website">
  
  <meta name="twitter:title" content="Li Hau's Weekly Learning">
  <meta name="twitter:description" content="In this weekly newsletter I'm going to share with you what I've learned in this week in the world of web development, with my notes and thoughts.">
  <meta name="twitter:site" content="@lihautan">
  <meta name="twitter:image" content={'https://lihautan.com/' + ogImage}>
  <meta name="twitter:image:alt" content="Li Hau's Weekly Learning">
  <meta name="twitter:card" content="summary_large_image">
</svelte:head>

<Header />

<main>
  <h1>Li Hau's Weekly Learning</h1>
  <p>In this weekly newsletter I'm going to share with you what I've learned in this week in the world of web development, with my notes and thoughts.</p>
  <p>I won't spam though, I promise.</p>
  <p>You can also <a href="https://buttondown.email/lihautan/archive">view my previous issues</a> and <a href="https://buttondown.email/lihautan/rss">subscribe via RSS</a>!</p>

  <div />
  <Newsletter />
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
  
  div {
    margin-bottom: var(--margin);
    height: 1px;
  }
</style>