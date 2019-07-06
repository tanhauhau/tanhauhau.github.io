---
title: CSS Code Splitting
occasion: talk.css meetup
occasionLink: "https://singaporecss.github.io/37/"
venue: Shopee SG
venueLink: https://www.google.com/maps/place/Shopee+SG/@1.291278,103.7846628,15z/data=!4m2!3m1!1s0x0:0x7ddf2e854cf6e4e4?ved=2ahUKEwi5jbz6z_vgAhVBP48KHWSEAmMQ_BIwFXoECAEQCA
date: "2019-03-27"
description: "The motivation of CSS splitting arises when we try to split our CSS styles and lazily load the styles only when we actually need them. CSS code splitting is one of our many efforts where we constantly improve the performance of the application."
slides: https://slides.com/tanhauhau/css-code-splitting
video: https://www.engineers.sg/video/css-code-splitting-talk-css--3273
---

In the talk, I shared about why and how [Shopee](http://careers.shopee.sg) does CSS Code Splitting and how we solve problems arised in the process.

For those who don't know about [Shopee](http://careers.shopee.sg), we are an e-commerce platform based in [Greater Southeast Asia](https://www.seagroup.com/home), headquartered in Singapore. As a frontend engineer in Shopee, we constantly striving to deliver performant user experience with high network latency and slow CPU devices.

---

## Background

A little background on how we use CSS in Shopee before getting into how we code split our CSS:

> We use SASS and CSS Modules, and we bundle all our stylesheets with webpack into 1 final CSS file.

For the benefit of those who might not know about [SASS](https://sass-lang.com/), SASS is a sassy extension of CSS that allow us to write functions and mixins, so we can easily reuse common css tricks and patterns.

[CSS Modules](https://github.com/css-modules/css-modules) on the other hand, free us from racking our brain, coming up with a unique class name for every element. Even with [BEM (Block Element Modifier) naming convention](http://getbem.com/naming/), as our application grows complex, we can't keep up with names for our element. Names with BEM convention just get longer and longer. With CSS Modules, we just need to make sure that within a CSS file (we can call it a CSS module, like a js module) the class names are unique. Our build tool will transform the stylesheets and generate class names that is unique throughout the application.

And lastly with [webpack](https://webpack.js.org/), we use [extract-text-webpack-plugin](https://github.com/webpack-contrib/extract-text-webpack-plugin) to extract all the css code within the application into 1 CSS file.

---

## So, how big is Shopee?

If you ask the business team, they will give you the numbers on [how well we are doing in the region](https://www.techinasia.com/shopee-top-ecommerce-platform-sea).

But if you ask a frontend engineer, I can tell you is that to date (Mar 27 2019), we have more than a thousand of CSS files, and more than 67K lines of CSS code, and the numbers are growing...

And all this CSS code is bundled into one whoppingly 500KB CSS file! 😱

> ### How big is 500KB ?!

[500KB is](https://www.greennet.org.uk/support/understanding-file-sizes):
- 1 minute of MP3 at 80 Kbps bitrate
- 2 1280x960 JPEG image
- 1/10 second through 4G Network
- 2 seconds through 3G Network

Wait, who uses 3G nowadays? Isn't 5G is coming?

Turns out that most of the Southeast Asia is still on 3G if not slow 4G network, except major cities like Singapore, Jakarta, and etc.

So file size is indeed a big concern, when it comes to network speed.

### But download time does not tell the full picture.

Because you need to look at it holistically in terms of the [critical rendering path](https://developers.google.com/web/fundamentals/performance/critical-rendering-path/):

1. When the browser sees a *link tag* that links to a CSS file, the browser will go and fetch the CSS file.
2. As soon as the CSS is downloaded into the memory, the browser will start to parse and generate a [CSSOM (CSS Object Model)](https://developer.mozilla.org/en-US/docs/Web/API/CSS_Object_Model)
3. When the DOM is ready for layout, the browser will refer to CSSOM to get the style properties for a particular element and starts to layout.

Which means if your CSS file is large, it will takes up a portion of time to download, and another portion of time to parse, and generate the CSSOM. All these can be traced with the [Chrome's timeline tool](https://developers.google.com/web/tools/chrome-devtools/evaluate-performance/timeline-tool).

And what makes the matter worse is that, if we open up the [Chrome's Coverage tool](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage), you will see that more than 90% of the CSS code is not being used to style the current page.

**After all the trouble, only 10% of it is being useful** 😢.

So, we have to do what we need to do. 

## Solution

Big code file, that take long to download and parse, slows down the browser is not a new problem in frontend development. Indeed we've already solved this for JavaScript, we just need to apply the same technique for CSS this time.

The answer to all of this is **Code Splitting** 👏👏

The concept of Code Splitting is to split the code into seperate bundles, and dynamically load then only when you need it.

There's a few ways you can look at code splitting, you can:
1. Split code based on url routes, you don't have to load the code for Page 2 in Page 1
2. Split code based on sections, you dont need code that is off the screen to be loaded now. Only load them when you need it.

So just as we were [upgrading Webpack to Webpack 4](https://engineering.seagroup.com/shopee-webpack4/), our extract-text-webpack-plugin announced that we should be using [mini-css-extract-plugin](https://github.com/webpack-contrib/mini-css-extract-plugin) for CSS now.

We followed the guide of setting up the new plugin and it worked amazing! 😎

What's different between extract-text-webpack-plugin and mini-css-extract-plugin is that the latter will generate 1 css file per 1 js bundle instead of combining all css files into 1 css file per build.

All is well until we got our first bug ticket 😫

## The Problem

> Styles broken when user goes from Page XXX to Page YYY
> 
> But...
>
> Stlyes working fine when user goes directly to Page YYY, it's only broken when user goes from Page XXX to Page YYY

Well after some investigation, it turns out that it is a special combination of how we write our style declaration and how mini-css-extract-plugin works under the hood.

For the sake of simplicity, you can imagine this is how `mini-css-extract-plugin` works under the hood:

```js
function ensureCss(href) {
  const existingLinkTags = document.getElementsByTagName("link");
  for(let i = 0; i < existingLinkTags.length; i++){
    if (tag.rel === 'stylesheet' && tag.getAttribute("href") === href) {
      return;
    }
  }

  const linkTag = document.createElement('link');
  linkTag.rel = "stylesheet";
  linkTag.type = "text/css";
  linkTag.href = href;

  const head = document.getElementsByTagName("head")[0];
  head.appendChild(linkTag);
}
```

When you write:

```js
// somewhere in your application code
// when you write
import './styles.scss';
```

it gets transformed into something like:

```js
// webpack's mini-css-extract-plugin transform it into
ensureCss('https://shopee.sg/page-1-style.css');
```

So when this get executed, it will tries to look for existing link tag, if there's an existing link tag with the same url, it will be the end of it. But, when it does not exist, the `ensureCss` will create a new link tag and append it at the end of the `<head>` element.

**The order of the link tag depends on the order of how you navigate around the application.**

If you are overwriting the same element style in 2 different css files, and in both file if you are specifying the same specificity, the style eventually got applied will solely depend on how your user navigate around your application.

The solution for this is to make your css declaration more specific when overwriting a particular style.

eg: 
```css
/* only overwrite .foo in page2 */
.page2 .foo {
  color: blue;
}
```

Another problem we encountered when we tried to be more specific with CSS declaration, is due to how we write our [React](https://reactjs.org) component with CSS Modules.

```js
import styles from './styles.scss';
function MyComponent({ className }) {
  return <div className={styles.classA + ' ' + className}>Hello World</div>;
}
```

We wrote a custom component that takes in class name so we can overwrite the default style provided by the component.

**The order of classes in the class attribute does not matter, only the order in declaration matters.**

Unfortunately for us this time is that we are using CSS Modules, or else it would be much easier to overwrite it with 

```css
.classA.classB {
  color: blue
}
```

However, because the `.classA` will get transformed to something like `.c8e4436e` and we will never know the generated class name in build time, there's no way we can have a more specificity with the approach above.

One hack we came across to solve this conundrum is to [chain the selector with itself to increase its specifity](https://csswizardry.com/2014/07/hacks-for-dealing-with-specificity/), namely:
```css
.classB.classB {
  color: blue;
}
/* has higher specificity than */
.c8e4436e {
  color: green;
}
```

The next problem, is a very specific one.

In Shopee we does [Server Side Rendering](https://developers.google.com/web/updates/2019/02/rendering-on-the-web), and the nature of `mini-css-extrac-plugin` that uses browser API, like `document.createElement` just not working in a server context.

We have our on in-house solution for it, which I am not allow to disclose any of it.

But if you encounter similar issues, and are stucked somewhere, you can [find me on twitter](https://twitter.com/lihautan), I am more than willing to give out some personal pointers and advices on this matter. 
