---
title: 'Yet Another Micro Frontend Proof of Concept'
date: '2019-07-15T08:00:00Z'
description: A decentralised router definition
wip: true
label: blog
---

Yes, this is [yet another proof of concept for micro frontend architecture](https://github.com/tanhauhau/micro-frontend).

Please [check out the code](https://github.com/tanhauhau/micro-frontend) and try to play with it locally.

## What is this different?

- **No centralised routing definition**
  
  Once the main SPA is deployed, new routes can be added to the SPA without redeploying the main SPA.

- **A central registry**
  
  Individual micro frontend does not need to bundle in common dependencies like `react`, `react-router`, eg. Furthermore, they **shouldn't be** bundled into the micro frontend as multiple instance of `react` or `react-router` may cause some bugs.

- **A shared global state**
  
  In this demo, I am using [redux](https://redux.js.org) for state management.

  Each micro-frontend is connected to the same global store, so data is easily shared across the application.

## The Bridge

The center piece of this micro frontend architecture is [the Bridge](https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/Bridge/index.js).

It contains 2 types of communication method:
- message passing
- shared memory

**Message passing** is done via a pub sub mechanism called [the Channel](https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/Bridge/Channel.js), whereas **shared memory** is done via [the Registry](https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/Bridge/Registry.js).

I attach the Bridge to the window, so each micro frontend can connect to the bridge.

## The routing mechanism

In the PoC, I used [react-router](https://reacttraining.com/react-router/web) as the routing library. The [route definition](https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/App/Routes.js#L17) is dynamic, as it listens `"registerRoute"` event through _the Bridge_, and add it to the route definition.

One thing to note is that, I use `<Switch />`, which will render the first `<Route />` that matches the url.

The magic happens in the last route, which will be rendered when none of the routes in the route definition matches.

The last route renders the [Fallback Discovery](https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/App/FallbackDiscovery.js) component, which will based on the current location and some pre-defined rules, tries to find the micro frontend manifest for the unknown route. 

If the micro frontend manifest does not exist, it will render a 404 page. However, if the manifest exists, it will fetch the manifest file.

The micro frontend manifest file is nothing but a json file that contains the [entry asset](https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/App/FallbackDiscovery.js#L31) for the route micro frontend.

Once the entry asset is loaded, the new micro frontend itself will register a new route to the route definition via `"registerRoute"` event, which has to be the route that matches the current URL.

Whenever there's a new route added, the `react-router`'s `<Router />` component will re-render and it will match the newly added route, which renders our newly added micro-frontend.

## The global registry

There's 2 main reasons why I am not bundling `react`, `react-redux`, and `react-router` into each micro frontends:

- **Bundle size**, there's no reason to download duplicate copies of `react` or `react-redux`.

- **No multiple instance**, both `react-redux` and `react-router` uses React Context to pass information down the React component tree. However, this way of data passing disallow multiple instances of the _Context_ object, as each instances has a different memory reference.

So, the main SPA runtime bundles `react`, `react-redux`, etc and [set it into the `Bridge.Registry`.](https://github.com/tanhauhau/micro-frontend/blob/master/packages/base/src/initRegistry.js#L9).

When each micro-frontend is built, the _import statement_ for these modules [will be transformed](https://github.com/tanhauhau/micro-frontend/blob/master/packages/food/webpack.config.js#L23) into the [some aliases](https://github.com/tanhauhau/micro-frontend/blob/master/packages/build/BridgeAliasPlugin/aliases/react.js), that reads the module from the `Bridge.Registry`.

## Shared Global State

In the PoC, the micro frontends are [connected to the shared global store via `connect()` from `react-redux`](https://github.com/tanhauhau/micro-frontend/blob/master/packages/food/src/FoodDetail.js#L36)

Interesting to note is that both [the food detail](https://github.com/tanhauhau/micro-frontend/blob/master/packages/food/src/FoodDetail.js#L13) and [the food list](https://github.com/tanhauhau/micro-frontend/blob/master/packages/foods/src/FoodList.js) register the same key for the reducer, but yet both of the works seamlessly.

Note that when we transit from Food List page to Food Detail page, we already have the food detail information from the store, therefore there is no need to fetch the food detail anymore.

## Trying it out locally

Run `yarn start` in the root folder, which will [start a simple express server](https://github.com/tanhauhau/micro-frontend/blob/master/scripts/start-dev-server.js). The express server is used to serve static files based on specific rules.

To build individual micro frontends, you need to go to each folder and run `yarn build`. Alternatively, you can start the watch mode via `yarn dev`.

### Developing the micro frontend individually

WIP