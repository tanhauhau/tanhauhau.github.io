<script>
  import Header from './Header.svelte';
  import Newsletter from './Newsletter.svelte';
  import CarbonAd from './CarbonAd.svelte';
  import 'file://./blog-base.css';
  import image from 'file://@/../hero-twitter.jpg';
  export let title = "";
  export let description = "";
  export let tags = [];
  export let occasion;
  export let occasionLink;
  export let videoLink;

  const jsonLdAuthor = {
    ['@type']: 'Person',
    name: 'Tan Li Hau',
  };
</script>


<svelte:head>
  <title>{title} | Tan Li Hau</title>
  <meta name="description" content={description} />
  <meta name="image" content={image} />

  <meta name="og:image" content={image} />
  <meta name="og:title" content={title} />
  <meta name="og:description" content={description} />
  <meta name="og:type" content="website" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="@lihautan" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />
  <meta name="twitter:image" content={image} />

  {#each tags as tag}
    <meta name="keywords" content={tag} />
  {/each}

  <meta itemprop="url" content="__$$HOSTNAME$$__" />
  <meta itemprop="image" content={image} />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: jsonLdAuthor,
    copyrightHolder: jsonLdAuthor,
    copyrightYear: '2020',
    creator: jsonLdAuthor,
    publisher: jsonLdAuthor,
    description,
    headline: title,
    name: title,
    inLanguage: 'en'
  })}</script>`}

  {@html `<script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type":"BreadcrumbList",
    "description":"Breadcrumbs list",
    "name":"Breadcrumbs",
    "itemListElement":[
      {"@type":"ListItem","item":{"@id":"https://lihautan.com","name":"Homepage"},"name":"Homepage","position":1},
      {"@type":"ListItem","item":{"@id": '__$$HOSTNAME$$__', "name": title},"name": title,"position":2}
    ]
  })}</script>`}
</svelte:head>

<a href="#content" class="skip">Skip to content</a>
<Header />

<main id="content" class="blog">
  <h1>{title}</h1>
  
  {#each tags as tag}
    <span>{tag}</span>
  {/each}


  {#if (occasion && occasionLink) || videoLink}
    <div class="venue">{#if occasion && occasionLink}Talk given at: <a href={occasionLink}>{occasion}</a>{/if}{#if videoLink}<a href={videoLink}>(Video)</a>{/if}</div>
  {/if}

  <article>
    <slot />
  </article>
</main>

<footer>
  <Newsletter />
  <CarbonAd />
</footer>

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
  main, footer {
    max-width: 675px;
    margin: auto;
    word-break: break-word;
  }
  @media only screen and (max-width: 755px) {
    main, footer {
      padding: 0 calc(2 * var(--prism-padding));
    }
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
  
  :global(.sitemap li:nth-child(n + 2)) {
    margin-top: 8px;
  }
  .venue {
    margin-top: 16px;
  }
  .venue a + a {
    margin-left: 4px;
  }
</style>