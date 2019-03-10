---
title: Dynamically load reducers for code splitting in a React Redux application
date: "2017-11-16T08:00:00Z"
description: "How to inject reducer asynchronously"
---

> This article assumes you have basic knowledge on React and Redux. If you like to learn more about React or Redux, you can go here to learn more.

---

## Context
A common pattern to write a React Redux application is to have:

- a `rootReducer` that imports **all the reducers** that will be used in the application
- a `reduxStore` that is created using `rootReducer`
- the React application
- [react-redux](https://github.com/reduxjs/react-redux) that bridge React components and Redux together

This is what its going to be look like in code:

```jsx
// root.js
import React from 'react';
import { Provider } from 'react-redux';
import { store } from  './store';
import CustomComponent from './CustomComponent';

export default function App() {
  return (
    // react-redux provider to provide the store in React context
    <Provider store={store}>
      <CustomComponent />
    </Provider>
  );
}

// store.js
import { createStore, combineReducers } from 'redux';

// import all your reducers here
import reducerA from './reducerA';
import reducerB from './reducerB';
import reducerC from './reducerC';

// combine all your reducers here
const rootReducer = combineReducers({
  reducerA: reducerA,
  reducerB: reducerB,
  reducerC: reducerC,
});

// create the redux store!
export const store = createStore(rootReducer);

// CustomComponent.js
import React from 'react';
import { connect } from 'react-redux';

function CustomComponent() {
  return <div></div>;
}

const mapStateToProps = state => { return {}; };
const mapDispatchToProps = dispatch => ( return {}; };
export default connect(mapStateToProps, mapDispatchToProps)(CustomComponent);
```

## Problem
Everything seemed perfect, until your app size increases too fast…

It takes much longer time to load your web app, and things got worse with a crappy internet speed…

## Solution
I know you [must have googled for the solution online.](http://lmgtfy.com/?q=code-splitting) 😉

So, lets talk about one of the solutions that you can do to make your app bundle smaller  — [ code splitting using webpack](https://webpack.js.org/guides/code-splitting/)!

> Code splitting is one of the most compelling features of webpack. This feature allows you to split your code into various bundles which can then be loaded on demand or in parallel. It can be used to achieve smaller bundles and control resource load prioritization which, if used correctly, can have a major impact on load time. —[ webpack](https://webpack.js.org/guides/code-splitting/)

Great! Webpack provides [import()](https://webpack.js.org/guides/code-splitting/#dynamic-imports) syntax, that conforms to the [ECMAScript proposal](https://github.com/tc39/proposal-dynamic-import) for dynamic imports. Let’s try to split our code [based on different entry points of your routes](https://github.com/ReactTraining/react-router/blob/master/packages/react-router-dom/docs/guides/code-splitting.md). This makes perfect sense, user that goes to `mywebsite/foo` do not need code that is written only for `mywebsite/bar`!

By now, you should realise, reducer that is written only for `mywebsite/bar`, shouldn’t be imported or included when you are visiting `mywebsite/foo`!

> Then how do I dynamically load reducers for code splitting in a Redux application?

That’s a [StackOverflow thread](https://stackoverflow.com/questions/32968016/how-to-dynamically-load-reducers-for-code-splitting-in-a-redux-application) that you should read about.

> There may be neater way of expressing this — I’m just showing the idea.

Yes, one of a neater way is to write a higher order component that takes care of dynamically loading of reducers.

```jsx
import React from 'react';
import gameReducer from './gameReducer';
import injectReducer from 'inducer';

class CustomComponent extends React.Component {
  // component logic here
}
export default injectReducer({
  game: gameReducer
})(CustomComponent);
```

[inducer](https://www.npmjs.com/package/inducer) (read: **In**ject Re**ducer**) gives you a HOC that will add you reducer to the Redux store that is currently using during `componentWillMount` and remove it during `componentWillUnmount`. It’s that simple!

> So, how does inducer actually works?

Firstly, inducer HOC gets the store from context, provided from the StoreProvider of `react-redux` .

```js
InjectReducer.contextTypes = {
  store: PropTypes.shape({
     replaceReducer: PropTypes.func.isRequired,
  }),
};
```

Next, inducer HOC comes up with the new async root reducer that includes the reducer you want to include, and use [replaceReducer](https://redux.js.org/api/store#replaceReducer) from Redux to updates the reducer.

When `componentWillUnmount` inducer will remove your reducer and call `replaceReducer` again!

You can read the [complete code](https://github.com/tanhauhau/inducer/blob/master/src/index.js) here!