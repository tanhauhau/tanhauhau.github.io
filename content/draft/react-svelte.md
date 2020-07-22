- useState
- derived state
- controlled input
- useEffect

- 3rd party library integration

- suspense
- context
- error boundary?
- if else
- each loop
- children -> render props
- spread \$\$restProps

- binding refs
- element ref / component ref

subscribing to events, \$store
^^ useSwc
each else
each keyed

# structure

- fragment
- inline-style
- classNames
  inline text
  {mustache}
  dangerouslySetInnerHtml {@html}

---

Been using @reactjs for years, here is how @sveltejs code is different from @reactjs

1️⃣ Stateless Component

```jsx
// filename: Component.jsx
import React from 'react';

export default function Component() {
  return <div>Hello <span>world<span></div>
}
```

```svelte
<!-- filename: Component.svelte -->
<div>Hello <span>world<span></div>
```

2️⃣ Fragment

📝 You don't need a Fragment to group multiple elements in @sveltejs

```jsx
// filename: Component.jsx
import React from 'react';

export default function Component() {
  return (
    <>
      <div>Hello</div>
      <div>World</div>
    </>
  );
}
```

```svelte
<!-- filename: Component.svelte -->
<div>Hello</div>
<div>World</div>
```

3️⃣ Inline styles

🙆‍♂️ You can extend and manipulate the style object in @reactjs
🙅‍♂️ It's a bane to copy the styles from the DOM into the code after tweaking it in the browser devtools
😍 So much easier when you can just copy the inline styles from browser into your code.

```jsx
// filename: Component.jsx
import React from 'react';

export default function Component() {
  return <div style={{ backgroundColor: 'red', paddingBottom: 4 }}>Hello</div>;
}
```

```svelte
<!-- filename: Component.svelte -->
<div style="background-color: red; padding-bottom: 4px;">Hello</div>
```

4️⃣ className

🙅‍♂️ className instead of class somehow confuses new web devs that `className` is a html attribute (similarly, htmlFor 🙈)
😍 So much easier to conditionally add class names to element in @sveltejs

```jsx
// filename: Component.jsx
import React from 'react';

export default function Component({ condition }) {
  return <div className={`foo ${condition ? 'bar' : ''}`}>Hello</div>;
}
```

```svelte
<!-- filename: Component.svelte -->
<script>
  export let condition;
</script>

<div class="foo" class:bar={condition}>Hello</div>
```

5️⃣ Expressions

📝 {} for embedding expressions in JSX
📝 {} for embedding data in @sveltejs template

```jsx
// filename: Component.jsx
import React from 'react';

export default function Component() {
  return <div>{1 + 2}</div>;
}
```

```svelte
<!-- filename: Component.svelte -->
<div>{1 + 2}</div>
```

6️⃣ dangerouslySetInnerHtml

🙆‍♂️ It feels more dangerous in @reactjs to inline data as html
🙅‍♂️ Somehow you always need a element container to set innerHtml in @reactjs 😅
😍 You can insert HTML anywhere with {@html}

```jsx
// filename: Component.jsx
import React from 'react';

export default function Component() {
  return <div dangerouslySetInnerHTML={{ __html: '<b>hello</b>' }} />;
}
```

```svelte
<!-- filename: Component.svelte -->
{@html '<b>hello</b>'}
```

7️⃣ ref

📝 in @reactjs, you use ref to get the reference of a DOM node / component instance
👉 ref.current to get the reference

📝 in @sveltejs, you use `bind:this` to bind the reference to a variable

```jsx
// filename: Component.jsx
import React, { useRef } from 'react';

export default function Component() {
  const div = useRef();
  const comp = useRef();

  function foo() {
    div.current; // DOM node
    comp.current; // AnotherComponent instance
  }

  return (
    <>
      <div ref={div} />
      <AnotherComponent ref={comp} />
    </>
  );
}
```

```svelte
<!-- filename: Component.svelte -->
<script>
  let div, comp;

  function foo() {
    div; // DOM node
    comp; // AnotherComponent instance
  }
</script>

<div bind:this={div} />
<AnotherComponent bind:this={comp} />
```

8️⃣ props

📝 in @reactjs, functional component's props is passed in via arguments
📝 in @sveltejs, you use `export` to define props

🤔 in the example, Component has 2 props, `value` and `max`, and max has a default value of 5.

```jsx
// filename: Component.jsx
import React from 'react';

export default function Component({ value, max = 5 }) {
  // ...
  return <>...</>
}

// filename: App.jsx
<Component value={2} />
```

```svelte
<!-- filename: Component.svelte -->
<script>
  export let value;
  export let max = 5;
</script>

<!-- filename: App.svelte -->
<Component value={2} />
```

9️⃣ rest and spread props

📝 in @reactjs, you use rest destructuring `...` to get the rest of the props, and spread operator `...` to spread an object into props
📝 the rest of the props is available as the magic global `$$restProps`

```jsx
// filename: Component.jsx
import React from 'react';

export default function Component({ value, ...rest }) {
  // ...
  const props = { a: 1, b: 2 };
  return <div c="3" {...props} {...rest} />
}
```

```svelte
<!-- filename: Component.svelte -->
<script>
  export let value;
  let props = { a: 1, b: 2 }
</script>

<div c="3" {...props} {...$$restProps} />
```

1️⃣0️⃣ state

📝 @reactjs useState hook returns the state and a setter to sets the state
📝 in @sveltejs you declare a variable as the state, update the variable directly to update the state

```jsx
// filename: Component.jsx
import React, { useState } from 'react';

export default function Component() {
  const [count, setCount] = useState(5);

  function onClick() {
    setCount(6);
  }

  return <div>{count}<button onClick={onClick}>6</button></div>
}
```

```svelte
<!-- filename: Component.svelte -->
<script>
  let count = 5;

  function onClick() {
    count = 6;
  }
</script>

<div>{count}<button on:click={onClick}>6</button></div>
```

1️⃣1️⃣ Derived state

📝 In @reactjs, you can have a state derived from another state, and if the operation is expensive, useMemo to memoise the operation
📝 In @sveltejs, you can reactively declare a variable, whose value will be reactively updated based on its dependency


```jsx
// filename: Component.jsx
import React, { useState, useMemo } from 'react';

export default function Component() {
  const [items, setItems] = useState([]);

  // computes on every render
  const doneItems = items.filter(item => item.done);
  // if too expensive, useMemo will only evaluate when items changed
  const itemStats = useMemo(() => calculateStat(items), [items]);

  return <Component doneItem={doneItem} itemStats={itemStats} />
}
```

```svelte
<!-- filename: Component.svelte -->
<script>
  let items = [];

  // reactive declaration
  // only runs when items changed
  $: doneItems = items.filter(item => item.done);
  $: itemStats = calculateStat(items);
</script>

<Component doneItem={doneItem} itemStats={itemStats} />
```

1️⃣2️⃣ useEffect

