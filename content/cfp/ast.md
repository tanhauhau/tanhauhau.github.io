
---
Create your version of JavaScript
---
JavaScript is amazing. New syntax and features every year! And yet, it is not enough for me.

A while ago, I built my version of JavaScript. I modified Babel to make it support a currying syntax `function @@ foo(a, b, c) {` that makes a function automatically curried and can be called like `foo(1, 2)(3)`.

Creating this plugin involves modifying the tokenizer, modify the parser, transforming the AST, and serializing the AST. It also involves adding a custom runtime helper to `@babel/helpers` package.

Through the talk, you will see what parts are involved in creating custom JavaScript syntax and how they all fit together.

### Notes
- I am a triage member in the Babel org, core member of Svelte.
- I understand well about the topic of Babel and AST
- The talk is based on [my blog post](https://lihautan.com/creating-custom-javascript-syntax-with-babel/) that I've written a while ago
- As the JavaScript language evolves, new language syntax now comes with a Babel plugin to experiment with the syntax. I wish to demystify the process of creating a new syntax through this talk.
- A brief outline of the talk:
   - overview of the babel pipeline
   - tokenization, parsing JavaScript code
      - babel ast explorer
   - how parsing works
      - modifying the parser
   - transforming AST
      - writing a babel transform plugin
   - serialize AST
   - babel helpers and polyfills
      - how babel helper, polyfill works

---
The Hitchhiker's Guide to Abstract Syntax Tree
---
We have seen talks on using codemods to quickly refactor a large codebase. Inside codemods is Abstract Syntax Tree (AST), a mysterious yet powerful term.

In this talk, I will be guiding you through the fundamentals of AST, showing tips and tricks to traverse and manipulate an AST.

At the end of the journey, you will have a better understanding of how AST works and be much more confident in writing codemods.

### Notes
- I am a triage member in the Babel org and core member of Svelte. I understand well about the topic of Babel and AST
- I've written quite a few articles about AST:
   - [Manipulating AST with JavaScript](https://lihautan.com/manipulating-ast-with-javascript/)
   - [JSON Parser with JavaScript](https://lihautan.com/json-parser-with-javascript/)
   - [Creating custom syntax with Babel](https://lihautan.com/creating-custom-javascript-syntax-with-babel/)
- I've seen quite a few codemod talks in conferences lately, focusing more on refactoring the code. And I wish to shed more light on AST, particularly fundamentals and techniques on traversing and manipulating them.
- A brief outline of the talk
	- Introduce AST
		- How is AST created?
	- Traversing AST
		- Understand Depth-first search (DFS)
		- Understand Lexical Scopes
	- Manipulating AST
		- how to create AST with `babel-template`
		- inspect AST with AST Explorer
		- Giving examples, of common scenario
	- Wrapping up
---
Implementing a parser
---




---
Connecting the dots with Open Source
---
Do all the conference talks relevant to you? Should you pay attention to all of them?

Well, in a recent discussion about a Svelte RFC, it reminded me of a meetup talk a year ago on how to style a kanban board.

In this lightning talk, I'll share 2 seemingly unrelated stories, and how they are connected.

### Notes


---


Li Hau is an expert engineer 

I built my version of JavaScript. I created a new operator, forked the Babel parser and wrote a Babel plugin to transpile it to browser-compatible JavaScript.
I will share every step 


---
I don't have any special request. It is my 2020 new year resolution to speak at a big conference like JSHeroes. Should you decide not to pick my talk, if possible, I would like feedback so that I can improve on my CFP.


---
Drafts
---

- elevator pitch (300)
- description
- notes
- bio

- AST, or Abstract Syntax Tree is the backbone of many modern frontend toolings and frameworks
  - Babel, prettier, eslint
  - Svelte, Vue, ...

Step inside your everyday JavaScript tools, and you’ll find the abstract syntax tree. With the AST, let’s discover how our tools work, how we can extend them, and build a better understanding of computer language along the way.


Take a tour into the process of creating and experimenting with new JavaScript syntax. Through the journey, we will learn how to parse code into AST (Abstract Syntax Tree), how babel plugin works, and how to write a babel polyfill.

JavaScript has been expending in terms of language features and syntax

JavaScript is growing. 

Everyone uses Babel to modern JavaScript syntax.
