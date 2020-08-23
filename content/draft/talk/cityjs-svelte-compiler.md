Modern web frameworks allow us to describe our UI declaratively, as a function of state, of the application. 

The function can be written in a form of template, or template-like syntax, which describes exactly how the view should look like, in all possible states.

When the state change, the view should change as well.

We don't need to describe how one view transition to another view. We don't describe what elements to be added, removed or modified.

**Modern Web Framework do that for us.**

and web frameworks like React and Vue do that using a technique called a virtual DOM.

it takes in 2 views from subsequent states, compare the differences between them, and generate an optimise list of patch updates and applies them onto the browser document (DOM)

this function here, the `framework_magic` is the defining feature in each framework.

To handle all the possible scenarios, this `framework_magic` could be very huge in code size, and it is independent of the application it is supporting.

for react is <TODO:> and vue is <TODO:>.

However, this doesnt have to be, **the only way** of doing things.

what if we could shift all of the work done in the `framework_magic` from runtime to build time, we analyse the code and figure figure out all the possible states and views, and the possible transitions between them, and generate out just enough code that is able to render the views and transition between them?

and that's the core idea of Svelte.

the Svelte compiler compiles the Svelte code into optimised JavaScript code, and today we are going to look into the Svelte compiler.

---

My name is Tan Li Hau, I am a software engineer at Shopee. Shopee is a leading e-commerce platform in South east asia that is based in Singapore. i grew up in a lovely town called penang in malaysia, which has the best street food in malaysia. hopefully you guys can come visit after this coronavirus pandemic is over.

---

lets have a crash course into svelte

Before I start, allow me to share how a Svelte component looks like, for the benefit of those who haven't look into Svelte before.

```svelte
<script>
  let count = 0;
</script>

{count}
<button on:click={() => count++}>Increment</button>

<style>
  button {
    font-size: 2em;
    background: red;
  }
</style>
```

a svelte component is written in a file with a `.svelte` extension. you can only have 1 component per file.

you can have only 1 top level script tag and style tag. the top level script tag allows you to define variable, just like how you would in any javascript code, and you can reference the variables in your html template, with a curly bracket.

to add event listener, you use a `on:` directive, and you can update the variable just like this, and it will automatically updated in your DOM.

now the css within style tag affetcs the style of your component, obviously, but what's cool about it is that, the css is scoped within the component. so when i say button, background: red, only the button written in this component file has the background red. not the child component, not the parent component. just this component.

```svelte
<script>
  let count = 0;

  $: double = count * 2;
</script>

<button on:click={handleClick}>
	Clicked {count} {count === 1 ? 'time' : 'times'}
</button>

<p>{count} doubled is {doubled}</p>
```

here is one of the most powerful, yet most confusing feature of svelte, reactive declarations.

here you have a double = count \* 2, with a dollar + colon sign in front of the statement. this means that the variable `double` is always 2 times `count`, whenever the value of `count` changed, the value of `double` will update as well.

<!-- in some programming language, this is called the destiny operator -->

This definitely feels weird in the beginning, but the more you use it, you'll ask yourself why didn't we have this earlier.

```svelte
<script>
  let ready = false;
  // TODO: doggie api?
  let someApi = api();
</script>

{#if ready}
  Let's go
{:else}
  You are not ready
{/if}

{#await someApi}
Loading...
{:then list}
  {#each list as item}
    {item}
  {/each}
{/await}
```

Svelte provides logic block, such as `{#if}`, `{#await}`, and `{#each}` to allow you to express logics within the template.

```svelte
<script>
  let value;
  let users = [
    'Jon',
    'Margeret',
  ];
</script>

<input bind:value={value} />

{#each users as user}
  <input bind:value={user} />
{/each}
```

Svelte supports two-way binding, changes in the variable will update the input, and typing into the input will in turn update the variable.

What's more amazing is that, `bind` works for item in an array as well.

TODO: need to show the code as well??

TODO: talk about ssr / dom generation

the same piece of code is used to generate

If it is for the DOM
If it is for SSR, it will generate a function that returns a rendered HTML string

---

Now, let's take a look at the Svelte compiler.

If this is your first time learning about compilers, according to Wikipedia, "A compiler is a computer program that translates computer code written in one programming language into another language.".

Let me give you an example of a compiler,

Typescript, although we mostly use for its type checking feature, is a compiler. It generates JavaScript code by compiling from TypeScript code into JavaScript code.

Another example of a common compiler is Babel, which compiles next generation javascript into browser compatible javascript.

And last but not the least, is Svelte. it compiles Svelte component into JavaScript.

So, how does a compiler works?

A compiler first reads through your code, and break it down into smaller pieces, called tokens.

The compiler then goes through this list of tokens and arrange them into a tree structure, based on the grammar of the language. The tree structure is what a compiler call “Abstract syntax tree” or AST for short.

An AST is a tree representation of the input code. 

And what the compiler sometimes do, is to analyse and apply transformation to the AST.
Using tree traversal algorithms, such as depth first search

And finally, the compiler generates a code output based on the final AST.

In summary, a generic compilation process involves parsing the code to an AST, doing analysis, optimsiation or transformation on the AST, and then generate code out from the AST.
Here are some resources on the web, that I used to learn about compilers.

---

Finally, let's take a look how Svelte compiler works.

Svelte parses the Svelte code into AST
Svelte then analyses the AST, which we will explore in detailed later.
With the analysis, Svelte generates JavaScript code depending on the compile target.

```svelte
<script>
  let count = 5;
  let values;

  $: double = count * 2;
  $: {
    const data = [];
    for (let i = 0; i < double; i++) {
      data[i] = Math.floor(Math.random() * 10);
    } 
    values = data;
  }
</script>

<input type="range" bind:value={count} />
<input bind:value={count} />

{#each values as value}
	<div class:even={value % 2 === 0} class="dot">{value}</div>
{/each}

<style>
	.even {
		color: red;
	}
</style>
```

And then over here, svelte creates a different renderer, depending on the compile output
And then the renderer generates the js and css output

So lets start from the beginning, the parsing.
Svelte implements its own parser
That parses the html syntax…
...as well as logic blocks, like each, if, and await
Because js is a fairly complex language, when svelte encounters a script tag, or a curly brackets, it will hand it over to acorn, to parse the JS content.
The same thing goes with css as well. svelte uses css-tree to parse CSS content in between the style tag.
In a svelte component, you are only allow to have 1 module script, 1 instance script, and 1 style tag on the top-level.
So the final ast would look something like this.
Here is where you can start reading about the svelte parser

The next step is to analyse the AST. In order to do that, Svelte created a component instance.
The component class stores information of the svelte component, such as
All the variables declared in the component
All the variables declared reactively
Slots for the component
Compile options, warnings, and errors
The first thing the component do is to traverse through the instance script and module script AST
To find out all the variables declared in the component, which will be useful later, 
...and also find out which varaibles get updated or reassigned in the script
Next, svelte traverses through the template AST
During the traversal, when it encounter an expression, it will lookup from the variables and mark them as referenced from the template.
This is because, variable that is not referenced from the template, does not need to be reactive.
Also, at the same time, it will record the variable as a dependency of the element or the logic block, 
This indicates that, whenever the variable changed in runtime, the element or logic block will need to be updated
Besides, during the template traversal, svelte transforms the template ast into a fragment tree, where each of the fragment node records more meta information. In this example, each block records the expression it will iterate through, the key and index, and the scope for its children node.
The scope tells the child template that the tagline variable refers to the one declared in the each block, instead of looking up from the script tag
Next, svelte traverses through the instance script again.
This time round, mainly for optimisation. Such as
Determine which variables or function can be safely hoisted, as well as,
Determine reactive declaration that does not need to be reactive
Next, svelte updates the CSS selectors, making sure that they are component scoped, and also warn any unused selectors.
Here is where you can read about the component class

The next step is to generate the output code.
In this step, svelte iwll create a renderer instance to do the job.
Dependeing on the compile options, svelte will either create a dom renderer or a ssr renderer
Lets first look at the dom renderer
Here’s is the final output of the dom renderer
As you can see there’s multiple fragment code blocks.
Usually a logic block will create mulitple fragment blocks
For example, each block will create 1 fragment block, which it will call it everytime when it iterates through the expression.
So the dom renderer traverses through the ast, and creates fragment code blocks on the way.
Since we’ve figured out what variables will be reactive, svelte arrange them into an array, and also replaces all the reference of the variable in the template to point to them
Svelte also wrap assignments and updates with invalidate function
Now lets look at the ssr renderer
Here’s is the final output of the ssr renderer
As you can see the output is made up of template literals and template expression
So the ssr renderer provides utils such as add_string and add_expression,
And when it traverses through the AST, it calls add_string and add_expression to build up the final template literal
Finally, the both renderer returns js and css, with the code as well as the source map.
This can be written into the file system, or be consumed your bundler using rollup svelte plugin or svelte loader for webpack.
So lets review again the svelte compilation pipeline,
Svelte parses the code into ast
Create a component instance to track variable references and dependencies
Svelte then creates a renderer, depending on the compile options
and with the renderer, it generates the output in JS and CSS.
Thank you so much for listening, if you like to learn more about svelte, you can follow me on twitter. I will post the link of the slides over there as well.
