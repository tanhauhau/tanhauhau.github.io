# Svelte and Reactivity

Reactivity is baked into Svelte. When you change your application state, the view updates automatically.
In this talk, I will go one level deeper to see how Svelte builds reactivity into the language itself and how it uses static analysis to create a smaller and faster output bundle. Along the way, you will learn about the limitation of Svelte's reactivity and methods to overcome it.

### Notes 
- I am a core member of Svelte, so I have a good understanding of the topic
- In this talk, I will be talking about
  - How Svelte uses static analysis to track variables, 
  - How Svelte generates code depending on the variable is reactive or not
  - How Svelte handles reactive declaration, the `$: ` label statement
  - The limitation of using static analysis and variable tracking
  - How svelte/store and other store-based library is used to overcome the limitation
- By understanding how reactivity in svelte works, you can prevent most of the beginner gotchas.

---

## Compiling Web App with Svelte

Svelte is a relatively new tool for building web applications. Instead of including a runtime library, Svelte compiles your code into bundled JavaScript that is very small compared to other approaches.

This talk will explain how Svelte compiler brings amazing features such as reactivity, scoped CSS and others while managing to keep the output bundle as small as possible.

At the end of the talk, you will get a deeper understanding of Svelte and be able to write a better Svelte component.

### Notes
- I am a [core member of Svelte](https://github.com/sveltejs), so I have a good understanding of the topic
- Svelte is a compiler, it analyses the code and generates an optimised bundle
  - However, to a lot of people, it may be black magic
  - Therefore, I would like to demystify the Svelte's compiler.
- In the talk, I will start with a hello world example, and slowly work my way up to a more complex example.
- Through the example, I will cover about:
 - Svelte single-file component
 - A look at different sections of the compiled code
 - How Svelte creates, update, and detach elements onto and from the DOM
 - How Svelte achieve reactivity
 - How scoped CSS works


---

# Reactivity in web frameworks

Reactivity is an essential piece in modern web frameworks. Change the state of your application, and the view updates automatically.

In this talk, we will answer one question, "How does your framework know **what** and **when** your state has changed?"

To answer the question, we will take a look at 3 modern web frameworks, Vue, React and Svelte. We will uncover their underlying mechanics, and learn about their strengths and limitations.

At the end of the talk, you will have a deeper appreciation of the tradeoffs that have made by the frameworks.

### Notes
- I am a core contributor to Svelte, before that, I have been using React for the past 3-4 years.
- I studied how each framework works, and I find it fascinating that how 3 different frameworks evolved with their own strategy of reactivity:
  - pure and async useState/setState in React
  - proxy tracking in Vue
  - reactivity in the language, through static analysis and compiler in Svelte, and would very much like to share that piece of knowledge to the audience.
- I will compare the strength and limitations of each framework
- Brief outline of the talk:
  - Writing interactive Vanilla JavaScript application leads to complex code, 
    - therefore the concept of MVC, MVVM arises
    - separation of concern between model logic and view logic
    - we start to see frameworks that taking care of the view logic
      - user describes how the view would look like with the model, framework taking care of updating the view whenever model changes
      - thus arise the need to know when the model has changed, and what has changed -> reactivity
  - Proposing 3 solutions
    - calling an update function whenever you want the view to change
      - solve the when has change, but doesn't know what has change
      - recreating all the views maybe expensive
      - thus we have virtual dom, and enforces immutability, referential equality for nested object is faster than deep equalilty
      - Weakness: verbose, requires immutability
    - mutation tracking
      - overriding Object.prototype and Array.prototype to track object and array mutation
      - with ES6 Proxy, we dont have to override prototypes
      - Weakness: complex mutation tracking mechanism, runtime overhead
    - reactivity in the language
      - uses static analysis
      - track assignment / mutation in build time
      - determine static/dynamic view in build time
      - more optimised output bundle
      - Weakness: not all assignment / mutation can be tracked in build time, hard to debug

# Compile Svelte in your Head

## v1

Ever peek into the JS output of the Svelte REPL and wonder how each section of the output code works?

In this talk, we are going to breakdown the Svelte compile output and investigate into how each of them works.

At the end of the talk, you will get a deeper understanding of Svelte and be able to write a better Svelte component.

## v2

How does Svelte work? How is Svelte different from other modern frameworks?

In this talk, we are going to talk a look at how Svelte compiles your code to tiny, framework-less vanilla JS.

# The Svelte Compiler

Have you ever wonder how does the Svelte compilation process works?
Have you ever feeling curious and want to read Svelte source code but does not know where to start?

This talk will give you an overview of the Svelte compilation process, from parsing the source code, analyse the code to generating final JavaScript code.

At the end of the talk, you will get a deeper understanding of the Svelte compilation process.

---

# Demystifying Svelte Transitions

It's unbelievably easy to create a cool slick transition in Svelte. Do you ever wonder how Svelte make it so simple? or how does Svelte make it performant and smooth?

In this talk, we are going to take a deep dive to look at the transition mechanism, how Svelte coordinates transitions across components, and what make them performant.

At the end of the talk, you will have a deeper appreciation of Svelte transition.
