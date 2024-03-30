---
title: enhanced-resolve
tags:
  - webpack internals
---

**`parsed-resolve` -> `described-resolve`**

##  DescriptionFilePlugin
- use `DescriptionFileUtils.loadDescriptionFile` to find the nearest parent `package.json` starting from `request.path`. 
- adds:
  - `descriptionFilePath`
  - `descriptionFileData`
  - `descriptionFileRoot`
  - `relativePath`


