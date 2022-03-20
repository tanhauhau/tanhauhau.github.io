---
title: React Suspense
tags:
  - react
---

```js
import React, {
  Suspense,
  useState,
  useReducer,
  useContext,
  useEffect
} from "react";
import "./styles.css";

const Context = React.createContext(0);

export default function App() {
  const [count, setCount] = useReducer(s => s + 1, 0);
  return (
    <Context.Provider value={count}>
      <Suspense fallback={null}>
        <WithEvenLoading />
        <Loading />
        {count % 2 === 0 && <EvenCounter />}
        <Counter />
      </Suspense>
      <button onClick={() => setCount()}> ++</button>
    </Context.Provider>
  );
}

function WithEvenLoading() {
  const count = useContext(Context);
  useEffect(() => {
    console.log("With Even Loading", count);
  }, [count]);

  return <div>{<Loading />}</div>;
}

function Loading() {
  const count = useContext(Context);
  useEffect(() => {
    console.log("Loading", count);
  }, [count]);

  throw new Promise(() => {});
}

function Counter() {
  const count = useContext(Context);
  useEffect(() => {
    console.log("Counter", count);
  }, [count]);
  return <div>{count}</div>;
}

function EvenCounter() {
  const count = useContext(Context);
  useEffect(() => {
    console.log("Even Counter", count);
    return () => {
      console.log("unmount even counter");
    };
  }, [count]);
  return <div>{count}</div>;
}
```

- suspended component sibling still behaves normally
- layers of component in between `<Suspense>` and suspended component still behaves normally
