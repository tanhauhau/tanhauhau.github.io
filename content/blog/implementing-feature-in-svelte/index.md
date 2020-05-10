---
title: Implementing {#range} in Svelte
wip: true
---

Anyone who
- wants to get started in contributing to the Svelte source code

## Overview

Today we are going to dive in and implmeent `{#range}` logic block in Svelte.

We are going to look at how 

if you are unfamiliar with the Svelte compiler, I recommend you to read ["The Svelte Compiler Handbook"](/the-svelte-compiler-handbook), which talks about the Svelte compiler at a high level.

Armed with the overview of the compilation pipeline, let's dive into the detail, by implementing a new logic block, `{#range}`.

A quick idea of how `{#range}` behaves:

**1. The syntax:**

```svelte
<!-- loop `n` through 1, 2, 3, 4, 5 -->
{#range 1..5 as n}
  {n}
{/range}
```

```svelte
<script>
  let start = 1;
  let end = 5;
</script>

<!-- loop `n` through 1, 2, 3, 4, 5 -->
{#range start..end as n}
  {n}
{/range}

<input bind:value={start} type="number" />
<input bind:value={end} type="number" />
```

**2. The behavior:**

The `{#range}` behaves like [Ruby range](https://www.rubyguides.com/2016/06/ruby-ranges-how-do-they-work/):
- `{#range}` loops from the start to end inclusively
- allow descending range too: `{#range 5..1 as n}`
- allow ranging through characters: `{#range 'a'..'z' as n}`

## Start implementation

With an https://github.com/sveltejs/svelte/issues/2968

```
ParseError: Expected if, each or await
  at error (compiler.js:6208:16)
  at Parser.error (compiler.js:6336:3)
  at mustache (compiler.js:5911:11)
  at new Parser (compiler.js:6288:12)
```


```
Error: Not implemented: RangeBlock
  at get_constructor (compiler.js:17451:18)
  at children.map.child (compiler.js:17460:23)
  at Array.map (<anonymous>)
  at map_children (compiler.js:17459:18)
  at new Element$1 (compiler.js:16523:19)
```

TODO: don't add the dependencies yet
NOTE: copy code from EachBlock, since they lookalike

```
Error: TODO implement RangeBlock
  at new FragmentWrapper (compiler.js:12846:11)
  at new ElementWrapper (compiler.js:10261:19)
  at new FragmentWrapper (compiler.js:12888:21)
  at new Renderer (compiler.js:12983:19)
  at dom (compiler.js:13199:19)
```

```js
export default class RangeBlockWrapper extends Wrapper {
	block: Block;
	node: RangeBlock;
	fragment: FragmentWrapper;

	index_name: Identifier;

	constructor(
		renderer: Renderer,
		block: Block,
		parent: Wrapper,
		node: RangeBlock,
		strip_whitespace: boolean,
		next_sibling: Wrapper
	) {
		super(renderer, block, parent, node);
		this.cannot_use_innerhtml();
		this.not_static_content();

		// const { dependencies } = node.expression;
		// block.add_dependencies(dependencies);

		renderer.add_to_context(this.node.index, true);

		this.block = block.child({
			comment: create_debugging_comment(this.node, this.renderer.component),
			name: renderer.component.get_unique_name("create_range_block"),
			type: "range",
		});

		this.index_name = { type: "Identifier", name: this.node.index };

		renderer.blocks.push(this.block);

		this.fragment = new FragmentWrapper(
			renderer,
			this.block,
			node.children,
			this,
			strip_whitespace,
			next_sibling
		);
	}

	render(block: Block, parent_node: Identifier, parent_nodes: Identifier) {
    this.fragment.render(this.block, null, x`#nodes` as Identifier);
	}
}
```