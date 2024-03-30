---
title: Custom Flags with Puppeteer
tags:
  - puppeteer
---

Puppeteer https://github.com/GoogleChrome/puppeteer

- set custom debugging port
  ```js
  puppeteer.launch({ args: ['--remote-debugging-port=12345'] })
  ```
  
Chrome flags: 
  - https://peter.sh/experiments/chromium-command-line-switches/
