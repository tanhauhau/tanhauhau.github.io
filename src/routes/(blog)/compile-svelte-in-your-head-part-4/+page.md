---
title: Compile Svelte in your head (Part 4)
date: '2020-09-22T08:00:00Z'
tags:
  - Svelte
  - JavaScript
series: Compile Svelte in your head
label: blog
---

> **⚠️ This article was written for Svelte 3/4. For Svelte 5, please read the updated series: [Compile Svelte 5 in your head](/compile-svelte-5-in-your-head)**

**⬅ ⬅ Previously in [Part 3](/compile-svelte-in-your-head-part-3/).**

In this article, we are going to cover our first logic block, the **if block**.

To make sure we are on the same page, let's first explain how if block works.

## The `{#if}` block

To render content conditionally, you can wrap it with the `{#if}` block:

```svelte
{#if condition}
  <div>Conditionally rendered content</div>
{/if}
```

If the `condition` is truthy, you will see the `<div>Conditionally rendered content</div>`, otherwise you will see nothing.

Like JavaScript, you can use `else` and `else if` in Svelte to test multiple conditions too:

```svelte
{#if condition_a}
  <div>Rendered due to condition_a</div>
{:else if condition_b}
  <div>Rendered due to condition_b</div>
{:else}
  <div>Otherwise</div>
{/if}
```

You can visit Svelte's interactive tutorial to learn more about the [`{#if}` logic block](https://svelte.dev/tutorial/if-blocks).

## The Vanilla JS

So how do we implement an `{#if}` logic without any framework?

As [mentioned in the Part 1 of the series](/compile-svelte-in-your-head-part-1/#creating-an-element), we've seen how we can create elements without framework help.

### Implementating the if block

Implementing an `{#if}` logic block can be as follow:

```js
function createElementsIfConditionA() {
  // code to create `<div>Rendered due to condition_a</div>`
}
function createElementsIfConditionB() {
  // code to create `<div>Rendered due to condition_b</div>`
}
function createElementsElse() {
  // code to create `<div>Otherwise</div>`
}

function createIfBlock() {
  if (condition_a) {
    createElementsIfConditionA();
  } else if (condition_b) {
    createElementsIfConditionB();
  } else {
    createElementsElse();
  }
}
```

The `condition_a` and `condition_b` could be dynamic, which means if the condition changed, we may need to call `createIfBlock` again.

But before that, we need to remove the elements that we created previously. This depends on which conditions were met previously, and which elements were created previously.

So, let's store that information in a variable:

```js
function destroyElementsIfConditionA() {
  // code to destroy `<div>Rendered due to condition_a</div>`
}
function destroyElementsIfConditionB() {
  // code to destroy `<div>Rendered due to condition_b</div>`
}
function destroyElementsElse() {
  // code to destroy `<div>Otherwise</div>`
}

// highlight-start
let previousDestroy;
function getPreviousDestroy() {
  if (condition_a) {
    previousDestroy = destroyElementsIfConditionA;
  } else if (condition_b) {
    previousDestroy = destroyElementsIfConditionB;
  } else {
    previousDestroy = destroyElementsElse;
  }
}
// highlight-end

function createIfBlock() {
  // ...
  // highlight-next-line
  getPreviousDestroy();
}
```

So, **if conditions changed**, we destroy the previously created elements, and create a new one:

```js
function updateIfBlock() {
  // if `condition_a` or `condition_b` changed
  if (conditionChanged) {
    previousDestroy();
    createIfBlock();
  }
}
```

However, if the condition does not change, but the content within the if block changes, for example, `value_a`, `value_b` or `value_else` change in the following code:

```svelte
{#if condition_a}
  <div>{ value_a }</div>
{:else if condition_b}
  <div>{ value_b }</div>
{:else}
  <div>{ value_else }</div>
{/if}
```

Then we need to know how to update the elements as well:

```js
function updateElementsIfConditionA() {
  // code to update `<div>{ value_a }</div>`
}
function updateElementsIfConditionB() {
  // code to update `<div>{ value_b }</div>`
}
function updateElementsElse() {
  // code to update `<div>{ value_else }</div>`
}

function updateIfBlock() {
  // if `condition_a` or `condition_b` changed
  if (conditionChanged) {
    previousDestroy();
    createIfBlock();
    // highlight-start
  } else {
    if (condition_a) {
      updateElementsIfConditionA();
    } else if (condition_b) {
      updateElementsIfConditionB();
    } else {
      updateElementsElse();
    }
  }
  // highlight-end
}
```

Finally to destroy the elements if we want to unmount the whole `{#if}` block, we can use `previousDestroy`, since it will be based on the conditions that the elements were created with:

```js
function destroyIfBlock() {
  previousDestroy();
}
```

Here we have `createIfBlock`, `updateIfBlock` and `destroyIfBlock`. It looks unwieldy, as the `if (condition)` logic is scattered across `createIfBlock`, `getPreviousDestroy` and `updateIfBlock`.

So, let's refactor this. Let's shift code around to make it cleaner. ✨

### Refactor the code

For each of the logic branch, we have functions to create, update and destroy its elements. For the first condition branch, we have:

- `createElementsIfConditionA`
- `updateElementsIfConditionA`
- `destroyElementsIfConditionA`

It seems like we can employ some sort of [Strategy Pattern](https://dev.to/carlillo/design-patterns---strategy-pattern-in-javascript-2hg3) over here.

We can group the operations for each condition branch together, where each operation has the same interface, `{ create(){}, update(){}, destroy(){} }` :

```js
const operationConditionA = {
  create: createElementsIfConditionA,
  update: updateElementsIfConditionA,
  destroy: destroyElementsIfConditionA,
};
const operationConditionB = {
  create: createElementsIfConditionB,
  update: updateElementsIfConditionB,
  destroy: destroyElementsIfConditionB,
};
const operationConditionElse = {
  create: createElementsElse,
  update: updateElementsElse,
  destroy: destroyElementsElse,
};
```

Now, we choose the operation based on the condition, since they have the same interface, they should be able to be used interchangeably:

```js
function getOperation() {
  if (condition_a) {
    return operationConditionA;
  } else if (condition_b) {
    return operationConditionB;
  } else {
    return operationConditionElse;
  }
}
```

Here, we can rewrite our `createIfBlock`, `updateIfBlock` and `destroyIfBlock`:

```js
let currentOperation = getOperation();

function createIfBlock() {
  currentOperation.create();
}

function updateIfBlock() {
  const previousOperation = currentOperation;
  currentOperation = getOperation();
  // if (conditionChanged)
  if (currentOperation !== previousOperation) {
    previousOperation.destroy();
    currentOperation.create();
  } else {
    currentOperation.update();
  }
}

function destroyIfBlock() {
  currentOperation.destroy();
}
```

To determine whether the condition changed, we can compute the operation and compare it with the previous operation to see if it has changed.

## The Compiled JS

Now let's take look at how Svelte compiles `{#if}` into output JavaScript.

```svelte
<script>
	let loggedIn = false;

	function toggle() {
		loggedIn = !loggedIn;
	}
</script>

{#if loggedIn}
	<button on:click={toggle}>
		Log out
	</button>
{:else}
	<button on:click={toggle}>
		Log in
	</button>
{/if}
```

[Svelte REPL](https://svelte.dev/repl/39aec874a5214a35b34ff069ae9fa143)

The output code:

<details>

<summary>Click to expand...</summary>

```js
/* App.svelte generated by Svelte v3.25.1 */
// ...
function create_else_block(ctx) {
  // ...
  return {
    c() { /* ... */ },
    m(target, anchor) { /* ... */ },
    p: noop,
    d(detaching) { /* ... */ },
  };
}

// (9:0) {#if loggedIn}
function create_if_block(ctx) {
  // ...
  return {
    c() { /* ... */ },
    m(target, anchor) { /* ... */ },
    p: noop,
    d(detaching) { /* ... */ },
  };
}

function create_fragment(ctx) {
  // ...
  function select_block_type(ctx, dirty) {
    if (/*loggedIn*/ ctx[0]) return create_if_block;
    return create_else_block;
  }

  let current_block_type = select_block_type(ctx, -1);
  let if_block = current_block_type(ctx);

  return {
    c() {
      if_block.c();
      if_block_anchor = empty();
    },
    m(target, anchor) {
      if_block.m(target, anchor);
      insert(target, if_block_anchor, anchor);
    },
    p(ctx, [dirty]) {
      if (current_block_type === (current_block_type = select_block_type(ctx, dirty)) && if_block) {
        if_block.p(ctx, dirty);
      } else {
        if_block.d(1);
        if_block = current_block_type(ctx);

        if (if_block) {
          if_block.c();
          if_block.m(if_block_anchor.parentNode, if_block_anchor);
        }
      }
    },
    i: noop,
    o: noop,
    d(detaching) {
      if_block.d(detaching);
      if (detaching) detach(if_block_anchor);
    },
  };
}
```

</details>

Some observations:

**Observation 1: If you compare the Svelte's compiled output and the JS code we came out earlier, you may see some resemblance:**
- For each logic branch, we have a [`create_fragment` function](/compile-svelte-in-your-head-part-1/#create-fragment), which in this case is `create_else_block` and `create_if_block`. As explain in the previous article, these functions return an *instruction manual* on how to build the DOM fragment for each logic branch.
  
  This is similar to the operations we discussed earlier, eg: `operationConditionA`, `operationConditionB` and `operationConditionElse`.

- To determine which `create_fragment` function to use, we have the `select_block_type` function.

  This is similar to the `getOperation` we discussed earlier.

- We then initialise the fragment for the current condition branch,

```js
let current_block_type = select_block_type(ctx, -1);
let if_block = current_block_type(ctx);
```

- Now we can:
  - create `if_block.c()`
  - mount `if_block.m(target, anchor)`
  - update `if_block.p(ctx, dirty)`
  - destroy `if_block.d(detaching)`

  elements for the `{#if}` block.

- In the `p` **(u_p_date)** method, we check if the `current_block_type` has changed, if not, then we call `if_block.p(ctx, dirty)` to update as necessary.

  If there's change, then we destroy `if_block.d(1)` the previous elements, create a new fragment based on the `current_block_type`, then create and mount the elements via `if_block.c()` and `if_block.m(...)`.

  This is similar to how we call `previousOperation.destroy()` and `currentOperation.create()`  or `currentOperation.update()`.

**Observation 2: There's a `if_block_anchor` inserted after the `if_block`**

```js
if_block_anchor = empty()
```

`empty()` creates an empty text node.

```js
// https://github.com/sveltejs/svelte/blob/v3.25.1/src/runtime/internal/dom.ts#L56-L58
export function empty() {
  return text('');
}
```

The `if_block_anchor` is then used when mounting the `if_block` in the **u_p_date** method.

```js
if_block.m(if_block_anchor.parentNode, if_block_anchor)
```

So what is this extra empty text node for?

### The extra text node

When we update the `{#if}` block and notice that we need to change the fragment block type, we need to destroy the elements created previously, and insert newly created elements.

When we insert the new elements, we need to know where to insert them. The [`insertBefore`](https://developer.mozilla.org/en-US/docs/Web/API/Node/insertBefore) API allow us to specify which node the elements should be inserted before. So now it begs the question, which node?

The answer depends on the position `{#if}` block is written in the component. There are 4 possible scenarios:

**1. There's an element right after the `{#if}` block**

```svelte
{#if condition}
  <div />
{/if}
<span />
```

[Svelte REPL](https://svelte.dev/repl/5d75daf3190f412f83656fd2e689cb14)

You'll see that
- Svelte does not create the extra text node
- Instead, Svelte uses the `<span />` node instead
  
```js
if_block.m(span.parentNode, span)
```

> When the `{#if}` condition changes, `{#if}` block will replace and insert new elements before the `<span />` element.

**2. `{#if}` block is the last child, `{#if}` block has a parent**

```svelte
<div>
  {#if condition}
    <div />
  {/if}
</div>
```

[Svelte REPL](https://svelte.dev/repl/5fac48804cfb49639cfda1ab8273cba8)

You'll see that
- Svelte does not create the extra text node
- Instead, Svelte inserts the `{#if}` block into the parent node, `<div />` and insert before `null`. (If you pass `null` to `insertBefore`, it will append the element as the last child)

```js
if_block.m(div, null);
```

> When the `{#if}` condition changes, `{#if}` block will replace and insert new elements as the last children of the parent `<div />` element.

**3. `{#if}` block is the last child, `{#if}` block does not have a parent**

```svelte
{#if condition}
  <div />
{/if}
```

[Svelte REPL](https://svelte.dev/repl/b9b5dae5ab9f4399bf901f802a6885cb)

You'll see that
- Svelte creates an extra `anchor` element
- The `anchor` element is inserted after the `{#if}` block.
- Subsequently in the **u_p_date** function, Svelte insert `{#if}` block before the `anchor` element.

```js
if_block.m(if_block_anchor.parentNode, if_block_anchor);
```

> When the `{#if}` condition changes, `{#if}` block will replace and insert new elements before the `anchor` element.

But why?

This is because a Svelte component can be used in anywhere.

Let's take a look at the scenario below:

```svelte
<!-- A.svelte -->
{#if condition}
  <div id="a" />
{/if}

<!-- B.svelte -->
<div id="b" />

<!-- App.svelte -->
<script>
  import A from './A.svelte';
  import B from './B.svelte';
</script>

<div id="parent">
  <A />
  <B />
</div>
```

In the `A.svelte`, the `{#if}` block is the last child, it does not have any sibling elements after it. 

Let's first assume we don't have the `anchor` element. When the `condition` changes from `false` to `true`, Svelte will have to insert the new element `<div id="a">` into its parent. And because there's no next element after `{#if}` block, and no `anchor` element, we will have to insert before `null`. In which, the `<div id="a" />` will be inserted as the last child of the parent element, `<div id="parent">`. And hey, we got ourselves a bug! Elements inside `<A />` appears after `<B />`!

```html
<div id="parent">
  <div id="b"></div>
  <div id="a"></div> <!-- newly inserted element -->
</div>
```

We can prevent this from happening by adding an `anchor` element.

When the `condition` is `false`, our DOM looks like this:

```html
<div id="parent">
  <#text /> <!-- an empty text node, not visible to the user -->
  <div id="b"></div>
</div>
```

And when the `condition` turns `true`, we insert `<div id="a" />` before the `anchor` element:

```html
<div id="parent">
  <div id="a"></div> <!-- newly inserted element -->
  <#text /> <!-- an empty text node, not visible to the user -->
  <div id="b"></div>
</div>
```

Yay, we maintain the order of `<A />` and `<B />` 🎉 !

The `anchor` element to the `{#if}` block, is like [an anchor to a ship](https://www.britannica.com/technology/anchor-nautical-device), "Here is where `{#if}` block should `insertBefore()` !"

**4. `{#if}` block followed by another logic block**

The final scenario. `{#if}` block followed by another logic block:

```svelte
{#if condition}
  <div id="a" />
{/if}
{#if condition2}
  <div id="b" />
{/if}
```

The 2nd `{#if}` block condition could be `true` or `false`. Which means `<div id="b" />` could be there or not there.

So, to know where we should insert `<div id="a" />` when chaging the `condition`, we need an `anchor` element after the 1st `{#if}` block, before the 2nd `{#if}` block.

## Closing Note

We've covered how Svelte compiles an `{#if}` block, as well as how and why an `anchor` element is needed for the `{#if}` block.

If you wish to learn more about Svelte, [follow me on Twitter](https://twitter.com/lihautan).

I'll post it on Twitter when the next part is ready, the next post will be about `{#each}` logic block.
