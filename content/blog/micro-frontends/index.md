---
title: 'Micro Frontends: Independent Development for SPA'
date: '2019-07-15T08:00:00Z'
description: Scaling frontend single page application
wip: true
---

> _Good frontend development is hard. Scaling frontend development so that many teams can work simultaneously on a large and complex product is even harder._
>
> <div style="text-align: right;">Cam Jackson on <a href="https://martinfowler.com/articles/micro-frontends.html" target="_blank" rel="noopener noreferrer">"Micro Frontends"</a></div>

If you haven't read [Cam Jackson](https://twitter.com/thecamjackson)'s ["Micro Frontends"](https://martinfowler.com/articles/micro-frontends.html), it is an elaborate article that explains the whys and hows of micro-frontend that you should not miss.

Since that article has detailed explanation of the pain points of traditionally built [SPA (Single Page Application)](https://en.wikipedia.org/wiki/Single-page_application), the benefits of micro-frontends, and how to implement one, so why would I want to write another article on the same topic?

**Short answer:** I have a different approach to micro frontend that wasn't covered, and I would like to share them with you.

But before that, let's talk about what is **micro frontend**?

# What is micro frontends?

Micro Frontend is an architecture that allows different pieces of the whole frontend application to be developed and delivered independently.

There's different type of micro frontend architecture, varying on the independency and the scale of each individual pieces:

- **Multi-Page Application (MPA)**

  Each page in an MPA is a separate application.

  When the user changes the url, the current application "unmounts" and the new application "mounts". All the internal state, memory is cleaned up by default by the browser.

  The way to communicate between different application is via:

  - the server
  - the URL
  - local storage, cookie, etc

- **Route level Micro Frontend for Single-Page Application (SPA)**

  Similar to MPA where each page is a separate micro frontend, but for SPA, there's a layer below each micro frontend, that manages the history and routing, shared global state, (eg: user information) and shared common services (eg: authenticating.).

  Data can be shared across each micro frontend via:

  - browser history
  - shared global state

- **Component level Micro Frontend**

  Multiple micro frontends within a page.

  Communication is done via:

  - custom events
  - component props or attributes, between outside and inside of the micro frontend component

  Having multiple micro frontends within a page should be rare, as it is uncommon to have a page that has components that are so varied to the extent requires a separate team & deployment cycle for them. The communication cost would be high, and it is rare to have the upside outweigh the costs.

In this article, I will be mainly talking about **Route level Micro Frontend for SPA**.

# Benefits of micro frontend

To consider whether you should implement micro frontend into your project, is to understand the benefits of micro frontend. So you know whether the trade-offs are worth the benefits it brings.

## Independent development

The key to micro frontend, irrelevant to how we structure them, is to allow individual micro frontend be developed, tested, and deployed independently.

Although rarely mentioned, but as the size of the SPA codebase scales, it gets slower and slower to develop and build it. Even the change you are going to make affects only one page, webpack will still have to parse through every file dependencies when it builds.

A separate deployment process means you wouldn't need to parse/build unnecessary files.

## Autonomous teams

A good micro frontend architecture should allow different teams to make different tech decision, eg libraries, build optimisation, etc.

However, the freedom of tech decision might lead to a fractionated application.

# The problem

By allowing independent development and autonomous teams might bring some unintended problems:

## Should each micro frontend choose their own frontend frameworks?

Frontend framework nowadays commonly comes with a framework runtime. The extra cost of another framework should be considered when making the decision.

Having said that, the micro frontend architecture should be framework agnostic. As frontend is a fast changing world, a better frontend archictecture could be created overnight. The micro frontend architecture should be open to different frameworks and open to experimentation.

