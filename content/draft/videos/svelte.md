- start with a nice example, show how to do it
(a todo that flys in a new item, blur out when removed)
- fly new item
- blur remove item
- fade a popup / scale?
  - scale in and fade out
- slide a new section

- must be applied to DOM elements, cannot be on components
- types of transition

xx
- delay
  - staggered entrance

xx easing function

- list of easing can be used
- custom easing visualiser

---

beginner
- [x] prefers-reduced-motion accessibility transition
- crossfade (sending items across todo list)
- animate:flip
- {#if} + spring motion
- spring motion promise -> stash todo list item to somewhere, await promise ends and actually remove from list?

intermediate
(how to)
- writing custom transition
- writing custom easing function
- write a custom transition that is like -> deferred transition (crossfade)
- write a custom animate function
(examples)
- character sliding
- with {#key} - line fading https://twitter.com/dimfeld/status/1331498145465790465

(references)
- full page wipes
- https://dev.to/buhrmi/svelte-component-transitions-5ie
- https://dev.to/giorgosk/smooth-page-transitions-in-layout-svelte-with-sveltekit-or-sapper-4mm1
- https://twitter.com/addyosmani/status/1326434492052074497?s=20

compare / inspiration from
- framer motion
- react-spring
- lottiefiles.com


-----

store
writable
derived store
rxjs store
animation store

accessing store as a object property

---

basic ui/ux with svelte

- Draggable FAB https://www.reddit.com/r/webdev/comments/ju2g7o/built_a_draggable_menu_that_can_auto_adjust_the/?utm_medium=android_app&utm_source=share
- form validation https://twitter.com/notdetails/status/1201015962398539777?s=20

---

december transitions
1. -
2. -
3. -
4. -
5. -
6. -
7. -
8. -
9. -
10. -
11. -
12. -
13. -
14. -
15. -
16. -
17. -
18. -
19. -
20. -
21. -
22. -
23. -
24. -
25. -
26. -
27. -
28. -
29. -
30. -
31. -

---

actions

- action dispatching events, eg: gestures event
- action directives order
- action factory, having onMount, onUpdate within the factory
- integrating 3rd party library
- interface for reactivity
- passing in store <-> fake 2-way binding
- actions / ref useeffect
- integrate with lib
