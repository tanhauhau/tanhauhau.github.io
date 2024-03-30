---
title: Building my Svelte static site
tags:
  - Svelte static site
---

## Svelte Plugin with `emitCss`
- will emit another asset, with the same name as the `.svelte` file, except with `.css` extension.
- which means if you have a physical `.css` file with the same name will be overwritten.

- TODO? writing a emit css file loader plugin

## Preloading Google Fonts

- Better to host the fonts on our own (https://ashton.codes/preload-google-fonts-using-resource-hints/#:~:text=A%20Google%20Font%20link%20is%20a%20stylesheet%20link&text=It%20turns%20out%20preload%20serves,ll%20say%20you%20need%20it.)


rollup plugin replace
- hostname
- emit css

## Broken styles

- Noticed that the `_style.css` file is in the github `/docs` folder, but get 404 when request for it.
- Found out that filename starts with underscore is not served by Github Pages.

## Todo

- [ ] manifest.json
- [ ] offline support
- [ ] dark mode
- [ ] snippet diff+javascript
- [ ] common css chunk
- [x] google analytics
- [ ] webmentions
- [x] carbon ads
- [ ] rss support
