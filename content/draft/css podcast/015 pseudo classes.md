Pseudo-class is a keyword to selector, lets you apply style to element based on factors beyond the DOM, such as

🌎meta information, eg: language, history of navigator
☑️state of the element, eg: checked state, active state
✨implement micro-interactivity

- functional pseudo classes  :xxx()
- regular psuedo classes     :xxx

# UI pseudo states

:link
- unvisited links
- a, area, link -> with href

:visited
- limited, for privacy concern
- color, border-color, background-color, 
- https://una.im/hacking-visited/

:hover

:active
- between hover and release

LVHA
- 


:focus
:focus-within
:focus-visible

:focus-visible
- responsibly removal of the focus ring
- In Chrome, <button> when click it is on focus, but no focus ring
  - but when you add any css style to the button, clicking it will have focus ring
- focus:visible allow ppl to remove that instead of doing `outline:none` to all focus
- explainer: https://goo.gle/2VslHMA

```
:focus {
  outline: 0;
}
:focus-visible {
  outline: 2px solid blue;
}
```

:target

- href to hash tag
- matching hash in 

:target-within
- just like :focus-within, but not yet supported
- browser support?

####

:lang
:dir(rtl), :dir(ltr)

:lang
- <html lang=""> or <meta tags>

:dir(rtl), :dir(ltr) - match by the user agent, inherited
[dir=] - will only match the element with the attribute


-----

:not()
- increase by the most specific in the list
```
a:not(#foo) {
  color: green;
}
a:not(.foo) {
  color: red;
}
a.bar {
  color: blue
}
```
- pseudo element cannot be targeted by this psuedo class

---
forms

:enabled
- not disabled,
- can be activated: clicked, tab-ed into, selected, typed within, or accept focus
:disabled

:checked, :indeterminant
- <input type="checkbox">, <input type="radio">, select > option
- whackamole game https://goo.gle/2VxfhvX
- tic tac toe, https://goo.gle/2ZzTCob
- https://una.im/css-games/

:indeterminant
- neither true nor false

---

:fullscreen
safari-> :-webkit-full-screen (note the dash)

--------

structural psuedo selectors

:root
- custom properties
- iframe can has it's root too.

:empty
- any node that has no children
text node and whitespace considered as children

https://codepen.io/una/pen/BaBrePg
```css
content:empty:after {

}
```
- may not read out `:after` content
- tricky -> new line break in frameworks
- hide buttons that are empty

```css
button:empty {
  display: none;
}
```

:is()
- used to :-webkit-any()
- 
any new candy, that the chocolate is either citrus, blueberry, or cookies & cream, and i want the bars

```css
.chocolate:is(.citrus, .blueberry, .cookies-and-cream).bars {
```

```css
:is(:hover, :focus) {}
```

- specificty similar as :not
```
:is(ul, .list) > [hidden]
VS
ul > [hidden],
.list > [hidden] {

}
```

:placeholder-shown
- has placeholder and placeholder is shown
- similar as :focus?

try ?
```
:not(:placeholder-shown) ::placeholder {

}
```

:optional, :required, :blank
:blank -> only on input?
- https://goo.gle/2Vukm81

:valid, :invalid, :in-range
- min, max set -> input[type="number"]

---
:first-child
:last-child
:only-child

:first-of-type
:last-of-type

:nth-child()
:nth-last-child()

- An+B (microsyntax)

:nth-of-type
:nth-last-of-type

- skip the element that is not the type

:only-of-type
- email example?

:scope
- not available in CSS
- nav.querySelector(':scope a')


🏷 Simple selector
- type selector
Example: `h1`, `p`
- universal selector
Example: `*`
- attribute selector
Example: `[title]`, `[lang="en"]`
- id selector
Example: `#id`
- class selector
Example: `.food`
- pseudo-class
Example: `:visited`

🏷 Compound selector
- sequence of simple selectors
Example: `h1.food`

🏷 Complex selector
- sequence of compound selectors separated by combinators (` `, `>`, `+`, `~`)
Example: `h1 > h2`, `p + span`

🏷 Selector list
- comma separated list of simple, compund, complex selectors
Example: `p, :link, h1 + span`