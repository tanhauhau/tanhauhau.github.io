---
title: Compile Svelte in your head (Part 2)
date: '2020-03-22T08:00:00Z'
tags: 
  - Svelte
  - JavaScript
series: Compile Svelte in your head
---

**⬅ ⬅  Previously in [Part 1](/compile-svelte-in-your-head-part-1/).**

[Previously](/compile-svelte-in-your-head-part-1/), when I mentioned the `$$invalidate` function, I explained that the `$$invalidate` function works conceptually like the following:

```js
// conceptually...
const ctx = instance(/*...*/);
const fragment = create_fragment(ctx);
// to track which variable has changed
const dirty = new Set();
const $$invalidate = (variable, newValue) => {
  // update ctx
  ctx[variable] = newValue;
  // mark variable as dirty
  dirty.add(variable);
  // schedules update for the component
  scheduleUpdate(component);
};

// gets called when update is scheduled
function flushUpdate() {
  // update the fragment
  fragment.p(ctx, dirty);
  // clear the dirty
  dirty.clear();
}
```

but that's not the exact implementation of the `$$invaldiate` function. So in this article, we are going to look at how `$$invalidate` is implemented in Svelte.

At the point of writing, Svelte is at [v3.20.1](https://github.com/sveltejs/svelte/blob/v3.20.1/CHANGELOG.md#3201).

## Pre v3.16.0

There's a big optimisation that changes the underlying implementation of the `$$invalidate` function in [v3.16.0](https://github.com/sveltejs/svelte/blob/master/CHANGELOG.md#3160), namely in [#3945](https://github.com/sveltejs/svelte/pull/3945). The underlying concept doesn't change, but it'll be much easier to understand about `$$invalidate` prior the change and learn about the optimisation change separately.

Let's explain some of the variables that you are going to see, some of which was introduced in [Part 1](/compile-svelte-in-your-head-part-1):

### \$\$.ctx

There's no official name for it. You can call it **context** as it is the context which the template is based on to render onto the DOM.

I called it [instance variables](/compile-svelte-in-your-head-part-1#instance-variable). As it is a JavaScript Object that contains all the variables that you:

- declared in the `<script>` tag
- mutated or reassigned
- referenced in the template

that belongs to a component instance.

The instance variables themselves can be of a primitive value, object, array or function.

The `instance` function creates and returns the `ctx` object.

Functions declared in the `<script>` tag will refer to the instance variable that is scoped withn the `instance` function closure:

```svelte
<script>
  let name = 'world';
  function update() {
    name = 'Svelte';
  }
</script>
<button on:click={update}>{name}</button>
```

[Svelte REPL](https://svelte.dev/repl/5b12ff52c2874f4dbb6405d9133b34da?version=3.20.1)

```js
// ...
function instance($$self, $$props, $$invalidate) {
  let name = 'world';
  function update() {
    $$invalidate('name', (name = 'Svelte'));
  }
  return { name, update };
}

// ...some where in `create_fragment`
ctx.update(); // logs `world` scoped in the `instance` closure
```

Whenever a new instance of a component is created, the `instance` function is called and the `ctx` object is created and captured within a new closure scope.

### \$\$.dirty

`$$.dirty` is a object that is used to track which instance variable had just changed and needs to be updated onto the DOM.

For example, in the following Svelte component:

```svelte
<script>
  let agility = 0;
  let power = 0;
  function incrementAgility() {
    agility ++;
  }
  function incrementPower() {
    power ++;
  }
  function levelUp() {
    agility += 5;
    power += 7;
  }
</script>

Agility: {agility}
Power: {power}
Stats: {agility * power}

<button on:click={incrementAgility}>+ Agility</button>
<button on:click={incrementPower}>+ Power</button>
<button on:click={levelUp}>Level Up</button>
```

[Svelte REPL](https://svelte.dev/repl/da579d0113b44f01b2b94893dce21487?version=3.20.1)

The initial `$$.dirty` is `null` ([source code](https://github.com/sveltejs/svelte/blob/v3.15.0/src/runtime/internal/Component.ts#L124)).

If you clicked on the **"+ Agility"** button, `$$.dirty` will turn into:

```js
{ agility: true; }
```

If you clicked on the **"Level Up"** button, `$$.dirty` will turn into:

```js
{ agility: true, power: true }
```

`$$.dirty` is useful for Svelte, so that it doesn't update the DOM unnecessarily.

If you looked at the **p (u_p_date)** function of the compiled code, you will see Svelte checks whether a variable is marked in `$$.dirty`, before updating the DOM.

```js
// NOTE: $$.dirty is passed into the `p` function as `changed`
p(changed, ctx) {
  // checked if agility has changed before update the agility text
  if (changed.agility) set_data(t1, ctx.agility);
  if (changed.power) set_data(t3, ctx.power);
  // if either agility or power has changed, update the stats text
  if ((changed.agility || changed.power) && t5_value !== (t5_value = ctx.agility * ctx.power + "")) set_data(t5, t5_value);
}
```

After Svelte updates the DOM, the `$$.dirty` is set back to `null` to indicate all changes has been applied onto the DOM.

### \$\$invalidate

`$$invalidate` is the secret behind reactivity in Svelte.

Whenever a variable is

- reassigned `(foo = 1)`
- mutated `(foo.bar = 1)`

Svelte will wrap the assignment or update around with the `$$invalidate` function:

```js
name = 'Svelte';
count++;
foo.a = 1;
bar = baz = 3;
// compiled into
$$invalidate('name', (name = 'Svelte'));
$$invalidate('count', count++, count);
$$invalidate('foo', (foo.a = 1), foo);
$$invalidate('bar', (bar = $$invalidate('baz', (baz = 3))));
```

the `$$invalidate` function will:

1. update the variable in `$$.ctx`
2. mark the variable in `$$.dirty`
3. schedule an update
4. return the value of the assignment or update expression

```js
// src/runtime/internal/Component.ts
const $$invalidate = (key, ret, value = ret) => {
  if ($$.ctx && not_equal($$.ctx[key], value)) {
    // 1. update the variable in $$.ctx
    $$.ctx[key] = value;
    // ...
    // 2a. mark the variable in $$.dirty
    make_dirty(component, key);
  }
  // 4. return the value of the assignment or update expression
  return ret;
};

// src/runtime/internal/Component.ts
function make_dirty(component, key) {
  if (!component.$$.dirty) {
    dirty_components.push(component);
    // 3. schedule an update
    schedule_update();
    // initialise $$.dirty
    component.$$.dirty = blank_object();
  }
  // 2b. mark the variable in $$.dirty
  component.$$.dirty[key] = true;
}
```

[Source code](https://github.com/sveltejs/svelte/blob/v3.15.0/src/runtime/internal/Component.ts#L130-L136)

One interesting note about the function `$$invalidate` is that, it wraps around the assignment or update expression and returns what the expression evaluates to.

This makes `$$invalidate` chainable:

```js
obj = {
  b: (foo = bar++),
};

obj.c = 'hello';

({ a: c = d++, b } = baz = obj);

// assuming all variables are referenced in the template
// the above compiles into

$$invalidate(
  'obj',
  (obj = {
    b: $$invalidate('foo', (foo = $$invalidate('bar', bar++, bar))),
  })
);

$$invalidate('obj', (obj.c = 'hello'), obj);

$$invalidate(
  'c',
  ({ a: c = $$invalidate('d', d++, d), b } = $$invalidate('baz', (baz = obj))),
  c,
  $$invalidate('b', b)
);
```

It seemed complex when there's a lot of assignment or update expressions in 1 statement! 🙈

The 2nd argument of `$$invalidate` is the assignment or update expressions verbatim. But if it contains any assignment or update sub-expressions, we recursively wrap it with `$$invalidate`.

In case where the assignment expression changes a property of an object, we pass the object in as a 3rd argument of the `$$invalidate` function, eg:

```js
obj.c = 'hello';

// compiles into
$$invalidate('obj', (obj.c = 'hello'), obj);
// - it invalidates `obj`
// - it returns the evaluated value of the expression `obj.c = 'hello'`, which is 'hello'
```

So that, we update the `"obj"` variable to `obj` instead of the value of the 2nd argument, `"hello"`.

### schedule_update

`schedule_update` schedules Svelte to update the DOM with the changes made thus far.

Svelte, at the point of writing ([v3.20.1](https://github.com/sveltejs/svelte/blob/v3.20.1/CHANGELOG.md#3201)), uses [microtask queue](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/) to batch change updates. The actual DOM update happens in the next microtask, so that any synchronous `$$invalidate` operations that happen within the same task get batched into the next DOM update.

To schedule a next microtask, Svelte uses the Promise callback.

```js
// src/runtime/internal/scheduler.ts
export function schedule_update() {
  if (!update_scheduled) {
    update_scheduled = true;
    // NOTE: `flush` will do the DOM update
    // we push it into the microtask queue
    // highlight-next-line
    resolved_promise.then(flush);
  }
}
```

In `flush`, we call update for each component marked dirty:

```js
// src/runtime/internal/scheduler.ts
function flush() {
  // ...
  // for each componnet in `dirty_components`
  // highlight-start
  update(component.$$);
  // highlight-end
  // ...
}

// src/runtime/internal/scheduler.ts
function update($$) {
  if ($$.fragment !== null) {
    // NOTE: this will be important later
    $$.update($$.dirty);
    run_all($$.before_update);
    // calls the `p` function
    // highlight-next-line
    $$.fragment && $$.fragment.p($$.dirty, $$.ctx);
    // resets `$$.dirty`
    $$.dirty = null;

    $$.after_update.forEach(add_render_callback);
  }
}
```

[Source code](https://github.com/sveltejs/svelte/blob/v3.15.0/src/runtime/internal/scheduler.ts#L14)

So, if you write a Svelte component like this:

```svelte
<script>
  let givenName, familyName;
  function update() {
    givenName = 'Li Hau';
    familyName = 'Tan';
  }
</script>
Name: {familyName} {givenName}

<button on:click={update}>Update</button>
```

[Svelte REPL](https://svelte.dev/repl/761a0a6cc2834afb842942e1d23875b1?version=3.20.1)

The DOM update for the `givenName` and `familyName` happens in the same microtask:

1. Click on the **"Update"** to call the `update` function
1. `$$invalidate('givenName', givenName = 'Li Hau')`
1. Mark the variable `givenName` dirty, `$$.dirty['givenName'] = true`
1. Schedule an update, `schedule_update()`
1. Since it's the first update in the call stack, push the `flush` function into the microtask queue
1. `$$invalidate('familyName', familyName = 'Tan')`
1. Mark the variable `familyName` dirty, `$$.dirty['familyName'] = true`
1. Schedule an update, `schedule_update()`
1. Since `update_scheduled = true`, do nothing.
1. **-- End of task --**
1. **-- Start of microtask--**
1. `flush()` calls `update()` for each component marked dirty
1. Calls `$$.fragment.p($$.dirty, $$.ctx)`.
    - `$$.dirty` is now `{ givenName: true, familyName: true }`
    - `$$.ctx` is now `{ givenName: 'Li Hau', familyName: 'Tan' }`
1. In `function p(dirty, ctx)`,
    - Update the 1st text node to `$$.ctx['givenName']` if `$$.dirty['givenName'] === true`
    - Update the 2nd text node to `$$.ctx['familyName']` if `$$.dirty['familyName'] === true`
1. Resets the `$$.dirty` to `null`
1. ...
1. **-- End of microtask--**

#### tl/dr:

- For each assignment or update, Svelte calls `$$invalidate` to update the variable in `$$.ctx` and mark the variable dirty in `$$.dirty`.
- The acutal DOM update is batched into the next microtask queue.
- To update the DOM for each component, the component `$$.fragment.p($$.diry, $$.ctx)` is called.
- After the DOM update, the `$$.dirty` is reset to `null`.

## v3.16.0

One big change in v3.16.0 is the PR [#3945](https://github.com/sveltejs/svelte/pull/3945), namely **bitmask-based change tracking**.

Instead of marking the variable dirty using an object:

```js
$$.diry = { givenName: true, familyName: true };
```

Svelte assign each variable an index:

```js
givenName -> 0
familyName -> 1
```

and uses [bitmask](<https://en.wikipedia.org/wiki/Mask_(computing)>) to store the dirty information:

```js
$$.dirty = [0b0000_0011];
// the 0th and 1st bit marked true
```

which is far more compact than the previous compiled code.

### Bitmask

For those who don't understand, allow me to quickly explain what it is.

Of course, if you want to learn more about it, feel free to read a more detailed explanation, like [this](https://blog.bitsrc.io/the-art-of-bitmasking-ec58ab1b4c03) and [this](https://dev.to/somedood/bitmasks-a-very-esoteric-and-impractical-way-of-managing-booleans-1hlf).

The most compact way of representing a group of `true` or `false` is to use bits. If the bit is `1` it is `true` and if it is `0` it is `false`.

A number can be represented in binary, **5** is `0b0101` in binary.

If **5** is represented in a 4-bit binary, then it can store 4 boolean values, with the 0th and 2nd bit as `true` and 1st and 3rd bit as `false`, (reading from the right to left, from [least significant bit](https://en.wikipedia.org/wiki/Bit_numbering#Least_significant_bit) to the [most significant bit](https://en.wikipedia.org/wiki/Bit_numbering#Most_significant_bit)).

**How many boolean values can a number store?**

That depends on the language, a 16-bit integer in Java can store 16 boolean values.

In JavaScript, numbers can are [represented in 64 bits](https://2ality.com/2012/04/number-encoding.html). However, when using [bitwise operations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators) on the number, JavaScript will treat the number as 32 bits.

To inspect or modify the boolean value stored in a number, we use [bitwise operations](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators).

```js
// set 1st boolean to true
0b0101 | 0b0010 = 0b0111;

// set 2nd boolean to false
0b0101 & 0b1011 = 0b0001;

// is 2nd boolean true?
((0b0101 & 0b0100) > 0) === true;

// NOTE: You can test multiple boolean values at once
// is 2nd and 3rd boolean true?
((0b0101 & 0b1100) > 0) === true;
```

The 2nd operand we use in the bitwise operation, is like a [mask](<https://en.wikipedia.org/wiki/Mask_(computing)>) that allow us to target a specific bit in the 1st number, that stores our boolean values.

We call the mask, **bitmask**.

### Bitmask in Svelte

As mentioned earlier, we assign each variable an index:

```js
givenName -> 0
firstName -> 1
```

So instead of returning the instance variable as an JavaScript Object, we now return it as an JavaScript Array:

```js
// Previous
function instance($$self, $$props, $$invalidate) {
  // ...
  // highlight-next-line
  return { givenName, familyName };
}
// Now
function instance($$self, $$props, $$invalidate) {
  // ...
  // highlight-next-line
  return [givenName, familyName];
}
```

The variable is accessed via **index**, `$$.ctx[index]`, instead of **variable name**:

```js
// Previous
$$.ctx.givenName + $$.ctx.familyName;
// Now
$$.ctx[0] + $$.ctx[1];
```

The `$$invalidate` function works the same, except it takes in **index** instead of **variable name**:

```js
// Previous
$$invalidate('givenName', (givenName = 'Li Hau'));
// Now
$$invalidate(0, (givenName = 'Li Hau'));
```

`$$.dirty` now stores a list of numbers. Each number carries 31 boolean values, each boolean value indicates whether the variable of that index is dirty or not.

To set a variable as dirty, we use bitwise operation:

```js
// Previous
$$.dirty['givenName'] = true;
// Now
$$.dirty[0] |= 1 << 0;
```

And to verify whether a variable is dirty, we use bitwise operation too!

```js
// Previous
if ($dirty.givenName) { /* ... */ }
if ($dirty.givenName && $dirty.familyName) { /* ... */ }

// Now
if ($dirty[0] & 1) { /* ... */ }
if ($dirty[0] & 3) { /* ... */ }
```

With using bitmask, `$$.dirty` is now reset to `[-1]` instead of `null`.

**Trivia:** `-1` is `0b1111_1111` in binary, where all the bits are `1`.

#### Destructuring **$$.dirty**

One code-size optimisation that Svelte does is to always destructure the `dirty` array in the **u_p_date function** if there's less than 32 variables, since we will always access `dirty[0]` anyway:

```js
// If less than 32 variables,
// Instead of having `dirty[0]` all the time,
p: (ctx, dirty) {
  if (dirty[0] & 1) { /* ... */ }
  if (dirty[0] & 3) { /* ... */ }
}
// Svelte optimises the compiled code by 
// destruct the array in the arguments
p: (ctx, [dirty]) {
  if (dirty & 1) { /* ... */ }
  if (dirty & 3) { /* ... */ }
}

// If more than or equal to 32 variables
p: (ctx, dirty) {
  if (dirty[0] & 1) { /* ... */ }
  if (dirty[1] & 3) { /* ... */ }
}
```

#### tl/dr:

- The underlying mechanism for `$$invalidate` and `schedule_update` does not change
- Using bitmask, the compiled code is much compact

## Reactive Declaration

Svelte allow us to declare reactive values via the [labeled statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/label), `$: `

```svelte
<script>
  export let count = 0;
  // `doubled`, `tripled`, `quadrupled` are reactive
  // highlight-start
  $: doubled = count * 2;
  $: tripled = count * 3;
  $: quadrupled = doubled * 2;
  // highlight-end
</script>

{doubled} {tripled} {quadrupled}
```

[Svelte REPL](https://svelte.dev/repl/e37329dd126448b2aa0679c08993f9a8?version=3.20.1)

If you look at the compiled output, you would find out that the declarative statements appeared in the [`instance` function](/compile-svelte-in-your-head-part-1/#instanceself-props-invalidate):

```js
function instance($$self, $$props, $$invalidate) {
  // ...

  // highlight-start
	$$self.$$.update = () => {
		if ($$self.$$.dirty & /*count*/ 8) {
			$: $$invalidate(0, doubled = count * 2);
		}

		if ($$self.$$.dirty & /*count*/ 8) {
			$: $$invalidate(1, tripled = count * 3);
		}

		if ($$self.$$.dirty & /*doubled*/ 1) {
			$: $$invalidate(2, quadrupled = doubled * 2);
		}
  };
  // highlight-end

	return [doubled, tripled, quadrupled, count];
}
```

Try reorder the reactive declarations and observe the change in the compiled output:

```svelte
<script>
  export let count = 0;
  // NOTE: move `quadrupled` before `doubled`
  // highlight-start
  $: quadrupled = doubled * 2;
  $: doubled = count * 2;
  // highlight-end
  $: tripled = count * 3;
</script>
```

[Svelte REPL](https://svelte.dev/repl/fc6995856489402d90291c4c30952939?version=3.20.1)

```js
function instance($$self, $$props, $$invalidate) {
	// ...

	$$self.$$.update = () => {
		// NOTE: `quadrupled` invalidates after `doubled`
		// highlight-start
		if ($$self.$$.dirty & /*count*/ 8) {
			$: $$invalidate(1, (doubled = count * 2));
		}

		if ($$self.$$.dirty & /*doubled*/ 2) {
			$: $$invalidate(0, (quadrupled = doubled * 2));
		}
		// highlight-end

		if ($$self.$$.dirty & /*count*/ 8) {
			$: $$invalidate(2, (tripled = count * 3));
		}
	};

	return [doubled, tripled, quadrupled, count];
}
```

Some observations:

- When there are reactive declarations, Svelte defines a custom `$$.update` method.
  - `$$.update` is a [no-op function](https://en.wikipedia.org/wiki/NOP_(code)) by default. (See [src/runtime/internal/Component.ts](https://github.com/sveltejs/svelte/blob/v3.20.1/src/runtime/internal/Component.ts#L111))
- Svelte uses `$$invalidate` to update the value of a reactive variable too.
- Svelte sorts the reactive declarations and statements, based on the dependency relationship between the declarations and statements
  - `quadrupled` depends on `doubled`, so `quadrupled` is evaluated and `$$invalidate`d after `doubled`.

Since all reactive declarations and statements are grouped into the `$$.update` method, and also the fact that Svelte will sort the declarations and statements according to their dependency relationship, it is irrelevant of the location or the order you declared them.

The following component still works:

```svelte
<script>
// NOTE: use `count` in a reactive declaration before `count` is declared
$: doubled = count * 2;
let count = 1;
</script>

{count} * 2 = {doubled}
```

[Svelte REPL](https://svelte.dev/repl/fc6995856489402d90291c4c30952939?version=3.20.1)

**The next thing you may ask, when is `$$.update` being called?**

Remember the `update` function that gets called in the `flush` function?

I put a `NOTE:` comment saying that it will be important later. Well, it is important now.

```js
// src/runtime/internal/scheduler.ts
function update($$) {
  if ($$.fragment !== null) {
    // NOTE: this is important now!
    // highlight-next-line
    $$.update($$.dirty);
    run_all($$.before_update);
    // calls the `p` function
    $$.fragment && $$.fragment.p($$.dirty, $$.ctx);
    // ...
  }
}
```

The `$$.update` function gets called **in the same microtask** with the DOM update, right before we called the `$$.fragment.p()` to update the DOM.

The implication of the above fact is

#### 1. Execution of all reactive declarations and statements are batched

Just as how DOM updates are batched, reactive declarations and statements are batched too!

```svelte
<script>
  let givenName = '', familyName = '';
  function update() {
    givenName = 'Li Hau';
    familyName = 'Tan';
  }
  $: name = givenName + " " + familyName;
  $: console.log('name', name);
</script>
```

[Svelte REPL](https://svelte.dev/repl/941195f1cd5248e9bd14613f9513ad1d?version=3.20.1)

When `update()` get called,
1. Similar to the [flow described above](#schedule_update), `$$invalidate` both **"givenName"** and **"familyName"**, and schedules an update
1. **-- End of task --**
1. **-- Start of microtask--**
1. `flush()` calls `update()` for each component marked dirty
1. Runs `$$.update()`
    - As **"givenName"** and **"familyName"** has changed, evaluates and `$$invalidate` **"name"**
    - As **"name"** has changed, executes `console.log('name', name);`
1. Calls `$$.fragment.p(...)` to update the DOM.

As you can see, even though we've updated `givenName` and `familyName`, we only evaluate `name` and executes `console.log('name', name)` **once** instead of twice:

```js
// Instead of
// #1 `givenName = 'Li Hau'
name = 'Li Hau' + ' ' + '';
console.log('Li Hau ');
// #2 `familyName = 'Tan'
name = 'Li Hau' + ' ' + 'Tan';
console.log('Li Hau Tan');

// Reactive declarations and statements are batched
// #1 `givenName = 'Li Hau'
// #2 `familyName = 'Tan'
name = 'Li Hau' + ' ' + 'Tan';
console.log('Li Hau Tan');
```

#### 2. The value of reactive variable outside of reactive declarations and statements may not be up to date

Because the reactive declarations and statements are batched and executed in the next microtask, you can't expect the value to be updated synchronously.

```svelte
<script>
  let givenName = '', familyName = '';
  function update() {
    givenName = 'Li Hau';
    familyName = 'Tan';
    // highlight-next-line
    console.log('name', name); // Logs ''
  }
  $: name = givenName + " " + familyName;
</script>
```

[Svelte REPL](https://svelte.dev/repl/437548d5c7044cb59bfd0c8a0f4c725d?version=3.20.1)

Instead, you **have to** refer the reactive variable in another reactive declaration or statement:

```svelte
<script>
  let givenName = '', familyName = '';
  function update() {
    givenName = 'Li Hau';
    familyName = 'Tan';
  }
  $: name = givenName + " " + familyName;
  // highlight-next-line
  $: console.log('name', name); // Logs 'Li Hau Tan'
</script>
```

### Sorting of reactive declarations and statements

Svelte tries to preserve the order of reactive declarations and statements as they are declared as much as possible.

However, if one reactive declaration or statement refers to a variable that was defined by another reactive declaration, then, **it will be inserted after the latter reactive declaration**:

```js
let count = 0;
// NOTE: refers to `doubled`
$: quadrupled = doubled * 2;
// NOTE: defined `doubled`
$: doubled = count * 2;

// compiles into:

$$self.$$.update = () => {
  // ...
  $: $$invalidate(/* doubled */, doubled = count * 2);
  $: $$invalidate(/* quadrupled */, quadrupled = doubled * 2);
  // ...
}
```

### Reactive variable that is not reactive

The Svelte compiler tracks all the variables declared in the `<script>` tag.

If all the variables of a reactive declaration or statement refers to, never gets mutated or reassigned, then the reactive declaration or statement will not be added into `$$.update`.

For example:

```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
</script>
{ count } x 2 = {doubled}
```

[Svelte REPL](https://svelte.dev/repl/af86472e1f494cfea2efa494f63fff08?version=3.20.1)

Since, `count` never gets mutated or reassigned, Svelte optimises the compiled output by not defining `$$self.$$.update`.

```js
// ...
function instance($$self, $$props, $$invalidate) {
  let doubled;
  $: $$invalidate(0, (doubled = count * 2));
  return [doubled];
}
```

## Summary

#### 1. Svelte keeps track of which variables are dirty and batched the DOM updates.

#### 2. Using bitmask, Svelte able to generate a more compact compiled code.

#### 3. Reactive declarations and statements are executed in batch, just like DOM updates

## Closing Note

If you wish to know more, [follow me on Twitter](https://twitter.com/lihautan).

I'll post it on Twitter when the next part is ready, where I'll be covering [logic blocks](https://svelte.dev/tutorial/if-blocks), [slots](https://svelte.dev/tutorial/slots), [context](https://svelte.dev/tutorial/context-api), and many others.

**⬅ ⬅  Previously in [Part 1](/compile-svelte-in-your-head-part-1/).**

**➡ ➡  Continue reading on [Part 3](/compile-svelte-in-your-head-part-3/).**

## Further Resources
- Rich Harris shares about [Bitmask Tracking at Svelte Society NYC](https://www.youtube.com/watch?v=zq6PpM5t3z0&t=2530s).
- Svelte Tutorial - [Reactivity](https://svelte.dev/tutorial/reactive-assignments)
https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
- [The Art of Bitmasking](https://blog.bitsrc.io/the-art-of-bitmasking-ec58ab1b4c03) by Shakib Ahmed
- [Bitmasks: A very esoteric (and impractical) way of managing booleans](https://dev.to/somedood/bitmasks-a-very-esoteric-and-impractical-way-of-managing-booleans-1hlf) by Basti Ortiz
- [MDN: Bitwise Operators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators)
