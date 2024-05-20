import{s as h,d as u,e as v,f as m,n as x}from"../chunks/scheduler.85ImRbsk.js";import{S as y,i as T,m as $,n as R,o as F,t as w,a as I,p as b,e as g,s as C,H as j,c as f,q as k,h as D,d as E,r as H,g as o,u as S,j as r}from"../chunks/index.JMRAb4ib.js";import{g as q,a as d}from"../chunks/code-snippet.p32Anx_S.js";import{B}from"../chunks/BlogLayout.n3Egsk1p.js";import{t as P}from"../chunks/twitter-card-image.6izpPI6I.js";function z(c){let s,l="is this the right way of doing it? :thinking:",t,n,a,i=`<pre class="prism language-"><code><span class="line">import * as React from &#39;react&#39;;</span>
<span class="line"></span>
<span class="line">export default function useDebounceFn&lt;T extends (...args: any) =&gt; void&gt;(fn: T, delay: number): T &#123;</span>
<span class="line">  const timeoutId = React.useRef&lt;NodeJS.Timeout&gt;();</span>
<span class="line">  const originalFn = React.useRef&lt;T&gt;();</span>
<span class="line"></span>
<span class="line">  React.useEffect(() =&gt; &#123;</span>
<span class="line">    originalFn.current = fn;</span>
<span class="line">    () =&gt; &#123;</span>
<span class="line">      originalFn.current = null;</span>
<span class="line">    &#125;;</span>
<span class="line">  &#125;, [fn]);</span>
<span class="line"></span>
<span class="line">  React.useEffect(() =&gt; &#123;</span>
<span class="line">    return () =&gt; &#123;</span>
<span class="line">      clearTimeout(timeoutId.current);</span>
<span class="line">    &#125;;</span>
<span class="line">  &#125;, []);</span>
<span class="line"></span>
<span class="line">  return React.useMemo&lt;T&gt;(</span>
<span class="line">    () =&gt; (...args: any) =&gt; &#123;</span>
<span class="line">      clearTimeout(timeoutId.current);</span>
<span class="line"></span>
<span class="line">      timeoutId.current = setTimeout(() =&gt; &#123;</span>
<span class="line">        if (originalFn.current) &#123;</span>
<span class="line">          originalFn.current(...args);</span>
<span class="line">        &#125;</span>
<span class="line">      &#125;, delay);</span>
<span class="line">    &#125;,</span>
<span class="line">    [delay]</span>
<span class="line">  );</span>
<span class="line">&#125;</span></code></pre>`;return{c(){s=g("p"),s.textContent=l,t=C(),n=g("div"),a=new j(!1),this.h()},l(e){s=f(e,"P",{"data-svelte-h":!0}),k(s)!=="svelte-zvoj32"&&(s.textContent=l),t=D(e),n=f(e,"DIV",{class:!0});var p=E(n);a=H(p,!1),p.forEach(o),this.h()},h(){a.a=null,S(n,"class","code-section")},m(e,p){r(e,s,p),r(e,t,p),r(e,n,p),a.m(i,n)},p:x,d(e){e&&(o(s),o(t),o(n))}}}function J(c){let s,l;const t=[c[0],_];let n={$$slots:{default:[z]},$$scope:{ctx:c}};for(let a=0;a<t.length;a+=1)n=u(n,t[a]);return s=new B({props:n}),{c(){$(s.$$.fragment)},l(a){R(s.$$.fragment,a)},m(a,i){F(s,a,i),l=!0},p(a,[i]){const e=i&1?q(t,[i&1&&d(a[0]),i&0&&d(_)]):{};i&2&&(e.$$scope={dirty:i,ctx:a}),s.$set(e)},i(a){l||(w(s.$$.fragment,a),l=!0)},o(a){I(s.$$.fragment,a),l=!1},d(a){b(s,a)}}}const _={title:"useDebounceFn",tags:["react","hooks"],description:"is this the right way of doing it? :thinking:..."};function L(c,s,l){return v("blog",{image:P}),c.$$set=t=>{l(0,s=u(u({},s),m(t)))},s=m(s),[s]}class K extends y{constructor(s){super(),T(this,s,L,J,h,{})}}export{K as component};
