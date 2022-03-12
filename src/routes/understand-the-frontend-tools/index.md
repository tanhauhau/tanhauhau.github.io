---
title: Understand the frontend tools
date: "2019-03-16T08:00:00Z"
description: "About the tools frontend developer used in 2019"
label: blog
---

## Motivation

Some people said, _"A year in the JavaScript world is equal to 10 years in the outside world."_ It maybe a bit of exaggerated, but it shed some light on the learning hell of a frontend developer.

[Kamran Ahmed](https://medium.com/@kamranahmedse) has written a nice article on [frontend developer's roadmap in 2018](https://medium.com/tech-tajawal/modern-frontend-developer-in-2018-4c2072fa2b9c), according to him, if you want to be a frontend developer, you would require to learn preprocessors, package managers, frameworks, build tools, and etc. The list keeps going on and honestly it is tough to keep up with all the new things that's coming out.

> So, how should we make sense of all these tools, libraries and frameworks to make ourselves a better frontend developer?

In this post and the posts to come, I would like to share some of my insights on how I navigate around all these ever evolving tools, libraries and frameworks.

## Disclaimer

Before you move on, I have to make some disclaimers.

> I am just another frontend developer. I am writing this to share, and hopefully get your feedback, on how to make sense with all the frontend development tools.

And there's a lot of articles out there for beginners to pick up JavaScript and CSS, and so I am not covering that.

> I will be assuming you have a basic understanding on how JavaScript and CSS works in building a web application.

Lastly, the opinions and insights I gathered are from articles, tweets, Github issues, and source code of the libraries.

> So some opinions I have might not be the true intention of the library maintainers, but I am giving my perspective in the way I think is the best for me and for you to understand the tools.

## Asking Questions

I realised that in 2019, someone new to frontend development, there is a lot of knowledge and concepts required to acquire, plethora of tools to learn, and I persoanlly think that's a lot to ask. But yet, this is our state of our industry currently.

Therefore, I am writing down the thought process and concepts that I've gained so far, and hoped that these articles would help new comers to the frontend development world a better foothold on understanding the frontend ecosystem.

When picking up a new tool, I strongly believe that the best way to learn about it is to ask youself, what kind of problems were you facing without this new tool, and how did you solve these problems? Does the new tool solved your problems?

So, in my humble opinion, the best way of learning all the tools out there in the JavaScript world, is to go back to the basics, ie: writing [Vanilla JavaScript](https://stackoverflow.com/a/20435744/1513547) and plain CSS, and start asking questions:

1. **Modularity**. How do I break down my code (JavaScript and CSS alike) into separate modules? How do I _"import"_ then when I need the module? If this module is to be used in multiple projects, how do I share them across projects? or better, how to share the modules to other people around the world?

2. Following up on question **1.**, How do I piece all my _"modules"_ together? How do I download the code for the modules I only when I need it?

3. **CSS Modularity**. How do I ensure that in a big application that there's no naming conflict for my CSS _classname_ or _id_?

4. **Abstraction**. if I can abstract common logic out in JavaScript, how do I have abstraction for CSS?

5. In all fairness, [JavaScript is not the best designed language](https://github.com/getify/You-Dont-Know-JS). JavaScript has its own quirks. So how can JavaScript evolve as a language itself, and how do I make use of the latest language syntax without risking browser compatibility?

6. When I write code, I noticed a common pattern in the code that may cause bugs, for example, using variable without defined it in scope, missing `default` case in `switch` statement, adding `string` with `number`, etc. How do I prevent myself from writing such code? Adding `string` and `number` is still a valid JavaScript code, but it will be a source of problem if we assume the result to be a `number`. How do I make myself to be aware of the `type` of the variable, given that JavaScript is a [dynamically-typed ](https://developer.mozilla.org/en-US/docs/Glossary/Dynamic_typing) language?

7. **Testing**. How should I test my code? If test code explains the behavior of my code, how do I write test code such that when other people reads the test code, they can understand all the quirks and behaviours of my actual code?

8. **Test coverage**. How do I ensure that I test all the possible scenarios? How do I know that my code has some impossible path/logic that will never execute, knowing all the possible test cases?

9. **Optimisation**. How does the browser downloads and exectues my code? What can I do to optimise the performance of my code? and how do I do it?

## Answering Them

The above are questions that I asked, and I am going to answer them one by one in the future articles.
