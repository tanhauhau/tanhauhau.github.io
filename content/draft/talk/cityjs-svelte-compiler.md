Modern web frameworks allow us to describe our **UI** declaratively, as a function of state, of the application. 

The function can be written in a form of template, or template-like syntax, which describes exactly how the view should look like, in all possible states.

When the state change, the view should change as well.

We don't need to describe how one view transition to another view. We don't need to describe what elements to be added, removed or modified.

**Modern Web Framework do that for us.**

the `framework_magic` takes in 2 subsequent views and figure out how to transition from 1 to another.

modern web frameworks like React and Vue do that using a technique called a virtual DOM.

To handle all the possible scenarios, this `framework_magic` could be very huge in code size, and it is independent of the application it is supporting.

for react is 40kb gzipped and vue2 is 23kb gzipped, vue3 is 10kb.

and if your application is simple, it could disproportionately small in terms of code size relative to the framework library, which is shown in the gray portion of the chart.

However, this doesnt have to be, **the only way** of doing things.

what if we could shift all of the work done in the `framework_magic` from runtime to build time?

we can analyse the code and figure out all the possible states and views, and the possible transitions between them, and generate just enough code to do just that?
<!-- that is able to render the views and transition between them? -->

and that's the core idea of Svelte.

the Svelte compiler compiles the Svelte code into **optimised** JavaScript code that **grows linearly** along with your application code.

and today we are going to look into the Svelte compiler.

Don't worry if you are not familiar with Svelte / compiler, I'll try my best to avoid the jargons and explain the general idea of the process.

---

My name is Tan Li Hau, I am a software engineer at Shopee. Shopee is a e-commerce platform in South east asia that is based in Singapore. 

I grew up in a lovely town called penang in malaysia, which has the best street food in malaysia, such as char koay teow, stir-fry flat rice noodles; rojak, a eclectic fruit salad with palm sugar, peanuts and chilli dressing, and dont get me started with food. Hopefully you guys can come visit Malaysia after this coronavirus pandemic is over.

last but not the least, im one of the maintainers of svelte

---

Before we start talking about compilers, for the benefit of those who havn't have a chance to look into Svelte, lets take a look at how a svelte component looks like.

a svelte component is written in a file with a `.svelte` extension. ^^ each file describes 1 svelte ^^ component.

^^ you can add 1 script tag to the component. ^^ the script tag allows you to define variable, just like how you would in any javascript code, ^^ and you can reference the variables in your html template, with a curly bracket.

^^ to add event listener, you use a `on:` directive, and you can update the variable just like this, and it will automatically updated in your DOM.

^^ you can add a style tag and write some css to style your component. What's cool about it || is that, the css is scoped within the component. so when i say button, background: red, only the button written in this component file has the background red. not the child component, not the parent component. just this component.

**now**, here is one of the most powerful, and somewhat controversial feature of svelte, reactive declarations.

here you have a double = count \* 2, with a dollar + colon sign in front of the statement. this means that the variable `double` is always 2 times of `count`, whenever the value of `count` has changed, the value of `double` will update as well.

<!-- in some programming language, this is called the destiny operator -->

This definitely feels weird in the beginning, but the more you use it, you'll ask yourself why didn't we have this earlier.

So, here we have 1 big red button, and a text of multiply equation as a Svelte component.

I am gonna pause here for a moment, and ask you this question, **how would you implement this, if you are not allowed to use any framework and you have to write it in Vanilla JavaScript?**

(pause)

So, firstly we are going to start with the variable declaration.

Next we create the text with document.createTextNode, and insert it to the parent

Next we create the button, change the text, add event listener and insert it to the parent.

To update the text when the count is updated, we create an update function, where we update the value of double and update the content of the text.

Finally for the style tag, we create a style tag, set the content and insert into the head.

To make sure that the button only targets this button that we just created, we add a class to the button.

Here the class name is random, but it could be generated based on the hash of the style code, so you get consistent class name.

(TODO: CLICK TO VIEW JS OUTPUT)

In fact if you take a look at the svelte generated JS output, it is very similar to the code we just wrote.

So, this is just the code you need to **create a button and a text**. You don't need 40KB Virtual DOM library to recreate the same component.

Of course, you don't have to write all of these yourself.

The Svelte compiler will do it for you. It will analyse the code above, and generate the code below for you.

And now, if you try to choose "SSR" as the generated output, you can see now Svelte generates a function that returns a string composed using template literals.

This is a few orders more performant than generating a tree object and serialising them into a HTML string.

(DONT MOVE)

So, Let's take a few more examples of the Svelte syntax, and along the way, I hope you ask yourself this question, **"how do i convert this / write this in plain JavaScript?"**

and don't worry, you can find this repl on the svelte website. and you can compare the input and the js output anyway you want.

(OKAY NOW MOVE)
---

To express logics within the template, Svelte provides logic block, such as **`{#if}`**, **`{#await}`**, and **`{#each}`**.

To reduce the boilerplate code for binding a variable to an input, Svelte provides the `bind:` directive.

To provide transition for elements coming into or out of the DOM, Svelte provides the `transition`, `in` and `out` directive.

To compose Components, Svelte provides slots and templates similar to the Web Component APIs.

There's so much I would like to share here, but I have to segue into the Svelte compiler, because that's the main topic of today's talk.

---

Now, finally, let's take a look at the Svelte compiler.

So, how does a compiler works?

A compiler first reads through your code, and break it down into smaller pieces, called tokens.

The compiler then goes through this list of tokens and arrange them into a tree structure, according to the grammar of the language. The tree structure is what a compiler call “Abstract syntax tree” or AST for short.

An AST is a tree representation of the input code. 

And what the compiler sometimes do, is to analyse and apply transformation to the AST.
Using tree traversal algorithms, such as depth first search

And finally, the compiler generates a code output based on the final AST.

In summary, a generic compilation process involves parsing the code to an AST, doing analysis, optimsiation or transformation on the AST, and then generate code out from the AST.
<!-- Here are some resources on the web, that I used to learn about compilers. -->

---

Finally, let's take a look how Svelte compiler works.

Svelte parses the Svelte code into AST
Svelte then analyses the AST, which we will explore in detailed later.
With the analysis, Svelte generates JavaScript code depending on the compile target, whether it's for SSR or it's for the browser.
Finally, js and css is generated, and can be written into a file or be consumed by your build process.

---

So lets start from the beginning, the parsing.

---

Here is a Svelte component that we are going to use throughout this talk.

Svelte, || implements its own parser

That parses the html syntax…
...as well as logic blocks, like each, if, and await

Because js is a fairly complex language, whenever svelte encounters || a script tag, || or a curly brackets, || it will hand it over to acorn, a lightweight JavaScript parser, to parse the JS content.
The same thing goes with css as well. svelte uses css-tree to parse CSS content in between the style tag.

<!-- In a svelte component, you are only allow to have 1 module script, 1 instance script, and 1 style tag on the top-level. -->

So, through the process, the svelte code is broken down into tokens, and is arranged into the Svelte AST.

If you interested to see how the Svelte AST looks like, you can check them out at ASTExplorer.net.

The next step is to analyse the AST.

Here, our code is already in AST, || BUT to help visualise the process, i'm going to show you the original code.

The first thing Svelte do || is to traverse through the script AST.

Whenever it encounters a variable, in this case, count, it will record down the variable name.

here we record values || and double.

the "double" here, || in this svelte code || is a reactive declared variable. but to vanilla JavaScript, we are assigning value to this variable "double", which is not declared anywhere. 

in strict mode, this is a "assignment to undeclared variable" error.

Svelte marks the variable, "double", as "injected", so the declaration of the variable will be injected later. other examples of injected variables are svelte magic global, such as $$props, or a $ prefix of a store variable.

here we encounter "count" again, this time its being referenced, instead of being assinged to a value, and it is used to compute the value of double. || so we draw a dependency relationship between count and double.|| so double is depending on count.

lets continue.

here we see data. data is not declared at the top level scope, as it is within the curly bracket block scope. so we are not going to record it down.

same thing goes with `i`.

here we encountered double again, so we mark it as referenced.

Math, a js global, we are going to ignore it.

here `values` is mutated.

now we reach the end of the script, the next step is to traverse the template AST.

we start from the `input` element, which has a `bind:value`.

Here we are binding the value of the input to the variable `count`. so we mark `count` as referenced from template and mutated.

Now we encountered the each block. Here we are iterating through the variable `values` and we are using the variable `value` as each item. So the template within the each block || will have a new scope, where `value` is declared. || Also, we mark `values` as the dependency of the each block. || This means that whenever `values` has changed, we are going to update the each block.


...and, we mark values as referenced too.

next, we move into the each block and the div element. Here we mark `value` as referenced from the template, we encounter `value` again || and we've reachead the end of the template.

and Svelte traverse through the script again, this time mainly for optimisation. || figuring out which variables are not referenced, and does not need to be reactive.

Similarly, if a reactive declaration's dependency will never change, || by seeing whether their dependencies were marked as mutated, || we can mark it as static, which is more efficient, and much smaller in code size.

Next, Svelte traverse through the style. 

for each selector, it will determine whether it will match any elements in the template, || and if it does, svelte will add a svelte-hash class name to the selector as well as the matched eelement. || Although this will increase the specificity of the selector, but it will make the selector scoped only to the current svelte component.

At the end of this step, Svelte has figured out all the variables declared, their behavior and their relationship.

With this, we are moving on to the rendering phase. 

---

This step is where svelte will generate the javascript code.
There are 2 different compile targets, 1 is DOM, for the client side, and another is ssr, for the server side.

Lets first take a look at the dom render target.

Here we have the source code. and here is the outline of how a dom output looks like.

Here is what I called a fragment block. the create fragment function returns an object, that acts as a recipe to create the elements in the component. each method in the recipe object, represents a stage in the component lifecycle, here we have `c` for `create`, `m` for `mounting`, `p` for `update`, and `d` for `destroy`.

next on, we have the instance function. here's where the state and component logic goes into.

finally we have the svelte component class. so each svelte component is compiled into a class || which is the default export. in the constructor, as you can see, calls the `init` function || which takes in the `instance` and `create_fragment` function. and this is how the 3 different pieces of the svelte compoenent || come together.

Now, svelte walks through the template again, and starts inserting code into output.

First we have the input element. we insert instructions to create the input element, || mounting the element to the target, || and remove the element from the target.

next we have the binding of the input value to the `count` variable. we need an input handler to listen to the input changes, so we can update the value of the `count` variable. || here we pull out the variables list, and add `input_handler`.

we set the input value based on the variable count || and add event listener for input changes || which we should remove event listener when we destroy the component.

and in the update phase, if the `count` has changed, we need to update the value of the input based on the value of `count`.

next we move on to the each block.

we create a new fragment block for the each block, which contains the recipe for creating elements for 1 each item. And because in the each block we have a child scope that defines the variable `value`, we have a `get_each_context` function to emulate that.

Here we fast forward through the steps, where for each element, we insert code for how we create, mount, update and destroy them. If you are interested to know the details, you can check out my series of blog, called "Compile Svelte in your head".

Now we look at how Svelte fills up the instance function. In most cases, Svelte just copies over whatever is written within the `<script>` tag.

For reactive declarations, they were added inside the `$$.update` function, || and for each statement, we add an if statement to check whether their dependency has changed, based on the dependency relationship we've drawn earlier.

Now we need to declare and add those injected variables.

Finally, we return the list of variables that are **referenced by the template** only.

Now, to make the variables actually reactive, we instruments the `$$invalidate` after each assignment statements, so that it will kickstart a next round of update cycle.

So here you have it, the compile output for the DOM target.

Let's take a quick look at how things going for compiling to the SSR target.

The structure of the output code for the SSR target is much simpler. it is a function that returns a string.

Because there wont be any reactivity needed in the server, we can copy over the code verbatim from the script tag. || same thing goes with reactive declarations, of course we need to remember to declare the injected variable, `double`.

as we traverse through the template, we add insert strings or expressions into the output template literal. For the each block, we iterate through the variable `values` and return the child elements as string.

And there you go, the output code of a svelte component for SSR.

---

Finally, Svelte outputs the code in JS and CSS, with the code as string as well as the sourcemap. 

These can be written into file system directly, or be consumed by your module bundler, such as rollup-svelte-plugin in rollup or svelte-loader for webpack.

So lets review again the svelte compilation pipeline,
Svelte parses the code into ast, runs a series of steps to analsye the code, tracking the variable references and dependencies. Then svelte generates the code depending on the compile target, whether it's for the client side or server-side.
And the output of the render step is in terms of JS and CSS, which can be written into a file / consumed by your build tools.

Thank you so much for listening. If you like to learn more about svelte, or if you have any questions about svelte, you can follow me on twitter. I am lihau. hope you have fun with the talks throughout the conference. see ya.