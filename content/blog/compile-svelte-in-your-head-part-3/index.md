---
title: Compile Svelte in your head (Part 3)
date: '2020-05-07T08:00:00Z'
tag: Svelte, JavaScript
series: Compile Svelte in your head
---

**⬅ ⬅  Previously in [Part 2](/compile-svelte-in-your-head-part-2/).**

[Previously](/compile-svelte-in-your-head-part-2/), I detailed how `$$invalidate` works, described how bitmask was used in `$$invalidate`, and explained how reactive declarations work as well.

In this article, we are going to look into 3 DOM related directives:

- `on:` for event handlers
- `bind:` for bindings
- `use:` for actions

To make sure we are on the same page, let's first explain how these 3 directives work.

## The `on:`, `bind:` and `use:`

### `on:` event handlers

You can use the `on:` directive to listen to any event on an element:

```svelte
<script>
  function handleMouseMove(event) {}

  function handleClick(event) {}
</script>

<!-- You can pass in as variable -->
<div on:mousemove={handleMouseMove} />

<!-- or you can inline the event handler -->
<div on:mousemove={event => { /*...*/ }} />

<!-- You can modify event handler with modifiers  -->
<div on:click|stopPropagation|once={handleClick}>
```

### `bind:` bindings

The `bind:` directive allows you to bind a variable to a property of an element.

Updating the variable will modifying the property of the element, conversely, modifying the property of the element via interacting with the element will, in turn, update the variable.

```svelte
<script>
  let name, yes;
</script>

<!-- You can bind `name` to input.value -->
<!-- Changing `name` will update input.value to be the value of `name` and -->
<!-- changing input.value will update `name` to be input.value -->
<input bind:value={name} />

<!-- You can bind input.checked for a checkbox input -->
<input type="checkbox" bind:checked={yes} />
```

### `use:` actions

The `use:` directive is called **["Action"](https://svelte.dev/tutorial/actions)**. It provides you an interface to enhance your element.

You pass a function to the `use:` directive of an element and the function will be called when your element is mounted.

The function should return an object in which the `destroy` method of the object will be called when the element is unmounted.

```svelte
<script>
  function doSomething(element) {
    // do something with the element
    return {
      destroy() {
        // cleanup
      }
    }
  }
</script>

<div use:doSomething />
```

This is useful when you want to interface with 3rd-party libraries:

```svelte
<script>
  import Draggable from 'the-draggable-library';

  function doSomething(element) {
    // highlight-start
    const draggable = new Draggable(element);
    draggable.start();
    // highlight-end
    return {
      destroy() {
        // highlight-next-line
        draggable.stop();
      }
    }
  }
</script>

<div use:doSomething />
```

You can pass in parameters to the `use:` directive, to bring in reactivity into your actions

```svelte
<script>
  import Draggable from 'the-draggable-library';

  let options = { foo: true, bar: true };

  // highlight-next-line
  function doSomething(element, options) {
    // highlight-next-line
    const draggable = new Draggable(element, options);
    draggable.start();

    return {
      // highlight-start
      update(options) {
        draggable.update(options);
      },
      // highlight-end
      destroy() {
        draggable.stop();
      }
    }
  }
</script>

<div use:doSomething={options} />

<label>
  <input type="checkbox" bind:checked={options.foo} />
  Foo
</label>
<label>
  <input type="checkbox" bind:checked={options.bar} />
  Bar
</label>
```

You can visit Svelte's interactive tutorial to learn more about:

- [event handlers with `on:`](https://svelte.dev/tutorial/dom-events)
- [bindings with `bind:`](https://svelte.dev/tutorial/text-inputs)
- [actions with `use:`](https://svelte.dev/tutorial/actions)

## The Vanilla JS

Now, let's refresh ourselves with how we can implement an event handler, bindings, and actions without using any framework.

### Event handler

As [mentioned in the Part 1 of the series](/compile-svelte-in-your-head-part-1/#listen-for-click-events-on-an-element), we can use [element.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) to listen to events.

```js
element.addEventListener('click', handleClick);
```

The event listener takes in an optional 3rd argument, which allows you to specifies the characteristics of the event handler:

```js
element.addEventListener('click', handleClick, {
  capture: true, // triggered before any child element
  once: true, // triggered at most once
  passive: true, // indicates that will never call `preventDefault` to improve performance
});
```

#### event.preventDefault

[event.preventDefault](https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault) allows you to prevent the default behavior of the event, for example submitting form for `<button type="submit" />` or navigating to the target for `<a href="...">`.

```js
element.addEventListener('click', event => {
  event.preventDefault();
});
```

#### event.stopPropagation

[event.stopPropagation](https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation) allows you to prevent event to continue propagate.

```svelte
<div on:click={event => {
  console.log('click not triggered');
}}>
  <div on:click={event => {
    // highlight-next-line
    event.stopPropagation();
    console.log('click');
  }}>
  </div>
</div>
```

To remove the event listener, you need to call `element.removeEventListener` with the same event `type`, `listener` and `capture`/`useCapture` flag. You can check out the [MDN docs on "Matching event listeners for removal"](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener#Matching_event_listeners_for_removal).

```js
element.removeEventListener('click', handleClick);
```

### Bindings

Binding is to synchronise between the value of a variable and a property of an element.

To synchronise the variable to a property of an element, we need to observe the value of the variable. When it changes, apply it to the property of the element.

_You can check out my previous article ["Reactivity in Web Frameworks"](/reactivity-in-web-frameworks-the-when/) on how we get notified when the value of a variable changed._

On the other hand, to synchronise the property of an element to a variable, we **listen to an event of the element**, depending on the property, and update the value of the variable when it happens.

```js
// binding variable `checked` with the checkbox `checked` property
let checked;
let input = document.querySelector('#checkbox');

// synchronise variable `checked` to checkbox `checked` property
observe(checked, newValue => {
  input.checked = newValue;
});

// synchronise checkbox `checked` property to variable `checked`
// listen to `change` event for `checked` property
input.addEventListener('change', event => {
  checked = input.checked;
});
```

Some observations:

**- The name of the event and the property name of the element may not be the same.**

In this example, we listen to `"change"` event for the checkbox `checked` property.

**- It is almost impossible to bind a property of an element, if there's no event fired from the element to indicate the property has changed**

A recent example I found out is the [HTMLDialogElement](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement). It has [`"close"`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close_event) but not `"open"` event, which makes it hard to implement `bind:open` on the dialog element.

Maybe an alternative would be using [MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver), which I haven't seen any usage of it in Svelte codebase yet.

### Actions

Action is a function that gets called when your element is created and mounted onto the DOM.

The function returns an object, with 2 methods:

- `update`, which gets called when the parameters change
- `destroy`, which gets called when the element is removed from the DOM

```js
function actionFn(element, parameter) {
  return {
    update(newParameter) {},
    destroy() {},
  };
}

// When element is mounted onto the DOM
let parameter = 1;
const actionObj = actionFn(element, parameter);

// When parameter changes
parameter = 2;
actionObj.update(parameter);

// When element is removed from the DOM
actionObj.destroy();
```

## The Compiled JS

Now let's take look at how Svelte compiles `on:`, `bind:` and `use:` directives into output JavaScript.

### `on:` directive

```svelte
<script>
  function onChange() {}
</script>

<input on:change={onChange} />
```

[Svelte REPL](https://svelte.dev/repl/0ea0c22e9fd648518cfc1231835b0f05)

The output code:

```js
/* App.svelte generated by Svelte v3.22.2 */
// ...
function create_fragment(ctx) {
  let input;
  let dispose;

  return {
    c() {
      input = element('input');
    },
    m(target, anchor, remount) {
      insert(target, input, anchor);
      // highlight-start
      if (remount) dispose();
      dispose = listen(input, 'change', /*onChange*/ ctx[0]);
      // highlight-end
    },
    d(detaching) {
      if (detaching) detach(input);
      // highlight-next-line
      dispose();
    },
  };
}

function instance($$self) {
  let i = 0;
  function onChange() {
    i++;
  }
  // highlight-next-line
  return [onChange];
}

// ...
```

Some observations:

- Svelte adds event handler, `listen(...)`, in the **_m_ount** method.
- Svelte removes event handler, `dispose()`, in the **_d_estroy** method.

As pointed out in [Part 1 #listen and dispose](https://lihautan.com/compile-svelte-in-your-head-part-1/#listen-and-dispose), to optimise for minification, the `dispose` variable could be a function or an array of functions, depending on having one or many event handlers.

We will discuss `remount` in the future, as it is related to remounting elements while reordering items within each block.

#### Event modifiers

Event handlers can have modifiers that alter their behavior.

```svelte
<script>
	let i=0;
	function onClick() {
		i++;
	}
</script>

<button on:click|preventDefault={onClick} />
<button on:change|stopPropagation={onClick} />
<button on:change|once={onClick} />
<button on:change|capture={onClick} />

<!-- Chain multiple modifiers -->
<button on:click|preventDefault|stopPropagation|once|capture={onClick} />
```

[Svelte REPL](https://svelte.dev/repl/11fffa988c1f49239c005619c3b506c5)

The output code:

```js
/* App.svelte generated by Svelte v3.22.2 */
// ...
function create_fragment(ctx) {
  // ...
  return {
    c() { /* ... */ },
    m(target, anchor, remount) {
      // ...
      // highlight-start
      dispose = [
        listen(button0, "click", prevent_default(/*onClick*/ ctx[0])),
        listen(button1, "change", stop_propagation(/*onClick*/ ctx[0])),
        listen(button2, "change", /*onClick*/ ctx[0], { once: true }),
        listen(button3, "change", /*onClick*/ ctx[0], true),
        listen(
          button4,
          "click",
          stop_propagation(prevent_default(/*onClick*/ ctx[0])),
          { once: true, capture: true }
        ),
      ];
      // highlight-end
    },
    // ...
  };
}
```

Some observations:

- Svelte handles different modifiers differently.
- For `capture`, `once`, and `passive` modifiers, which they are part of the options for [element.addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener), they will be passed as options into the `listen` function.
- For `stopPropagation`, `preventDefault`, and `self` modifiers, the event handler is decorated with respective decorator functions.

An example implementation of the `prevent_default` decorator function:

```js
function prevent_default(fn) {
  return function(event) {
    event.preventDefault();
    return fn.call(this, event);
  };
}
```

### `bind:` directive

```svelte
<script>
	let checked = false;
	function updateChecked() {
		checked = true;
	}
</script>

<input type="checkbox" bind:checked />
```

[Svelte REPL](https://svelte.dev/repl/22ff0420e32f427c8b20e878a44170d3)

The output code:

```js
/* App.svelte generated by Svelte v3.22.2 */
// ...
function create_fragment(ctx) {
  let input;
  let dispose;

  return {
    c() { /* ... */ },
    m(target, anchor, remount) {
      insert(target, input, anchor);
      input.checked = /*checked*/ ctx[0];
      // highlight-start
      if (remount) dispose();
      dispose = listen(input, 'change', /*input_change_handler*/ ctx[1]);
      // highlight-end
    },
    p(ctx, [dirty]) {
      // highlight-start
      if (dirty & /*checked*/ 1) {
        input.checked = /*checked*/ ctx[0];
      }
      // highlight-end
    },
    d(detaching) {
      if (detaching) detach(input);
      // highlight-next-line
      dispose();
    },
  };
}

function instance($$self, $$props, $$invalidate) {
  let checked = false;

  function updateChecked() {
    // highlight-next-line
    $$invalidate(0, (checked = true));
  }

  // highlight-start
  function input_change_handler() {
    checked = this.checked;
    $$invalidate(0, checked);
  }
  // highlight-end

  return [checked, input_change_handler];
}
```

Some observations:

- To synchronise the value of the variable to the property of the element:
  - Svelte wraps the update of the variable `checked` with `$$invalidate(...)`
  - In the **u_p_date** method, if the variable `checked` is updated, Svelte sets `input.checked` to the value of the variable `checked`.
- To syncrhonise the property of the element to the variable
  - Svelte creates an input handler that reads the `this.checked` property of the input and calls `$$invalidate(...)` to update it.
  - Svelte sets up `listen(...)` in the **_m_ount** method and `dispose(...)` in the **_d_estroy** method for the input handler

### `use:` directive

```svelte
<script>
	let i = '';
	function action() {}
  function updateI() {
    i++;
  }
</script>

<div use:action={i} />
```

[Svelte REPL](https://svelte.dev/repl/88bbecb8b86943fd80d9d428961251ae)

The output code:

```js
/* App.svelte generated by Svelte v3.22.2 */
// ...
function create_fragment(ctx) {
  // ...
  let action_action;

  return {
    c() { /* ... */ },
    m(target, anchor, remount) {
      insert(target, div, anchor);
      // highlight-start
      if (remount) dispose();
      dispose = action_destroyer(
        (action_action = action.call(null, div, /*i*/ ctx[0]))
      );
      // highlight-end
    },
    p(ctx, [dirty]) {
      // highlight-start
      if (action_action && is_function(action_action.update) && dirty & /*i*/ 1)
        action_action.update.call(null, /*i*/ ctx[0]);
      // highlight-end
    },
    d(detaching) {
      if (detaching) detach(div);
      // highlight-next-line
      dispose();
    },
  };
}
```

Some observations:

- Creating `action_action` object by calling the `action` function in the **_m_out** method
- When the paramter change, call the `action_action.update` method with the updated parameter in the **u_p_date** method
- `action_destroyer` returns the `dispose` function. The `dispose` function makes sure that `action_action.destroy` is a function before calling it.

### The order of directives

As both the `bind:` and the `on:` directives add event listeners to the element, the order of adding event listener may have nuance side effects.

Imagine the following scenario:

```svelte
<script>
  let before = ''
  let after = '';
  function uppercase(event) {
    // modifying the input.value
    event.target.value = event.target.value.toUpperCase();
  }
</script>

<!-- bind after adding input listener -->
<input on:input={uppercase} bind:value={after} /> {after}

<!-- bind before adding input listener -->
<input bind:value={before} on:input={uppercase} /> {before}
```

The `input.value` accessed by the implicit event handler of the `bind:` directive depends on whether `on:input` handler gets called before or after.

If the implicit event handler of the `bind:` directive is called before the event handler, the bound value is the value of the input before applying the `toUpperCase()` transformation.

Although `action:` directive itself does not add event listener to the element, but it is possible to be added by the user code:

```svelte
<script>
  let before = ''
  let after = '';
  function uppercaseAction(element) {
    function fn(event) {
      event.target.value = event.target.value.toUpperCase()
    }
    element.addEventListener('input', fn);
    return {
      destroy() {
        element.removeEventListener('input', fn);
      }
    };
  }
</script>

<!-- bind after adding action -->
<input use:uppercase bind:value={after} /> {after}

<!-- bind before adding action -->
<input bind:value={before} use:uppercase /> {before}
```

Although it is not officially documented, _(I couldn't find it on the docs)_, **the order of declaring the directives `on:`, `bind:` and `use:` on an element does matter** to provide a consistent behavior.

Try out the following example in the REPL:

```svelte
<script>
  let checked;
  function onChange() {}
  function action() {}
</script>

<input
  type=checkbox
  bind:checked
  on:change={onChange}
  use:action
/>
```

[Svelte REPL](https://svelte.dev/repl/f06a8a59840c418b86c43c2875d4b274)

Try reordering the `bind:`, `on:` and `use:` directives and see how it affects the output JS:

```js
// ...
function create_fragment(ctx) {
  let input;
  let action_action;
  let dispose;

  return {
    c() { /* ... */ },
    m(target, anchor, remount) {
      // ...
      // highlight-start
      dispose = [
        // bind:checked
        listen(input, 'change', /*input_change_handler*/ ctx[1]),
        // on:change={onChange}
        listen(input, 'change', onChange),
        // use:action
        action_destroyer((action_action = action.call(null, input))),
      ];
      // highlight-end
    },
    // ...
  };
}
```

If you are interested to learn more about ordering directives, the edge cases it fixed and the regression bugs it caused, you can start with [this Github issue](https://github.com/sveltejs/svelte/issues/2446).

## Closing Note

In this article, we explored how `on:`, `bind:` and `use:` directives work.

We first looked at how we can implement them without using any framework. After that, we walked through how Svelte compiles the directives into JavaScript.

We've also talked about how the order of declaring directives on an element matters.

If you wish to know more, [follow me on Twitter](https://twitter.com/lihautan).

I'll post it on Twitter when the next part is ready, where I'll be covering [logic blocks](https://svelte.dev/tutorial/if-blocks), [slots](https://svelte.dev/tutorial/slots), [context](https://svelte.dev/tutorial/context-api), and many others.

**⬅ ⬅  Previously in [Part 2](/compile-svelte-in-your-head-part-2/).**
