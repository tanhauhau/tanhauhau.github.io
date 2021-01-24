<script>
  import Header from './Header.svelte';
  import baseCss from 'file://./blog-base.css';
  import image from 'file://@/../hero-twitter.jpg';
  export let name;
  export let title;
  export let tags = [];

  const jsonLdAuthor = {
    ['@type']: 'Person',
    name: 'Tan Li Hau',
  };
</script>


<svelte:head>
  <title>Note: {title} | Tan Li Hau</title>
  <link href={baseCss} rel="stylesheet" />
  <meta name="image" content={image} />

  <meta name="og:image" content={image} />
  <meta name="og:title" content={name} />
  <meta name="og:type" content="website" />

  {#each tags as tag}
    <meta name="keywords" content={tag} />
  {/each}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="@lihautan" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:image" content={image} />

  <meta itemprop="url" content="__$$HOSTNAME$$__" />
</svelte:head>

<a href="#content" class="skip">Skip to content</a>
<Header />

<main id="content" class="blog">
  <h1>{title}</h1>
  
  {#each tags as tag}
    <span>{tag}</span>
  {/each}

  <article>
    <slot />
  </article>
</main>

<style>
  span {
    padding: 4px 8px;
    margin-right: 12px;
    font-size: 0.6em;
    font-weight: 500;
    background: white;
    color: var(--secondary-color);
    border: 2px solid var(--secondary-color);
    box-shadow: 2px 2px var(--secondary-color);
  }
  main {
    max-width: 675px;
    margin: auto;
    word-break: break-word;
  }
  @media only screen and (max-width: 755px) {
    main {
      padding: 0 calc(2 * var(--prism-padding));
    }
  }
  article {
    margin-top: 20px;
  }
  .skip {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
  }
  .skip:focus {
    width: unset;
    height: unset;
  }
</style>