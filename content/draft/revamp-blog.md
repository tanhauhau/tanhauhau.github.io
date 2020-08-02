- emit css for svelte plugin
`blog.svelte` emits `blog.css`, overwrites my actual file.

- writing a emit css file loader plugin

- preload google fonts
- host own 

https://ashton.codes/preload-google-fonts-using-resource-hints/#:~:text=A%20Google%20Font%20link%20is%20a%20stylesheet%20link&text=It%20turns%20out%20preload%20serves,ll%20say%20you%20need%20it.


rollup plugin replace
- hostname
- emit css


- problematic articles:
: Unexpected token (Note that you need plugins to import files that are not JavaScript)
    at error (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:5174:30)
    at Module.error (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:9629:16)
    at tryParse (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:9543:23)
    at Module.setSource (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:9935:30)
    at ModuleLoader.addModuleSource (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:17813:20)
    at async ModuleLoader.fetchModule (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:17867:9)
    at async Promise.all (index 1)
    at async ModuleLoader.fetchStaticDependencies (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:17891:34)
    at async Promise.all (index 0)
    at async ModuleLoader.fetchModule (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:17868:9) {
  code: 'PARSE_ERROR',
  parserError: SyntaxError: Unexpected token (17:1439)
      at Object.pp$4.raise (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:15135:13)
      at Object.pp.unexpected (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:12906:8)
      at Object.pp.expect (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:12900:26)
      at Object.pp$3.parseObj (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:14771:12)
      at Object.pp$3.parseExprAtom (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:14510:17)
      at Object.pp$3.parseExprSubscripts (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:14337:19)
      at Object.pp$3.parseMaybeUnary (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:14314:17)
      at Object.parseMaybeUnary (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:18672:29)
      at Object.pp$3.parseExprOps (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:14249:19)
      at Object.pp$3.parseMaybeConditional (/Users/lhtan/Projects/lihautan/node_modules/rollup/dist/shared/rollup.js:14232:19) {
    pos: 2093,
    loc: Position { line: 17, column: 1439 },
    raisedAt: 2107
  },
  id: '/Users/lhtan/Projects/lihautan/src/layout/blog.svelte',
  pos: 2093,
  loc: {
    file: '/Users/lhtan/Projects/lihautan/src/layout/blog.svelte',
    line: 17,
    column: 1439
  },
  frame: '15: const css = {\n' +
    '16:   code: "span.svelte-1pnuayc{padding:4px 8px;margin-right:12px;font-size:0.6em;font-weight:400;background:white;color:var(--secondary-color);border:2px solid var(--secondary-color);box-shadow:2px 2px var(--secondary-color)}main.svelte-1pnuayc,footer.svelte-1pnuayc{max-width:675px;margin:auto}",\n' +
    '17:   map: "{\\"version\\":3,\\"file\\":\\"blog.svelte\\",\\"sources\\":[\\"blog.svelte\\"],\\"sourcesContent\\":[\\"<script>\\\\n  import Header from \'./Header.svelte\';\\\\n  import Newsletter from \'./Newsletter.svelte\';\\\\n  import baseCss from \'file://./_blog.css\';\\\\n  import image from \'file://@/../hero-twitter.jpg\';\\\\n  export let title;\\\\n  export let description;\\\\n  export let tags = [];\\\\n\\\\n  const jsonLdAuthor = {\\\\n    [\'@type\']: \'Person\',\\\\n    name: \'Tan Li Hau\',\\\\n  };\\\\n</script>\\\\n\\\\n\\\\n<svelte:head>\\\\n  <title>{title} | Tan Li Hau</title>\\\\n  <link href={baseCss} rel=\\\\\\"stylesheet\\\\\\" />\\\\n  <meta name=\\\\\\"description\\\\\\" content={description} />\\\\n  <meta name=\\\\\\"image\\\\\\" content={image} />\\\\n\\\\n  <meta name=\\\\\\"og:image\\\\\\" content={image} />\\\\n  <meta name=\\\\\\"og:title\\\\\\" content={title} />\\\\n  <meta name=\\\\\\"og:description\\\\\\" content={description} />\\\\n  <meta name=\\\\\\"og:type\\\\\\" content=\\\\\\"website\\\\\\" />\\\\n\\\\n  <meta name=\\\\\\"twitter:card\\\\\\" content=\\\\\\"summary_large_image\\\\\\" />\\\\n  <meta name=\\\\\\"twitter:creator\\\\\\" content=\\\\\\"@lihautan\\\\\\" />\\\\n  <meta name=\\\\\\"twitter:title\\\\\\" content={title} />\\\\n  <meta name=\\\\\\"twitter:description\\\\\\" content={description} />\\\\n  <meta name=\\\\\\"twitter:image\\\\\\" content={image} />\\\\n\\\\n  {#each tags as tag}\\\\n    <meta name=\\\\\\"keywords\\\\\\" content={tag} />\\\\n  {/each}\\\\n\\\\n  <meta itemprop=\\\\\\"url\\\\\\" content=\\\\\\"http://127.0.0.1:8081/notes/2019-07-09 - webpack & "microfrontends"\\\\\\" />\\\\n  <meta itemprop=\\\\\\"image\\\\\\" content={image} />\\\\n\\\\n  {@html `<script type=\\\\\\"application/ld+json\\\\\\">${JSON.stringify({\\\\n    \'@context\': \'https://schema.org\',\\\\n    \'@type\': \'Article\',\\\\n    author: jsonLdAuthor,\\\\n    copyrightHolder: jsonLdAuthor,\\\\n    copyrightYear: \'2020\',\\\\n    creator: jsonLdAuthor,\\\\n    publisher: jsonLdAuthor,\\\\n    description,\\\\n    headline: title,\\\\n    name: title,\\\\n    inLanguage: \'en\'\\\\n  })}</script>`}\\\\n\\\\n  {@html `<script type=\\\\\\"application/ld+json\\\\\\">${JSON.stringify({\\\\n    \\\\\\"@context\\\\\\": \\\\\\"https://schema.org\\\\\\",\\\\n    \\\\\\"@type\\\\\\":\\\\\\"BreadcrumbList\\\\\\",\\\\n    \\\\\\"description\\\\\\":\\\\\\"Breadcrumbs list\\\\\\",\\\\n    \\\\\\"name\\\\\\":\\\\\\"Breadcrumbs\\\\\\",\\\\n    \\\\\\"itemListElement\\\\\\":[\\\\n      {\\\\\\"@type\\\\\\":\\\\\\"ListItem\\\\\\",\\\\\\"item\\\\\\":{\\\\\\"@id\\\\\\":\\\\\\"https://lihautan.com\\\\\\",\\\\\\"name\\\\\\":\\\\\\"Homepage\\\\\\"},\\\\\\"position\\\\\\":1},\\\\n      {\\\\\\"@type\\\\\\":\\\\\\"ListItem\\\\\\",\\\\\\"item\\\\\\":{\\\\\\"@id\\\\\\": \'http://127.0.0.1:8081/notes/2019-07-09 - webpack & "microfrontends"\', \\\\\\"name\\\\\\": title},\\\\\\"position\\\\\\":2}\\\\n    ]\\\\n  })}</script>`}\\\\n</svelte:head>\\\\n\\\\n<Header />\\\\n\\\\n<main class=\\\\\\"blog\\\\\\">\\\\n  <h1>{title}</h1>\\\\n  \\\\n  {#each tags as tag}\\\\n    <span>{tag}</span>\\\\n  {/each}\\\\n\\\\n  <article>\\\\n    <slot />\\\\n  </article>\\\\n</main>\\\\n\\\\n<footer>\\\\n  <Newsletter />\\\\n</footer>\\\\n\\\\n<style>\\\\n  span {\\\\n    padding: 4px 8px;\\\\n    margin-right: 12px;\\\\n    font-size: 0.6em;\\\\n    font-weight: 400;\\\\n    background: white;\\\\n    color: var(--secondary-color);\\\\n    border: 2px solid var(--secondary-color);\\\\n    box-shadow: 2px 2px var(--secondary-color);\\\\n  }\\\\n  main, footer {\\\\n    max-width: 675px;\\\\n    margin: auto;\\\\n  }\\\\n</style>\\"],\\"names\\":[],\\"mappings\\":\\"AAqFE,IAAI,eAAC,CAAC,AACJ,OAAO,CAAE,GAAG,CAAC,GAAG,CAChB,YAAY,CAAE,IAAI,CAClB,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,GAAG,CAChB,UAAU,CAAE,KAAK,CACjB,KAAK,CAAE,IAAI,iBAAiB,CAAC,CAC7B,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,iBAAiB,CAAC,CACxC,UAAU,CAAE,GAAG,CAAC,GAAG,CAAC,IAAI,iBAAiB,CAAC,AAC5C,CAAC,AACD,mBAAI,CAAE,MAAM,eAAC,CAAC,AACZ,SAAS,CAAE,KAAK,CAChB,MAAM,CAAE,IAAI,AACd,CAAC\\"}"\n' +
    '                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    ^\n' +
    '18: };',
  watchFiles: [
    '/Users/lhtan/Projects/lihautan/content/notes/2019-07-09 - webpack & "microfrontends".md.svelte',
    '/Users/lhtan/Projects/lihautan/src/layout/blog.svelte'
  ]
}

notes/2019-07-09 - webpack & "microfrontends".md
blog/debugging-build-failed-error-from-terser/index.md
blog/contributing-to-svelte-fixing-issue-5012/index.md
blog/super-silly-hackathon-2019/index.md

'undefined' is imported by content/blog/debugging-build-failed-error-from-terser/index.md.svelte, but could not be resolved – treating it as an external dependency
'undefined' is imported by content/blog/debugging-build-failed-error-from-terser/@@page-markup.svelte, but could not be resolved – treating it as an external dependency
Failed to prepare /Users/lhtan/Projects/lihautan/content/blog/super-silly-hackathon-2019/index.md
ReferenceError: Layout_MDSVEX_DEFAULT is not defined
    at /Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/5766da9d67508df14c40c821fb3b6e6467338078e0d8d7184757ce647948d471.js:99:31
    at $$render (/Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/5766da9d67508df14c40c821fb3b6e6467338078e0d8d7184757ce647948d471.js:51:22)
    at render (/Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/5766da9d67508df14c40c821fb3b6e6467338078e0d8d7184757ce647948d471.js:59:26)
    at Object.render (/Users/lhtan/Projects/lihautan/scripts/render-svelte.js:28:35)
    at /Users/lhtan/Projects/lihautan/scripts/build.js:224:13
    at async /Users/lhtan/Projects/lihautan/scripts/build.js:223:27
    at async Promise.all (index 42)
    at async /Users/lhtan/Projects/lihautan/scripts/build.js:74:11
'default' is imported from external module 'undefined' but never used
'default' is imported from external module 'undefined' but never used
Failed to prepare /Users/lhtan/Projects/lihautan/content/blog/contributing-to-svelte-fixing-issue-5012/index.md
ReferenceError: value is not defined
    at Object.default (/Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/4295d9ea129d58edaaf3ea5ec58d4a768ec15f12ac474d289ae8078493682472.js:213:35)
    at /Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/4295d9ea129d58edaaf3ea5ec58d4a768ec15f12ac474d289ae8078493682472.js:190:47
    at Object.$$render (/Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/4295d9ea129d58edaaf3ea5ec58d4a768ec15f12ac474d289ae8078493682472.js:58:22)
    at /Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/4295d9ea129d58edaaf3ea5ec58d4a768ec15f12ac474d289ae8078493682472.js:207:62
    at $$render (/Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/4295d9ea129d58edaaf3ea5ec58d4a768ec15f12ac474d289ae8078493682472.js:58:22)
    at render (/Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/4295d9ea129d58edaaf3ea5ec58d4a768ec15f12ac474d289ae8078493682472.js:66:26)
    at Object.render (/Users/lhtan/Projects/lihautan/scripts/render-svelte.js:28:35)
    at /Users/lhtan/Projects/lihautan/scripts/build.js:224:13
    at async /Users/lhtan/Projects/lihautan/scripts/build.js:223:27
    at async Promise.all (index 13)
Failed to prepare /Users/lhtan/Projects/lihautan/content/blog/debugging-build-failed-error-from-terser/index.md
Error: Cannot find module 'undefined'
Require stack:
- /Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/f1a0c03a45dc954943865aadfc4f65e63defee14ce688f1e5fcba01aa5c8d89c.js
- /Users/lhtan/Projects/lihautan/scripts/render-svelte.js
- /Users/lhtan/Projects/lihautan/scripts/build.js
    at Function.Module._resolveFilename (internal/modules/cjs/loader.js:980:15)
    at Function.Module._load (internal/modules/cjs/loader.js:862:27)
    at Module.require (internal/modules/cjs/loader.js:1042:19)
    at require (internal/modules/cjs/helpers.js:77:18)
    at Object.<anonymous> (/Users/lhtan/Projects/lihautan/node_modules/.cache/ssr/f1a0c03a45dc954943865aadfc4f65e63defee14ce688f1e5fcba01aa5c8d89c.js:5:1)
    at Module._compile (internal/modules/cjs/loader.js:1156:30)
    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1176:10)
    at Module.load (internal/modules/cjs/loader.js:1000:32)
    at Function.Module._load (internal/modules/cjs/loader.js:899:14)
    at Module.require (internal/modules/cjs/loader.js:1042:19)

- filename starts with underscore, not served.

- [ ] manifest.json
- [ ] offline support
- [ ] dark mode
- [ ] snippet diff+javascript
- [ ] common css chunk
- [ ] google analytics
- [ ] webmentions
- [ ] carbon ads
- [ ] rss support
