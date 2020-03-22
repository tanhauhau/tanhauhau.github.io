- compiler understands the shape of your component when you are building your application and turn it into optimised javascript instead
- the main benefits are 
  - typically have a smaller initial payload, less js to begin with,
  which means your application becomes interactive faster,
  - and because you dont have a lot of work to do, to figure out what needs to be changed on the page and respond to a state change follow by an interaction, your application updates faster, 
  so you can have more ambitious user interface, more animation, lots of transitions, really complex design features, and you are not going to run into the same performance cliffs that you sometimes hit with other frameworks
  - write less code
    - because we are compiler, not constrained by javascript, components are written in the svelte file, which essentially a superset of html, they contain jvascript, but then not javasript, because of that, we can create a language that is very expressive and concise
    - and typically if you are building an application out of  svelte, you will write about 30-40% less code than if you are writing the same application with React for example, and React is already very compact and concise 

  - less code for you, less code for the browser, and your application becomes more faster, in most cases

- 