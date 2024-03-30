---
title: Took me hours to realise why docker build ignores my .dockerignore
date: "2017-11-26T08:00:00Z"
description: "...and this is what I've learned"
label: blog
---

From the [official docs](https://docs.docker.com/engine/reference/builder/#dockerignore-file) of docker for .dockerignore:

> Before the docker CLI sends the context to the docker daemon, it looks for a file named `.dockerignore` in the root directory of the context. If this file exists, the CLI modifies the context to exclude files and directories that match patterns in it. This helps to avoid unnecessarily sending large or sensitive files and directories to the daemon and potentially adding them to images using `ADD` or `COPY`.

Docker CLI will only look for `.dockerignore` file in the **root directory of the context**, if you have a monorepo of multiple packages, make sure `.dockerignore` file is on the root directory of your context, it will ignore it if it is somewhere in the subfolder.

About pattern matching of the ignored file, `*/temp` will match `a/temp` and `b/temp` but not `temp` or `a/b/temp` from the root directory. To match 2 levels deep only, you need to write `*/*/temp` and for arbitrary levels, use `**` it will match any number of directory including zero, eg: `**/temp` matches `temp`, `a/temp` and `a/b/temp` !

---

Further reading:

To understand more why you **should not ignore** `.dockerignore`, read [this article](https://codefresh.io/docker-tutorial/not-ignore-dockerignore/). It gives a lot of insight why `.dockerignore` file is important.