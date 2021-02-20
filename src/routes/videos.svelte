<script>
  import Header from '../layout/Header.svelte';

  const data = [
    {
      title: 'Svelte Store',
      videos: [
        { url: "https://youtu.be/QjMl4usaKGA", title: "Introduction to Svelte store" },
        { url: "https://youtu.be/GSCcYal_v40", title: "The writable store" },
        { url: "https://youtu.be/D9hIVHE6v0U", title: "The readable store" },
        { url: "https://youtu.be/T3XBiCbm97M", title: "Svelte store contract" },
        { url: "https://youtu.be/7uCNx764FCs", title: "Custom Svelte Store: Redux store as Svelte store" },
        { url: "https://youtu.be/1WOcEvUX-hU", title: "Custom Svelte Store: Valtio state as Svelte store" },
        { url: "https://youtu.be/NIfQsc5XAzU", title: "Custom Svelte Store: XState as Svelte store" },
        { url: "https://youtu.be/Aq-hZhX2vfU", title: "Custom Svelte Store: DOM Events as Svelte store" },
        { url: "https://youtu.be/mHqCAEUkiWs", title: "Custom Svelte Store: Immer for Immutable Svelte store" },
        { url: "https://youtu.be/i6wdD5mRUkc", title: "Custom Svelte Store: derived() Svelte store" },
        { url: "https://youtu.be/I5dEo7HL1LY", title: "Custom Svelte Store: tweened() Svelte store" },
      ]
    },
		{
			title: 'Svelte Actions',
			videos: [
				{ url: "https://youtu.be/ciaMT_MswzE", title: "Svelte Action - Introduction" },
        { url: "https://youtu.be/5tyaUOfOFpw", title: "How Svelte action reacts to parameters change?" },
        { url: "https://youtu.be/Y19gAgyhU-c", title: "What if Svelte does not have the use:action feature?" },
        { url: "https://youtu.be/_IGEl4t1TSM", title: "Reusing event listeners with Svelte actions" },
        { url: "https://youtu.be/22aIzPaI3Vg", title: "Creating events with Svelte actions" },
        { url: "https://youtu.be/Y5IiSdcqdeQ", title: "Integrating UI Library into a Svelte app using Svelte Actions" },
        { url: "https://youtu.be/3R3PMEesQnM", title: "The order of Svelte actions" },
        { url: "https://youtu.be/0GqIoo66i0g", title: "Svelte Action Examples - use:tooltip" },
        { url: "https://youtu.be/1SKKzdHVvcI", title: "Svelte Action Examples - use:viewport" },
        { url: "https://youtu.be/AzE9-6QcwmM", title: "Svelte Action Examples - use:clickOutside" },
        { url: "https://youtu.be/CFj4X0bGOvE", title: "Svelte Action Examples - use:popper with Popper" },
			]
		},
    {
      title: 'Svelte Transitions',
      videos: [
        { url: "https://youtu.be/VDYn_4pTawk", title: "Introduction to Svelte Transition #1 - Adding Transitions" },
        { url: "https://youtu.be/fTctuCkUT9c", title: "Introduction to Svelte Transition #2 - Coordinating Transitions" },
        { url: "https://youtu.be/M-LroTSC54E", title: "Introduction to Svelte Transition #3 - Transition Events" },
        { url: "https://youtu.be/xQc9mwBGJ5Q", title: "Introduction to Svelte Transition #4 - Easing Transitions" },
        { url: "https://youtu.be/QK_QuRL7nSo", title: "Accessible Svelte Transition" },
        { url: "https://youtu.be/u13B_D00XMY", title: "Custom Svelte Transitions - Solid Color Swipe" },
        { url: "https://youtu.be/J0Kk-axA_mA", title: "Custom Svelte Transitions - Flipboard transition" },
        { url: "https://youtu.be/X6JQzEnw994", title: "Custom Svelte Transitions - using SVG filter feTurbulence" },
        { url: "https://youtu.be/_Z3KAT29g1Y", title: "Improvements: Building tixy.land with Svelte" },
      ]
    },
    {
      title: 'Svelte',
      videos: [
        { url: "https://youtu.be/jMcONG-IWNg", title: "Using variables within style tag in Svelte" },
        { url: "https://youtu.be/-i8zg1jbqkU", title: "Drawing Canvas with Svelte using slot and context" },
        { url: "https://youtu.be/Iin2JvrMOd4", title: "Creating animated graph with Svelte and SVG" },
        { url: "https://youtu.be/us3_VXjtvu8", title: "Building tixy.land with Svelte" },
        { url: "https://youtu.be/JXO_DlttJII", title: "Building Flexbox Froggy with Svelte" },
        { url: "https://youtu.be/yqstN8_wWgQ", title: "Simulating Fibonacci with Svelte motion tweened" },
        { url: "https://youtu.be/oEratnd190o", title: "Visualising Sorting Algorithm with Svelte animate:flip" },
      ]
    },
    {
      title: 'UI',
      videos: [
        { url: "https://youtu.be/tBn0lVUzUbA", title: "How to implement a tooltip positioning engine" },
      ]
    }
  ];
  const description = "Li Hau's video tutorial";
  const title = "Li Hau's Videos";
  const tags = ['video', 'programming', 'tutorials'];
  const jsonLdAuthor = {
    ['@type']: 'Person',
    name: 'Tan Li Hau',
  };
</script>

<svelte:head>
  <title>{title} | Tan Li Hau</title>
  <meta name="description" content={description} />

  <meta name="og:title" content={title} />
  <meta name="og:description" content={description} />
  <meta name="og:type" content="website" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:creator" content="@lihautan" />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />

  {#each tags as tag}
    <meta name="keywords" content={tag} />
  {/each}

  <meta itemprop="url" content="__$$HOSTNAME$$__" />

  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: jsonLdAuthor,
    copyrightHolder: jsonLdAuthor,
    copyrightYear: '2021',
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

<Header />

<main class="blogs">
  <h1>Li Hau's Videos</h1>
  <ul>
  {#each data as { title, videos }}
		<li class="list">
			<p class="title">{title}</p>
			<ul>
				{#each videos as { title, url } }
					<li class="item">
						<a href={url}>{title}</a>
					</li>
				{/each}
			</ul>
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
    background: white;
    margin: 16px 0 24px;
		border: 4px solid;
		box-shadow: var(--box-shadow);
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
	.list {
		padding: 4px 12px 16px;
	}
	.item {
    margin: 16px 0 0;
  }
  a {
    text-decoration: none;
    position: relative;
    padding: 12px;
    display: block;
		color: black;
  }
	.title {
    font-weight: 700;
    font-size: 32px;
    margin: 10px 0;
  }
</style>