pseudo classes

In the latest episode #CSSpodcast, @Una and @argyleink shared a ton of pseudo-classes

(I managed to note down 3️⃣9️⃣ of them 😱)

🧵 Here is a thread of what were shared in the podcast 👇👇👇

---

Pseudo-classes are selectors, lets you apply style to element based on info outside of the doc tree:

🌎 meta information, eg: language, history of navigator
☑️ state of the element, eg: checked, active, disabled

✨Pseudo-classes are great for implementing micro-

---

🔤 Case-insensitive
⏹ No whitespace in between

---

1️⃣ :link
😌 unvisited links
🔗 <a>, <area>, <link> with href attribute

2️⃣ :visited
😳 visited links
🔐 limited styles that can be applied due to security reasons
👀 @Una's workaround https://una.im/hacking-visited/

3️⃣ :hover
4️⃣ :active
📝 different states when interacting with links

---

🏆 :link, :visited, :hover, :active have the same specificity, the last one declared wins.

🥰 it's common practice to order them in the mnemonic "LVHA"

---

5️⃣ :focus

📝 targets element when it is in focus

6️⃣ :focus-within

📝 targets element when it or its children are in focus
📕 https://web.dev/next-gen-css-2019/#:focus-within
✨ useful when showing elements when on focus to maintain visible when focus into the child elements

---

7️⃣ :focus-visible

🧪 experimental
👨‍🔬 allow responsibly removal of focus ring
🙈 instead of :focus { outline: none; }
📕 https://github.com/WICG/focus-visible/blob/master/explainer.md

---

8️⃣ :target

🔗 target element with `id` that matches with URL hash (#)

9️⃣ :target-within

🧪 not yet supported
📝 similar to :focus-within but for :target

---

1️⃣0️⃣ :lang()

📝 selects element based on language
🎯 "lang" attribute: <html lang="en">, <div lang="es">
🎯 "Content-language" HTTP headers

---

1️⃣1️⃣ :dir()

📝 styles element based on direction of the text

👀 `[dir="..."]` match only elements with `dir` attribute
👀 `:dir(...)` match elements based on the direction calculated by the user agent, will inherit from parent

😢 not much support

---

1️⃣2️⃣ :enabled
1️⃣3️⃣ :disabled

😀 anything not disabled is enabled
👀 enabled is something that can be activated, clicked, tab-ed into, selecteded, typed within, or accepted focus

---

1️⃣4️⃣ :checked
1️⃣5️⃣ :indeterminate

🎯 input[type="checkbox"]
🎯 input[type="radio"]
🎯 select > option

📕 CSS games with checkbox https://una.im/css-games/

---

1️⃣6️⃣ :fullscreen

🎯 Matches element in full screen mode
😢 Safari uses `-webkit-full-screen` (👀 note the extra dash '-')

---

1️⃣7️⃣ :root

🎯 root of HTML document, the <html> node
📝 may have multiple :root within 1 web page -> iframe has its own :root
📝 useful for declaring global CSS variables

---

1️⃣8️⃣ :empty

🎯 selects any node that has 0 children
⚠️ text node or whitespace is considered children
⚠️ frameworks may insert empty text node unknowingly

📕 show fallback content when node is empty https://codepen.io/una/pen/BaBrePg
📕 hide buttons that are empty

---

1️⃣9️⃣ :placeholder-shown

🎯 has placeholder AND placeholder is shown

---

2️⃣0️⃣ :optional
2️⃣1️⃣ :required

😀 anything not required is optional
🎯 :required selects <input>, <select>, <textarea> with required attribute

---

2️⃣2️⃣ :blank

📜 CSS draft
🎯 selects <input>, <textarea> that is empty

🗣 Discussion on the name:  https://github.com/w3c/csswg-drafts/issues/1967

---

2️⃣3️⃣ :valid
2️⃣4️⃣ :invalid
2️⃣5️⃣ :in-range
2️⃣6️⃣ :out-of-range

📝 Validation state of input based on HTML5 form controls
📝 :in-range depends on min, max of input[type="number"]

---

2️⃣7️⃣ :first-child
2️⃣8️⃣ :last-child
2️⃣9️⃣ :only-child
3️⃣0️⃣ :first-of-type
3️⃣1️⃣ :last-of-type
3️⃣2️⃣ :only-of-

---

3️⃣3️⃣ :nth-child()
3️⃣4️⃣ :nth-last-child()
3️⃣5️⃣ :nth-of-type()
3️⃣6️⃣ :nth-last-of-type()

📝 uses `an-plus-b` syntax within the params

---

3️⃣7️⃣ :is()
3️⃣8️⃣ :not()

📝 :not takes in a simple selector, :is takes in a selector list
📝 specificity based on the highest specificity within the selector

---

🏷 Simple selector
🏷 Compound selector
🏷 Complex selector
🏷 Selector list

---

3️⃣9️⃣ :scope

📝 baseElement.querySelector(selectors) apply the `selectors` to the document to get a list of elements, then return the first match that is descendant of `baseElement`
📝 :scope allow match against the `baseElement` instead