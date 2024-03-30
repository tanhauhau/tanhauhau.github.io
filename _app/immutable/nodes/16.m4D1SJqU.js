import{s as f,d,e as _,f as p,n as w}from"../chunks/scheduler.85ImRbsk.js";import{S,i as b,m as y,n as P,o as x,t as k,a as C,p as H,e as u,s as $,c as h,q as m,h as L,j as r,g as c}from"../chunks/index.JMRAb4ib.js";import{g as T,a as g}from"../chunks/code-snippet.p32Anx_S.js";import{B as M}from"../chunks/BlogLayout.TadBQAnB.js";const B=""+new URL("../assets/hero-twitter.l7vave86.jpg",import.meta.url).href;function I(n){let e,o='<h2><a href="#background" id="background">Background</a></h2> <p>A while ago, <a href="https://twitter.com/swyx" rel="nofollow">@swyx</a> came back to Singapore and visited us in <a href="https://careers.shopee.sg/about/" rel="nofollow">Shopee Singapore</a> (<a href="https://grnh.se/32e5b3532" rel="nofollow">We&#39;re hiring!</a>).</p> <p>He gave an amazing sharing on <a href="https://www.swyx.io/speaking/svelte-compile-lightning/" rel="nofollow">Compile Svelte in Your Head</a> (<a href="https://www.youtube.com/watch?v=FNmvcswdjV8" rel="nofollow">video</a>) in the <a href="https://reactknowledgeable.org/" rel="nofollow">ReactKnowledgeable Originals</a>.</p> <p>I love his presentation and the title is so catchy, so I begged him to use the catchy title as this series of articles about the Svelte compiler. It will be about how Svelte sees your code and compiles it down to plain JavaScript.</p>',l,i,t='<h2><a href="#compile-svelte-in-your-head" id="compile-svelte-in-your-head">Compile Svelte in your Head</a></h2> <p>The incomplete outline:</p> <ul><li><a href="/compile-svelte-in-your-head-part-1">Part 1 - The Foundation</a></li> <li><a href="/compile-svelte-in-your-head-part-2">Part 2 - <code class="inline">$$invalidate</code> and Reactivity</a></li> <li><a href="/compile-svelte-in-your-head-part-3">Part 3 - Directives - <code class="inline">on:</code>, <code class="inline">bind:</code>, <code class="inline">use:</code></a></li> <li><a href="/compile-svelte-in-your-head-part-4">Part 4 - Logic blocks - <code class="inline">{#if}</code></a></li> <li>Part 5 - Logic blocks - <code class="inline">{#each}</code></li> <li>Part 6 - Logic blocks - <code class="inline">{#await}</code></li> <li>Part 7 - Directives - <code class="inline">bind:group</code></li> <li>Part 8 - Directives - <code class="inline">&lt;select bind:value /&gt;</code></li> <li>Part 9 - Spread props - <code class="inline">&lt;element {...props} /&gt;</code></li> <li>Part 10 - Svelte Components</li> <li>Part 11 - Svelte Context</li> <li>Part 12 - Slots</li> <li>Part 13 - Svelte Stores</li> <li>Part 14 - Svelte Motion</li> <li>Part 15 - Special elements</li> <li>Part 16 - Transitions</li> <li>Part 17 - Animations</li> <li>Part 18 - Lifecycles</li> <li>Part 19 - Module context</li> <li>Part 20 - Server-side Rendering</li> <li>Part 21 - Hydration</li></ul>';return{c(){e=u("section"),e.innerHTML=o,l=$(),i=u("section"),i.innerHTML=t},l(a){e=h(a,"SECTION",{"data-svelte-h":!0}),m(e)!=="svelte-1ggfxfx"&&(e.innerHTML=o),l=L(a),i=h(a,"SECTION",{"data-svelte-h":!0}),m(i)!=="svelte-1ivwe9y"&&(i.innerHTML=t)},m(a,s){r(a,e,s),r(a,l,s),r(a,i,s)},p:w,d(a){a&&(c(e),c(l),c(i))}}}function O(n){let e,o;const l=[n[0],v];let i={$$slots:{default:[I]},$$scope:{ctx:n}};for(let t=0;t<l.length;t+=1)i=d(i,l[t]);return e=new M({props:i}),{c(){y(e.$$.fragment)},l(t){P(e.$$.fragment,t)},m(t,a){x(e,t,a),o=!0},p(t,[a]){const s=a&1?T(l,[a&1&&g(t[0]),a&0&&g(v)]):{};a&2&&(s.$$scope={dirty:a,ctx:t}),e.$set(s)},i(t){o||(k(e.$$.fragment,t),o=!0)},o(t){C(e.$$.fragment,t),o=!1},d(t){H(e,t)}}}const v={title:"Compile Svelte in your head",date:"2020-10-05T08:00:00Z",tags:["Svelte","JavaScript"],series:"Compile Svelte in your head",label:"blog",description:"BackgroundA while ago, @swyx came back to Singapore and visited us in Shopee Singapore (We're hiring!).He gave an amazing sharing on Compile Svelte in Your Head (video) in the ReactKnowledgeable Originals...",tableOfContents:[{link:"background",title:"Background"},{link:"compile-svelte-in-your-head",title:"Compile Svelte in your Head"}]};function R(n,e,o){return _("blog",{image:B}),n.$$set=l=>{o(0,e=d(d({},e),p(l)))},e=p(e),[e]}class q extends S{constructor(e){super(),b(this,e,R,O,f,{})}}export{q as component};
