---
title: 'Contributing to Svelte - Implement {#key}'
date: '2020-09-27T08:00:00Z'
tags:
  - Svelte
  - JavaScript
  - Open Source
series: Contributing to Svelte
description: 'I am going to share an anecdote on how I implemented {#key} logic block in Svelte'
---

## Background

Unlike the other contributing to Svelte posts [[1](/contributing-to-svelte-fixing-issue-5012)] [[2](/contributing-to-svelte-fixing-issue-4392)], which I wrote it while implementing the fix, describing as detailed as possible, today I am going to share the process of how I implemented the `{#key}` block retrospectively.

The implementation of the `{#key}` block is much simpler, relative to `{#if}`, `{#await}` or `{#each}`. And I believe the process of implementing the `{#key}` block helps paint the pratical side of ["The Svelte Compiler Handbook"](/the-svelte-compiler-handbook) or my ["Looking into the Svelte compiler" talk](/looking-into-the-svelte-compiler).

## The motivation

The idea of `{#key}` block starts with the feature request 2 years ago _(yea, it's that long)_ for **the ability to key a non-each component**, [GitHub issue #1469](https://github.com/sveltejs/svelte/issues/1469).

To `key` a component, is to force recreation of the component when the `key` changes.

And you see this ability of destroying and creating new components when using `{#each}` with `key`:

```svelte
<script>
  let data = [{ id: 1, name: 'alice' }];
  function update() {
    data = [{ id: 2, name: 'bob' }];
  }
</script>
{#each data as item (item.id)}
  <div>{ item.name }</div>
{/each}
```

[REPL](https://svelte.dev/repl/1be3a0b123aa4384853ff5abd103f9ae)

When we call the function `update`, we removed `alice` from the `data` and we added `bob`. The net effect is still having a list of 1 item. However, instead of reusing the 1 `<div />` by updating `{ item.name }` to `"bob"`, Svelte removes and destroys the `<div />` and create a new `<div />` for `bob`. This is because of the [key we specified to the `{#each}` block](https://svelte.dev/tutorial/keyed-each-blocks). Svelte will not reuse the `<div />` because it was created with a different `key`.

One of the benefits of having a key for `{#each}` item is to be able to add transition to the item correctly. Without a `key` to identify which item is added / removed, the transiion on a `{#each}` list will always applied to the last item, when the list grows or shrinks in length.

[Try with and without the `key` in this REPL](https://svelte.dev/repl/b1f5815f8b5f4634afa9025492739fa4) to see the importance of having a `key`.

> This is similar to the `key` attribute of React, if you are familiar with React. [Check this out on how to remount a component with the `key` attribute in React](https://www.nikgraf.com/blog/using-reacts-key-attribute-to-remount-a-component).

However, the ability of having to `key` an element / component only exist for the `{#each}` block. To workaround the constraint, it's common to use the **"1-item keyed-each hack"**:

```svelte
{#each key as k (k)}
  <div />
{/each}
```

The `<div />` will be recreated if the `key` has changed.

### Transitions for reactive data change

Another commonly brought up request, to **be able to apply `transition:` to an element when a reactive data changes** ([GitHub issue #5119](https://github.com/sveltejs/svelte/issues/5119)):

```svelte
<script>
  import { fade } from 'svelte/transition'
  let count = 0;
  const handleClick = () => count +=1
</script>

<button on:click={handleClick}>Click me</button>

<p>You clicked <strong transition:fade>{count}</strong> times</p>
```

This is another facet of the same issue.

We need an ability to transition the old element out, and transition a new element in when a data, or a `key` changes.

A workaround, again, is to use the **"1-item keyed-each hack"**:

```svelte
<script>
  import { fade } from 'svelte/transition'
  let count = 0;
  const handleClick = () => count +=1
</script>

<button on:click={handleClick}>Click me</button>

<p>You clicked
  {#each [count] as count (count)}
    <strong transition:fade>{count}</strong>
  {/each}
 times</p>
```

So the proposal of the feature request was to have a `{#key}` block:

```
<p>You clicked
  {#key count}
    <strong transition:fade>{count}</strong>
  {/key}
 times</p>
```

I've seen this issue months ago, and I passed the issue. I didn't think I know good enough to implement a new logic block. However, the issue recently resurfaced as someone commented on it recently. And this time, I felt I am ready, so here's my journey of implementing the `{#key}` block.

## The implementation

As explained in ["The Svelte Compiler Handbook"](/the-svelte-compiler-handbook), the Svelte compilation process can be broken into steps:

- Parsing
- Tracking references and dependencies
- Creating code blocks & fragments
- Generate code

Of course, that's the steps that we are going to work on as well.

### Parsing

The actual parsing starts [here in src/compiler/parse/index.ts](https://github.com/sveltejs/svelte/blob/82dc26a31c37906153e07686b73d3af08dd50154/src/compiler/parse/index.ts#L51):

```js
let state: ParserState = fragment;

while (this.index < this.template.length) {
  state = state(this) || fragment;
}
```

There are 4 states in the parser:

- **fragment** - in this state, we check the current character and determine which state we should proceed to
- **tag** - we enter this state when we encounter `<` character. In this state, we are going to parse HTML tags (eg: `<p>`), attributes (eg: `class`) and directives (eg: `on:`).
- **mustache** - we enter this state when we encounter `{` character. In this state, we are going to parse expression, `{ value }` and logic blocks `{#if}`
- **text** - In this state, we are going to parse texts that are neither `<` nor `{`, which includes whitespace, newlines, and texts!

To be able to parse the `{#key}` block, we are going to take a look at the [**mustache** state function](https://github.com/sveltejs/svelte/blob/82dc26a31c37906153e07686b73d3af08dd50154/src/compiler/parse/state/mustache.ts#L35).

The `{#key}` block syntax is similar to `{#if}` without `else`, we take in an expression in the opening block and that's all:

```svelte
{#key expression}
   <div />
{/key}

<!-- similar to -->
{#if expression}
  <div />
{/if}
```

So over here, when we encounter a `{#`, we add a case to check if we are starting a `{#key}` block:

```diff-js
// ...
} else if (parser.eat(#)) {
  // if {#if foo}, {#each foo} or {#await foo}
  let type;

  if (parser.eat('if')) {
    type = 'IfBlock';
  } else if (parser.eat('each')) {
    type = 'EachBlock';
  } else if (parser.eat('await')) {
    type = 'AwaitBlock';
+  } else if (parser.eat('key')) {
+    type = 'KeyBlock';
  } else {
    parser.error({
      code: `expected-block-type`,
-      message: `Expected if, each or await`
+      message: `Expected if, each, await or key`
    });
  }
```

Similarly, for closing block `{/`, we are going to make sure that `{#key}` closes with `{/key}`:

```diff-js
if (parser.eat('/')) {
  let block = parser.current();
  let expected;
  // ...
  if (block.type === 'IfBlock') {
    expected = 'if';
  } else if (block.type === 'EachBlock') {
    expected = 'each';
  } else if (block.type === 'AwaitBlock') {
    expected = 'await';
+  } else if (block.type === 'KeyBlock') {
+    expected = 'key';
  } else {
    parser.error({
      code: `unexpected-block-close`,
      message: `Unexpected block closing tag`
    });
  }
```

The next step is to read the JS expression. Since all logic blocks, `{#if}`, `{#each}` and `{#await}` will read the JS expression next, it is no different for `{#key}` and it is already taken care of:

```js
parser.require_whitespace();

// read the JS expression
// highlight-next-line
const expression = read_expression(parser);

// create the AST node
const block: TemplateNode = {...};

parser.allow_whitespace();

// other logic blocks specific syntax
if (type === 'EachBlock') {
  // {#each} block specific syntax for {#each list as item}
  // ...
}
```

So, let's move on to the next step!

### Tracking references and dependencies

If you noticed in the previous step, the type name we created for `{#key}` block is called `KeyBlock`.

So, to keep the name consistent, we are going to create a `KeyBlock` class in `src/compiler/compile/nodes/KeyBlock.ts`:

```js
import Expression from './shared/Expression';
import map_children from './shared/map_children';
import AbstractBlock from './shared/AbstractBlock';

export default class KeyBlock extends AbstractBlock {
  // for discriminant property for TypeScript to differentiate types
  type: 'KeyBlock';

  expression: Expression;

  constructor(component, parent, scope, info) {
    super(component, parent, scope, info);

    // create an Expression instance for the expression
    this.expression = new Expression(component, this, scope, info.expression);

    // loop through children and create respective node instance
    this.children = map_children(component, this, scope, info.children);

    // simple validation: make sure the block is not empty
    this.warn_if_empty_block();
  }
}
```

I've added comments annotating the code above, hopefully it's self-explanatory.

A few more points:

- `info` is the AST node we got from the parsing.
- the `class Expression` is constructed with the JavaScript AST of the expression and it is where we traverse the AST and marked the variables within the expression as `referenced: true`.
- `map_children` is used to map the `children` of the `KeyBlock` AST node to the compile node.

> Pardon for my lack of "appropriate" naming to differentiate the nodes in the Svelte codebase.
>
> Throughout the Svelte compilation process, the node is transformed one to another, which in every step of the transformation, new analysis is performed, and new information are added.
>
> Here, I am going to call:
>
> - the node resulting from the parser: **AST node**
> - the node created by the `Component`, which extends from [`compiler/compile/nodes/shared/Node.ts`](https://github.com/sveltejs/svelte/blob/caebe0deb80d959ad7c7b5276d7e017be71769c7/src/compiler/compile/nodes/shared/Node.ts): **compile node** _(because they are stored in the `compile` folder)_
> - the node created by the `Renderer`, which extends from [`compiler/compile/render_dom/wrappers/shared/Wrapper.ts`](https://github.com/sveltejs/svelte/blob/2b2f40d32ae36a94b77b69959494687073a3ebbc/src/compiler/compile/render_dom/wrappers/shared/Wrapper.ts#L7): **render-dom Wrapper** _(also because they are stored in the `render_dom/wrappers` folder)_

If you managed to keep up so far, you may be sensing where we are heading next.

We need to add `KeyBlock` into `map_children`:

```js
// src/compiler/compile/nodes/shared/map_children.ts
function get_constructor(type) {
  switch (type) {
    case 'AwaitBlock':
      return AwaitBlock;
    case 'Body':
      return Body;
    // ...
    // highlight-next-line
    case 'KeyBlock':
      return KeyBlock;
    // ...
  }
}
```

Also, we need to add `KeyBlock` as one of the `INode` type for TypeScript:

```js
// src/compiler/compile/nodes/interfaces.ts
export type INode =
  | Action
  | Animation
  // ...
  // highlight-next-line
  | KeyBlock;
// ...
```

And now, let's move on to implementing a **render-dom Wrapper** for `KeyBlock`.

### Creating code blocks & fragments

At this point, we need to decide how the compiled JS should look like, it's time for us to **reverse-compile Svelte in your head**!

If you've read my [Compile Svelte in your head (Part 4)](/compile-svelte-in-your-head-part-4), you've seen how we create a different `create_fragment` function for each of the logic branches, so we can control the content within a logic branch as a whole.

Similarly, we can create a `create_fragment` function for the content of the `{#key}`, then we can control when to create / mount / update / destroy the content.

```js
function create_key_block(ctx) {
  // instructions to create / mount / update / destroy inner content of {#key}
  return {
    c() {},
    m() {},
    p() {},
    d() {},
  };
}
```

To use the `create_key_block`:

```js
const key_block = create_key_block(ctx);
// create the elements for the {#key}
key_block.c();

// mount the elements in the {#key}
key_block.m(target, anchor);

// update the elements in the {#key}
key_block.p(ctx, dirty);

// destroy the elements in the {#key}
key_block.d(detaching);

// intro & outro the elements in the {#key}
transition_in(key_block);
transition_out(key_block);
```

The next thing to do, is to place these statements in the right position:

```js
function create_fragment(ctx) {
  // init
  let key_block = create_key_block(ctx);

  return {
    c() {
      // create
      key_block.c();
    },
    m(target, anchor) {
      // mount
      key_block.m(target, anchor);
    },
    p(ctx, dirty) {
      // update
      key_block.p(ctx, dirty);
    },
    i(local) {
      // intro
      transition_in(key_block);
    },
    o(local) {
      // outro
      transition_out(key_block);
    },
    d(detaching) {
      // destroy
      key_block.d(detaching);
    },
  };
}
```

Now, the most important piece of the `{#key}` block, the logic to

- check if the expression has changed
- if so, recreate the elements inside the `{#key}` block

```js
function create_fragment(ctx) {
  // we store the previous key expression value
  let previous_key = value_of_the_key_expression;
  // ...
  return {
    // ...
    p(ctx, dirty) {
      if (
        // if the any variables within the key has changed, and
        dirty & dynamic_variables_in_key_expression &&
        // if the value of the key expression has changed
        previous_key !== (previous_key = value_of_the_key_expression)
      ) {
        // destroy the elements
        // detaching = 1 (true) to remove the elements immediately
        key_block.d(1);
        // create a new key_block
        key_block = create_key_block(ctx);
        key_block.c();
        // mount the new key_block
        key_block.m(...);
      } else {
        // if the key has not changed, make sure the content of {#key} is up to date
        key_block.p();
      }
    }
    // ...
  }
}
```

If there is transition in the content of the `key_block`, we need extra code for the transition:

```js
// instead of key_block.d(1);
group_outros();
transition_out(key_block, 1, 1, noop);
check_outros();

// before key_block.m(...)
transition_in(key_block);
```

I am going to gloss over the details of how `outros` / `intros` work, we will cover them in the later parts of "Compile Svelte in your head", so let's assume these code are up for the job.

Now we have done the reverse-compile Svelte in your head, let's reverse the reverse, and write the render code for Svelte `{#key}` block.

Here are some setup code for the render-dom Wrapper for `{#key}`:

```js
export default class KeyBlockWrapper extends Wrapper {
  // ...
  // the `key_block` variable
  var: Identifier = { type: 'Identifier', name: 'key_block' };

  constructor(renderer: Renderer, block: Block, parent: Wrapper, node: EachBlock, strip_whitespace: boolean, next_sibling: Wrapper) {
    super(renderer, block, parent, node);

    // deoptimisation, set flag indicate the content is not static
    this.cannot_use_innerhtml();
    this.not_static_content();

    // get all the dynamic variables within the expression
    // useful for later
    this.dependencies = node.expression.dynamic_dependencies();

    // create a new `create_fragment` function
    this.block = block.child({
      comment: create_debugging_comment(node, renderer.component),
      name: renderer.component.get_unique_name('create_key_block'),
      type: 'key',
    });
    renderer.blocks.push(block);

    // create render-dom Wrappers for the children
    this.fragment = new FragmentWrapper(renderer, this.block, node.children, parent, strip_whitespace, next_sibling);
  }
  render(block: Block, parent_node: Identifier, parent_nodes: Identifier) {
    // NOTE: here is where we write the render code
  }
}
```

A few more points:

- the `block` in the `render` method is the current `create_fragment` function that the `{#key}` block is in; `this.block` is the new `create_fragment` function that we created to put the content of the `{#key}` block
  - we named the new `create_fragment` function `"create_key_block"`
  - to make sure there's no conflicting names, we use `renderer.component.get_unique_name()`
- All **render-dom wrappers** has a property named `var`, which is the variable name referencing the element / block to be created by the **render-dom wrapper**.
  - the `var` name will be [deconflicted by the Renderer](https://github.com/sveltejs/svelte/blob/8148a7a33444805320923e4c4e071f62dee3df6c/src/compiler/compile/render_dom/Block.ts#L118-L152)

Now, let's implement the `render` method.

Firstly, render the children into `this.block`:

```js
render(block: Block, parent_node: Identifier, parent_nodes: Identifier) {
  // highlight-start
  this.fragment.render(
    this.block,
    null,
    (x`#nodes` as unknown) as Identifier
  );
  // highlight-end
}
```

We pass in `null` as `parent_node` and `` x`#nodes` `` as `parent_nodes` to indicate that the children will be rendered at the root of the `this.block`.

---

If I am implementing the `render` method of an Element render-dom Wrapper, and currently rendering the `<div>` in the following code snippet:

```html
<div>
  <span />
</div>
```

then I will render the `<span />` with:

```js
spanWrapper.render(
  block,
  this.var, // div's var
  x`${this.var.name}.childNodes`, // div.childNodes
);
```

so the `<span />` will be inserted into the current `<div />` and hydrate from the `<div />`'s childNodes.

---

Next, I am going to insert code into each of the fragment methods:

```js
// let key_block = create_key_block(ctx);
block.chunks.init.push(
  b`let ${this.var} = ${this.block.name}(#ctx)`
);

// key_block.c();
block.chunks.create.push(b`${this.var}.c();`);

// key_block.m(...);
block.chunks.mount.push(
  b`${this.var}.m(${parent_node || "#target"}, ${parent_node ? "null" : "#anchor"});`
);

// key_block.p(...);
block.chunks.update.push(
  b`${this.var}.p(#ctx, #dirty);`
);

// key_block.d(...);
block.chunks.destroy.push(b`${this.var}.d(detaching)`);
```

A few more points:
- we push the code into respective methods of the `block`, eg: `init`, `create`, `mount`, ...
- we use [tagged templates](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#Tagged_templates), ``b`...` `` to create a JavaScript AST node. The `b` tag function allow us to pass in JavaScript AST node as placeholder, so that is very convenient.
  - You can check out more about the `b` tag function from [code-red](https://github.com/Rich-Harris/code-red)

Now, to implement the dirty checking, we use `this.dependencies`

```js
const is_dirty = this.renderer.dirty(this.dependencies);
```

To determine whether our expression value has changed, we are going to compute the expression and compare it with `previous_key` and determine whether it has changed.

Here's a recap of the compiled code that we've come up previously:

```js
// we store the previous key expression value
let previous_key = value_of_the_key_expression;
// ...
// if the value of the key expression has changed
previous_key !== (previous_key = value_of_the_key_expression)
```

We start with declaring the variable, `previous_key`:

```js
const previous_key = block.get_unique_name('previous_key');
const snippet = this.node.expression.manipulate(block);
block.add_variable(previous_key, snippet);
```

`expression.manipulate(block)` will convert the expression to refer to the `ctx` variable, for example:

```js
human.age + limit
// into something like
ctx[0].age + ctx[2]
```

Next we are going to compare the new value and assign it to `previous_key` after that.

```js
const has_change = x`${previous_key} !== (${previous_key} = ${snippet})`
```

And to combine all of these, we have:

```js
block.chunks.update.push(b`
  if (${is_dirty} && ${has_change}) {
    ${this.var}.d(1);
    ${this.var} = ${this.block.name}(#ctx);
    ${this.var}.c();
    ${this.var}.m(${this.get_update_mount_node(anchor)}, ${anchor});
  } else {
    ${this.var}.p(#ctx, #dirty);
  }
`);
```

We are using the `anchor` when we are mounting the new `key_block`, you can check out [Compile Svelte in your head Part 4: the extra text node](/compile-svelte-in-your-head-part-4/#the-extra-text-node), explaining why we need the anchor node, and here is how the anchor node being computed:

```js
const anchor = this.get_or_create_anchor(block, parent_node, parent_nodes);
```

It could be the next sibling, or it could be a new `empty()` text node created.

Finally, if the content has transition, we need to add code for the transition as well:

```js
const has_transitions = !!(this.block.has_intro_method || this.block.has_outro_method);
const transition_out = b`
  @group_outros();
  @transition_out(${this.var}, 1, 1, @noop);
  @check_outros();
`;
const transition_in = b`
  @transition_in(${this.var});
`;
```

Where to place them? Well, I'll leave that as your exercise to figure that out. 😉

### Creating code for SSR

For SSR, it is much simpler than for the `dom`. `{#key}` block has no special meaning in SSR, because, you will only render once in SSR:

```js
import KeyBlock from '../../nodes/KeyBlock';
import Renderer, { RenderOptions } from '../Renderer';

export default function(node: KeyBlock, renderer: Renderer, options: RenderOptions) {
	renderer.render(node.children, options);
}
```

☝️ That's all the code we need for SSR. We are rendering the children, passing down the `options`, and add no extra code for the `{#key}` block.

### Generate code

Well, everything in this step is set up generic enough to handle most use case.

So, nothing to change here. 🤷‍♂️

### A few other implementation consideration
- What if the expression in the `{#key}` block is not dynamic, do we give warnings? or optimise the output?
- How will [`<svelte:options immutable={true}>`](https://svelte.dev/docs#svelte_options) affect the code output?

## The testing

You've seen me implementing test cases in the previous "Contributing to Svelte" articles [[1](/contributing-to-svelte-fixing-issue-5012)] [[2](/contributing-to-svelte-fixing-issue-4392)], here I am going to skip showing the implementation of the test cases, and probably point out some thoughts I had when coming up with tests:

1. **Happy path:** changing the key expression should recreate the content
2. **Happy path:** Transition when recreating the content should work ✨
3. **Possible edge case:** Changing variables other than the key expression should **not** recreate the content in `{#key}`
   ```svelte
   <script>
     let reactive1;
     let reactive2;
     let key;
   </script>

   {#key key}
      {key} {reactive1}
   {/key}

   {reactive2}
   ```
4. **Possible edge case:** Changing the variables within the key expression but the result value of the key expression stay the same
   ```svelte
   <script>
      let a = 1;
      let b = 2;
      function update() {
        a = 2;
        b = 1;
      }
   </script>
   {#key a + b}
      <div />
   {/key}
   ```

## Closing Notes

You can read the [Pull Request #5397](https://github.com/sveltejs/svelte/pull/5397) to read the final implementation.

---

If you wish to learn more about Svelte, [follow me on Twitter](https://twitter.com/lihautan).

If you have anything unclear about this article, find me on [Twitter](https://twitter.com/lihautan) too!

