<script>
  import Header from './Header.svelte';
  import Newsletter from './Newsletter.svelte';
  import 'file://./blog-base.css';
  import image from 'file://@/../hero-twitter.jpg';
  export let title;
  export let description;
  export let tags = [];

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
      {"@type":"ListItem","item":{"@id":"https://lihautan.com","name":"Homepage"},"position":1},
      {"@type":"ListItem","item":{"@id": '__$$HOSTNAME$$__', "name": title},"position":2}
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

  <article>
    <slot />
  </article>
</main>

<footer>
  <Newsletter />
</footer>

{@html '<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"></script>'}

<style>
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
</style>