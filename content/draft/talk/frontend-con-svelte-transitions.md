<!-- https://github.com/sveltejs/svelte/issues/4540#issuecomment-679439926 -->

Thank you for having me.

Transitions allow user to understand where thing comes from || and where it goes to.

Much like the button over here, when I click on it, it fells into the center, and the title of my talk floats up from it.

Yes, today, I will talk about how to make an entrance with Svelte Transitions. and how am i going to do it?

Well, we'll first take a look at what is svelte transition, and then we take a look at how we can write a custom transition. and finally, we'll peek under the hood, and look at the mechanics of a transition in svelte.

---

My name is Tan Li Hau. lihautan is my twitter handle, and recently i just created a youtube channel lihautan posting svelte related content.

I am a software engineer at Shopee. Shopee is an e-commerce platform based in Singapore. 

I grew up in a lovely town called penang in malaysia, which has the best street food in malaysia, such as char koay teow, stir-fry flat rice noodles; rojak, a eclectic fruit salad with palm sugar, peanuts and chilli dressing, and well, these are just one of the many great street foods that i hope to try again when I can go back after this coronavirus pandemic is over.

last but not the least, im one of the maintainers of svelte

---

First and foremost, Introduction to `transition:`.

In svelte, you can add logic blocks to add or remove an element. in this example, you can decide to add either of the `<div />` onto the DOM if the condition is true, or another condition is true, or otherwise. changing the value of the condition will remove 1 div from the DOM, and add another div into the DOM. 

|| Same thing goes for await block. while awaiting the promise, svelte shows the loading `<div />`, once the promise is resolved, the loading div is removed and the result div is added. on the other hand if the promise is rejected, the error div gets added instead.

|| you can use each block to add as many div as the length of the items array

|| when we click **add** or **remove**, we add the div onto the dom or remove it from the DOM. the new div shows up on the screen in an instant, and disappear in an instant.

we can add transition to show where the item comes from and where it will disappear into.

to add transition for the items, firstly, we import a transition from `svelte/transtion`. here we import fade. to use it, we use the `transition:` directive.

which is transition colon, and then the name of the transition.

to customise it, we can add parameters to it. such as duration or delay.

if you only want the entrance transition, use the `in:` directive instead.

likewise, the `out:` directive for the exit transition.

you can also mix and match a different entrance and exit transition to an element.

|| over here, we have 2 conditions, 1 for showing the parent div and 1 for showing the child div. since the child condition is true, when we turn on the parent condition, both div will be added onto the DOM, and their respective transition will be played together.

however, if you only want to play the child transition when we are toggling condition2, then the local modifier is what you need. a transition with a local modifier will only play out when its element is added or removed due to it's nearest logic block.

this way, when we toggle the condition1, the slide transition will not be played.

---

There are multiple built-in transitions in svelte, such as `slide`; `blur`, and blur takes in an amount of how much you want to blur the element, `fly`, x, and y position from where it will fly from, and `scale`, providing the starting scale amount.

---

when you use transition in svelte, the transition is played in a constant speed by default.

however, you can add easing to have different rate of, how the transition will be played out, you can have cubic in, or a bouncy entrance, or elastic, where it overshoots and snaps back.

---

there is much more built-in transitions and easing functions than what i just showed. which i recommend you to check them out in the docs as well as the tutorials.

---

Next. Writing a custom transition.

Well, a transition is just a simple javascript function. if you follow the contract of what to return from the function, you can write your own transition too.

and you can use it with the `in:`, `out:` or `transition:` directives.

So the transition function takes in the element that it will apply the transition to, 

And, it should return an object that describes the transition, or return a function that returns that object. (>>)

The object should contain properties such as `delay`, in milliseconds, how long before the transition starts; `duration`, in millisecond, how long the transition takes; `easing`, the easing function, which i'll explained later together with; `css`, a function that returns a css string; and `tick` a callback function.

All of the properties are optional, if not specified, the default for delay is 0ms, the default for duration is 300ms, and the default easing is linear.

Usually you would want the transition to be customisable, that's where the 2nd parameter is for || it is the same object where you pass in from the transition directive.

+++

Now, let's talk about easing.

Easing describes how much an animation progresses at different point of time throughout the animation.

For convenience sake, we describe time from 0 to 1, begins with 0% and ends in a 100%.

|| Here, as the red dot moves from time 0 to 1 along the red line, the value of eased time moves from 0 to 1 as well.

|| The easing function that we are looking at now, is the linear function. The eased value grows linearly with time.

However if I switch to `cubicIn`, the eased value grows in the power of 3 with time.

|| This is described by the `cubicIn` function.

Here's why we use 0 to 1 for time, because 0 power 3 is 0, and 1 power 3 is still 1. So after we power 3 the value of time, we still starts with 0 and ends in 1.

!! (bounceOut) Well, the easing function does not have to be a polynomial function, you can have if-else case in your easing function, like the `bounceOut`, or calling another function like (!!bounceInOut) `bounceInOut`.

So, how do we calculate the time?

|| At the beginning of the transition, we record the start time.

|| throughout the transition, we have `t`, the time passed since the starting time, in milliseconds.

We divide the value of `t` by the duration of the transition, so now we get the value from `0` to `1` for `t`, `0` in the beginning of the transition, and `1` at the end of the transition.

|| Now if i pass in the value of `t` into the easing function, in this case `bounceInOut`, I'll get the eased value.

And if i use this eased value to calculate how much I need to translate an element, || I'll get an element that bounce in out.

|| and that's how the css function works. it takes in `t`, and you return a css style in string, that will be applied to the element. You also have `u`, the 2nd paramter, which is `1 - t`, the inverse of `t`. || as you can see if you use `u` instead, then the element moves in the opposite direction.

So, if you transition an element into the view, the `t` will go from `0` to `1`, but if you transition an element out of the view, `t` will go from `1` to `0`.

And, if you want to manipulate the element beyond CSS, you can use the `tick` function. ||
it also takes in the `t` and `u` the same way as the `css` function.

|| One very common use case of this `tick` function is to create a typewriter transition.

Do take note that, the tick function is going to be called on every frame, if you want your application to be buttery smooth 60 frames per second, make sure the tick function is fast to prevent jank.

|| So we've covered all the properties in the transtion contract, let's take an example of a custom transition ||

Here i applied different font styles to the element, so the text stays bold and maroon for the 1st 40% of the time, then italic the next 40% of time, and then back to regular text.

Well, 40% of time is debatable depending on the easing function, in this case we are using linear easing, so it is exactly 40%.

As you can see, you don't have to limit your css transition to just CSS transform, or having to interpolate the value of `t`. **the sky is the limit.**

Likewise, the text stays at 'coming soon' at the 1st 40% of time, before changing back to the original text.

---

Finally the mechanics of a transition.

Let's explore a bit on how transition actually works under the hood. Before that, here are a few technologies available at our hands that we can make use of to create a transition.

the 1st is CSS Transition. ||

We add the transition property to a selector, describing which css property to be transitioned, the duration, easing function and delay.

And when you change the value of the specified property, in this case opacity, the opacity of the element will transition smoothly based on the easing function.

^^ so here i add the class to change the opacity to 0 ^^ and back to 1

However the CSS transition is a bit restrictive, you have limited easing functions, no offense, cubic bezier is great. but we can't do more beyond that.

Another thing CSS has to offer, is || CSS Animation.

We can define the keyframes of the animation, and then apply it to the element using the `animation` property.

We can have multiple animations happening at the same time, ^^^ and as we change the value of the transformation, ^^^ we can have different easing. Noticed that we can still use the linear easing in the `animation` property, so the keyframes will happen linearly. but as the transformation in each frame grows **in cubic power**, the element translates in cubic easing. 

**We are no longer limited by the easing functions provided by CSS.**

If the transition is not CSS based, we can use || JavaScript.

`requestAnimationFrame` lets you tell the browser that you wish to perform an animation, the browser will call the function provided for your animation update, right before the next repaint.

As you can see here, we can create a loop using `requestAnimationFrame`, and the `loop` function will be called on every frame right before the next repaint.

In the `loop` function, we have similar code as we've seen earlier, we calculate the duration since the start, and set the text content based on the duration passed.

So, with CSS animation and JS animation, let see how transitions actually work in Svelte.

------

Here we have our custom swoosh transition.

when the div is added onto the dom, svelte will call the swoosh function with the reference to the div and the parameter you specified.

the swoosh function returns the config, which will be used to construct a css animation.

so we start with an empty string, and we call the `config.css` function with the initial value of t, which is 0, and u which is 1.

the css function returns a css string, ^^ which we use to contruct a keyframe of the animation, and we add that into the style string.

next we loop through the value of t, from 0 to 1.

the number of steps we have for t, depends on the duration of the transition. the longer the duration, the smaller the step.

in each loop, we call the `easing` function to get the eased value.
with that, we pass in the eased value to the `css` function, to get the css string
and join the string together with the `style` string.

as we step through each value of `t`, we build up the animation frames.

lastly, we name the keyframes with a unique random name, || and we insert it into the DOM.

we apply the animation to the div, by setting the animation style property, with the corresponding duration and delay.

as you can see, all this is done in advance of the transition, and the animation is all handled by CSS.

if you provide the tick function, then we'll use the request animation frame, as discussed earlier to call the tick function on every frame.

------

Finally a recap, we've seen how you can use a transition in svelte, how to write a custom transition, and finally how the transition works in Svelte.

Hopefully, transition is no longer a mystical feature to you, and i hope to see more creative transitions coming up. || 

Tag me on twitter @lihautan, if you created something cool with transitions, I look forward to see them.

Once again, I'm @lihautan on twitter or lihautan my youtube channel, follow me where i post cool and fun knowledge about svelte.

Thank you and enjoy the rest of the conference!