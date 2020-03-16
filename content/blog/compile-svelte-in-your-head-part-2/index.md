---
title: Compile Svelte in your head (Part 2)
date: '2020-03-04T08:00:00Z'
tag: Svelte, JavaScript
series: Compile Svelte in your head
---

Previously, when I mentioned the `$$invalidate` function, I explained that the `$$invalidate` function works conceptually like the following:

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

At the point of writing, Svelte is at [v3.19.2](https://github.com/sveltejs/svelte/blob/master/CHANGELOG.md#3192).

## Pre 3.16.0

There's a big optimisation that changes the underlying implementation of the `$$invalidate` function in [v3.16.0](https://github.com/sveltejs/svelte/blob/master/CHANGELOG.md#3160), namely in [#3945](https://github.com/sveltejs/svelte/pull/3945). The underlying concept doesn't change, but the compiled output has reduced TODO: percent!

Let's explain some of the variables that you are going to see, some of which was introduced in [Part 1](/compile-svelte-in-your-head-part-1):

### `$$.ctx`

There's no official name for it. You can call it **context** as it is the context where the template is based on, when render onto the DOM.

I called it [instance variables](/compile-svelte-in-your-head-part-1#instance-variable). As it is an JavaScript Object that contains all the variables that you:

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
    console.log(name);
    name = 'Svelte';
  }
</script>
<button on:click={update}>{name}</button>
```

```js
// ...
function instance($$self, $$props, $$invalidate) {
  let name = 'world';
  function update() {
    console.log(name);
    $$invalidate('name', (name = 'Svelte'));
  }
  return { name, update };
}

// ...some where in `create_fragment`
ctx.update(); // logs `world` scoped in the `instance` closure
```

Whenever a new instance of a component is created, the `instance` function is called and the `ctx` object is created and captured within a new closure scope.

### `$$.dirty`

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

The initial `$$.dirty` is `null` ([source code](https://github.com/sveltejs/svelte/blob/v3.15.0/src/runtime/internal/Component.ts#L124)).

If you clicked on the **"+ Agility"** button, `$$.dirty` will turn to:

```js
{
  agility: true;
}
```

If you clicked on the **"Level Up"** button, `$$.dirty` will turn to:

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

### `$$invalidate`

`$$invalidate` is the secret behind reactivity in Svelte.

Whenever a variable is

- reassigned `(foo = 1)`
- mutated `(foo.bar = 1)`

Svelte will wrap the assignment or mutation around with the `$$invalidate` function:

```js
name = 'Svelte';
count++;
foo.a = 1;
bar = baz = 3;
// compiled into
$$invalidate('name', (name = 'Svelte'));
$$invalidate('count', count++, count);
$$invalidate('foo', (foo.a = 1), foo);
// chain $$invalidate
$$invalidate('bar', (bar = $$invalidate('baz', (baz = 3))));
```

the `$$invalidate` function will:

1. update the variable in `$$.ctx`
2. mark the variable in `$$.dirty`
3. schedule an update
4. return the value of the assignment or mutation expression

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
  // 4. return the value of the assignment or mutation expression
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

### `schedule_update`

`schedule_update` schedules Svelte to update the DOM with the changes made thus far.

To batch all the change updates, Svelte pushes the the `update` task into the [microtask queue](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/) using Promise.

```js
// src/runtime/internal/scheduler.ts
export function schedule_update() {
	if (!update_scheduled) {
    update_scheduled = true;
    // NOTE: `flush` will do the DOM update
    // we push it into the microtask queue
		resolved_promise.then(flush);
	}
}
```

So, if you write a Svelte component like this:

```svelte
<script>
  let firstName, lastName;
  function update() {
    
  }
</script>
Name: {firstName} {lastName}
```