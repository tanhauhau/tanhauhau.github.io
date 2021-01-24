---
title: Making an entrance with Svelte Transitions
occasion: Frontend Connect
date: '2020-12-09'
---

## Slides

[[Link to slides](/slides/making-an-entrance-with-svelte-transitions/)] (Left arrow and right arrow to navigate)

## Script

Thank you for having me.

Transitions allow user to understand where thing comes from and where it goes to.

Much like the button over here, when I click on it, it fells into the center, and the title of my talk floats up from it.

Yes, today, I will talk about how to make an entrance with svelte transitions. And how am I going to do it?

We will dive into Svelte transitions level-by-level.

We start at the first level, where we will learn how to use `transition:` in svelte.
As we reached the 2nd level, we'll look at how to author a transition in svelte.
At the 3rd level, we go deeper and take a look at how Svelte compiles and handle transitions under the hood.

### Who am I

My name is Tan Li Hau, I am a software engineer at Shopee. Shopee is a e-commerce platform in South east asia that is based in Singapore. 

I grew up in a lovely town called penang in malaysia, which has the best street food in malaysia, such as char koay teow, stir-fry flat rice noodles; rojak, a eclectic fruit salad with palm sugar, peanuts and chilli dressing, and well, these are just one of the many great street foods that i hope to try again when I can go back after this coronavirus pandemic is over.

last but not the least, im one of the maintainers of svelte

### Level 1. Using `transition:`.

Here, we have a list of items, rendered using the `{#each}` block. When we add or remove an item, the item appears and disappears in an instant. we have no idea where the item is coming from, or disappear into.

To add transition for the items, firstly, we import a transition from `svelte/transtion`. here we import fade. to add an entrance transition for the item, we add `in` colon `fade`.

Now the item fades into existence.

To customise the transition, we can add parameters. such as duration, or delay. For exit transition, we use `out` colon `fade`.

If you want both entrance and exit transtion, you can use `transition` colon `transition name`.

There are multiple built-in transitions in svelte, such as `fly`, `slide`, `scale`, `blur` and more. this list is not exhaustive, which i recommend you to check them out in the docs as well as the tutorials.

### Level 2. The `transition:` contract.

Not sure if you've heard about the store contract in svelte, which states that, if any object follows the store contract, that object can be used like a store, where you can subscribe to it and read the value like a store using the `$`-prefix.

The same thing goes with the `transition`. A transition has a contract. Any function that follows the transition contract, can be used together with the `in:`, `out:` or `transition:` directives.

Here is how the transition function should look like. It's a function that takes in 2 parameters, the element node that the transition is applied to, and the parameter that is passed into the transition.

And, it should return an object that describes the transition, or return a function that returns that object.

The object should contain properties such as `delay`, in milliseconds, how long before the transition starts; `duration`, in millisecond, how long the transition takes; `easing`, the easing function, which I'll explained later together with; `css`, a function that returns a css string; and `tick` a callback function.

All of the properties are optional, if not specified, the default for delay is 0ms, the default for duration is 300ms, and the default easing is linear.

Usually you would want the transition to be customisable, that's where the parameter is for you can return the delay or duration, passed into the parameter from the user.

### Easing

Now, let's talk about easing.

Easing describes how much an animation progresses at different point of time throughout the animation.

For convenience sake, we describe time from 0 to 1, begins with 0% and ends in a 100%.

Here, as the red dot moves from time 0 to 1 along the red line, the value of eased time moves from 0 to 1 as well.

The easing function that we are looking at now, is the linear function. The eased value grows linearly with time.

However if I switch to `cubicIn`, the eased value grows in the power of 3 with time.

This is described by the `cubicIn` function.

Here's why we use 0 to 1 for time, because 0 power 3 is 0, and 1 power 3 is still 1. So after we power 3 the value of time, we still starts with 0 and ends in 1.

Well, the easing function does not have to be a polynomial function, you can have if-else case in your easing function, like the `bounceOut`, or calling another function like (bounceInOut) `bounceInOut`.

So, how do we calculate the time?

At the beginning of the transition, we record the start time.

Throughout the transition, we have `t`, the time passed since the starting time, in milliseconds.

We divide the value of `t` by the duration of the transition, so now we get the value from `0` to `1` for `t`, `0` in the beginning of the transition, and `1` at the end of the transition.

Now if I pass in the value of `t` into the easing function, in this case `bounceInOut`, I'll get the eased value.

The value does not go from `0` to `1` directly, it goes to 0.05, back to 0, 0.14~5, back to 0, all the 1, 0.85, 1, 0.95, 1.

And if I use this eased value to calculate how much I need to translate an element, I'll get an element that bounce in out.

And that's how the css function works. it takes in `t`, and you return a css style in string, that will be applied to the element. You also have `u`, the 2nd paramter, which is `1 - t`, the inverse of `t`. as you can see if you use `u` instead, then the element moves in the opposite direction.

So, if you transition an element into the view, the `t` will go from `0` to `1`, but if you transition an element out of the view, `t` will go from `1` to `0`.

And, if you want to manipulate the element beyond CSS, you can use the `tick` function.

It also takes in the `t` and `u` the same way as the `css` function.

One very common use case of this `tick` function is to create a typewriter transition.

Do take note that, the tick function is going to be called on every frame, if you want your application to be buttery smooth 60 frames per second, make sure the tick function is fast to prevent jank.

So we've covered all the properties in the transtion contract, let's take an example of a custom transition

[REPL](https://svelte.dev/repl/c88da2fde68a415cbd43aa738bfcefab?version=3.29.0)

Here I applied different font styles to the element, so the text stays bold and maroon for the 1st 40% of the time, then italic the next 40% of time, and then back to regular text.

Well, 40% of time is debatable depending on the easing function, in this case we are using linear easing, so it is exactly 40%.

As you can see, you don't have to limit your css transition to just CSS transform, or having to interpolate the value of `t`. **the sky is the limit.**

Likewise, the text stays at 'coming soon' at the 1st 40% of time, before changing back to the original text.

### Level 3, compile transition in your head.

This is a reference to the series of blogs i've written, "compile svelte in your head". be sure to check them out.

As, how we usually start with a compile svelte in your head article, we are going to explore how we can write a transition in vanilla javascript.

There are a few technologies at our hands we can make use of, the 1st is CSS Transition.

We add the transition property to a selector, describing which css property to be transitioned, the duration, easing function and delay.

And when you change the value of the specified property, in this case opacity, the opacity of the element will transition smoothly based on the easing function.
 so here i add the class to change the opacity to 0 and back to 1

However the CSS transition is a bit restrictive, you have limited easing functions, no offense, cubic bezier is great.

Another thing CSS offers us is CSS Animation.

We can define the keyframes of the animation, and then apply it to the element using the `animation` property.

We can have multiple animations happening at the same time, and as we change the value of the transformation, we can have different easing. Noticed that we can still use the linear easing in the `animation` property, so the keyframes will happen linearly. but as the transformation in each frame grows **in cubic power**, the element translates in cubic easing. 

**We are no longer limited by the easing functions provided by CSS.**

If the transition is not CSS based, we can use JavaScript.

`requestAnimationFrame` lets you tell the browser that you wish to perform an animation, the browser will call the function provided for your animation update, right before the next repaint.

As you can see here, we can create a loop using `requestAnimationFrame`, and the `loop` function will be called on every frame right before the next repaint.

In the `loop` function, we have similar code as we've seen earlier, we calculate the duration since the start, and set the text content based on the duration passed.

So, with CSS animation and JS animation, let see how we can implement transition in vanilla JS.

### Live Coding

```js
const app = document.getElementById("app");

const [btn1, btn2] = app.querySelectorAll("button");
btn1.addEventListener("click", insertNewItem);
btn2.addEventListener("click", removeLastItem);

let ul = app.querySelector("ul");
let list = [];

generateAnimation();

function insertNewItem() {
  const li = document.createElement("li");
  li.textContent = `new item ${list.length}`;
  ul.append(li);
  list.push(li);
  transitionIn(li, {
    delay: 0,
    duration: 500,
    css(t, u) {
      return `transform: translateY(${u * 50}px)`;
    },
    tick() {

    }
  });
}

function generateAnimation() {
  const duration = 2000; // 2seconds
  const keyframes = Math.ceil(duration / 16.66);

  const rules = `
    @keyframes bounceIn {
      ${Array(keyframes).fill(null).map((_, index)=> {
        let t = index / keyframes;
        let eased_t = bounceOut(t);

        return `${t * 100}% { transform: translateY(${(1 - eased_t) * 50}px) }`;
      }).join('\n')}
      100% { transform: translateY(0px); }
    }
  `;

  const style = document.createElement('style');
  document.head.appendChild(style);
  style.sheet.insertRule(rules);
}

function removeLastItem() {
  if (list.length) {
    const li = list.pop();
    const text = li.textContent;
    transitionIn(li, {
      delay: 0,
      duration: 500,
      css(t, u) { return ''; },
      tick(t, u) {
        if (t === 1) {
          ul.removeChild(li);
        } else{
          li.textContent = text.slice(0, Math.round(text.length * (1 - t)));
        }
      }
    });
  }
}

let i = 0;
function transitionIn(element, { duration, delay, easing, css, tick }) {
  const name = `bounceIn${i++}`;
  const keyframes = Math.ceil(duration / 16.66);
  const rules = `
  @keyframes ${name} {
    ${Array(keyframes).fill(null).map((_, index)=> {
      let t = index / keyframes;
      let eased_t = bounceOut(t);

      return `${t * 100}% { ${css(eased_t, 1 - eased_t)} }`;
    }).join('\n')}
    100% { ${css(1, 0)} }
  }
`;
  const style = document.createElement('style');
  document.head.appendChild(style);
  style.sheet.insertRule(rules);

  element.style.animation = `${name} ${duration}ms linear ${delay}ms 1 both`;

  // js animation
  let start = Date.now();
  let end = start + duration;
  tick(0, 1);

  function loop() {
    let now = Date.now();
    if (now > end) {
      tick(1, 0);
      return;
    }

    let t = (now - start) / duration;
    let eased_t = t;

    tick(eased_t, 1 - eased_t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

function startJsTransition(element, callback) {
  let duration = 2000; // 2s
  let start = Date.now();
  let end = start + duration;

  const text = element.textContent;

  function loop() {
    let now = Date.now();
    if (now > end) {
      callback();
      return;
    }

    let t = (now - start) / duration;
    let eased_t = t;

    element.textContent = text.slice(0, Math.round(text.length * (1 - eased_t)));

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

export function bounceOut(t) {
	const a = 4.0 / 11.0;
	const b = 8.0 / 11.0;
	const c = 9.0 / 10.0;

	const ca = 4356.0 / 361.0;
	const cb = 35442.0 / 1805.0;
	const cc = 16061.0 / 1805.0;

	const t2 = t * t;

	return t < a
		? 7.5625 * t2
		: t < b
			? 9.075 * t2 - 9.9 * t + 3.4
			: t < c
				? ca * t2 - cb * t + cc
				: 10.8 * t * t - 20.52 * t + 10.72;
}
```


### `transition:` in compiled JS

As we've seen how we can implement transition in vanilla JS, let see how transition is compiled by Svelte.

If you've read my compile svelte in your head blog series, you should know about the `create_fragment` function. To those that haven't read it and have no idea what a `create_fragment` function is, well, go read it! what are you waiting for?

Anyway, a `create_fragment` function is part of the Svelte compiled code, it returns an object describing how to create, mount, update and destroy elements for the Svelte component. You can think of it as a recipe for Svelte components, and create, mount, update and destroy are the basics operations of all Svelte components.

Here are 2 more operations added if you use transitions `intro` and `outro`.

Let's see how is it being used.

Say you have an each block. so in the main `create_fragment` function, you create the each block. and you have the `create_each_block` function that has the recipe to create elements for individual each items.

In the `create_fragment` function, we call the `transition_in` and `transition_out` in the `intro` and `outro` function. This will in turn call the `intro` and `outro` method of the individual each item block.

And when the each block has changes, say adding a new item to the array, svelte will also transition in the newly created block.

And when the item is removed from the array, svelte will start a new group of outros, transition out the removed items and synchronises the outros.

let's take a look how's the `intro` and `outro` method look like for each item.
first in the `intro` method, it will create a bidirectional transition for the `<div />`, the element we applied transition on, if it has not been created, and run it to `1`. for the `outro` method on the other hand, we run the transition to `0`.

Here, both the intro and outro is sharing the same transition object, so, if the item is added and removed immediately, when we run the transition to 0, the intro animation is cancelled and the outro animation is played immediately, depending on the outro delay.

If you only use the `in:` directive, then, only the intro transition is created.

On the other hand, same thing goes if you use only the `out:` directive.

Let's take a look at the how `create_in_transition` looks like, hopefully you can see some resemblance with the vanilla code that we've just written. We are going to look at just the `create_in_transition`, as the `create_out_transition` and `create_bidirectional_transition` is almost similar in structure.

Here we have the `start`, `invalidate` and `end`, and the `start` will call the function `go`, which starts the transition.

First we create the css rule. where we construct the keyframes and we insert the keyframes into the stylesheet, and apply it to the element.

Next we start the loop. if you look into the loop, it is implemented using `requestAnimationFrame`. before we start, we record down the start time of the animation and the end time, so we know when it will end.
 and we call the 1st `tick` function.

If the current time has passed the start time, we calculate the eased time, and call the `tick` function.

And if the time passed the end time, we call the `tick` function 1 last time.

In the begining of the loop, we dispatch the `on:introstart` event, and when it ends, we dispatch the `on:introend` event.

And of course some cleanup after that. 

Here are some source code reference if you are interested.

- [src/runtime/internal/transitions.ts](https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/transitions.ts)
  - `transition_in`, `transition_out`
  - `create_in_transition`, `create_out_transition`, `create_bidirectional_transition`

- [src/runtime/internal/style_manager.ts](https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/style_manager.ts)
  - `create_rule`, `delete_rule`, `clear_rules`

- [src/runtime/transition/index.ts](https://github.com/sveltejs/svelte/blob/master/src/runtime/transition/index.ts) (`svelte/transition`)
  - `fade`, `fly`, `slide`, `crossfade`, ...

First is the internal transitions, where the `transition_in`, `transition_out`, `create_transition`s method being defined.

Following on that is the internal style manager, the part where how svelte create new keyframe rules and manages stylesheets.

Lastly is the runtime transitions, that's where you import `svelte/transtions` from. You can check out the code for `fade`, `fly`, `slide`, `crossfade` and many other transitions.

### Recap

Finally a recap, we've seen how you can use a transition in svelte, author a transition in svelte, and finally how svelte implements the transition mechanism.

Hopefully, transition is no longer a mystical feature to you, and hope to see more creative transitions coming up. 

Tag me on twitter or discord [@lihautan](https://twitter.com/lihautan), if you created a something cool with transitions, I look forward to see them.

Once again, I'm [@lihautan](https://twitter.com/lihautan) on twitter, follow me where i post cool and fun knowledge about svelte.

Thank you and enjoy the Svelte summit!