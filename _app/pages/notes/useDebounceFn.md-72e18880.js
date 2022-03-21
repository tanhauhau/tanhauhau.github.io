import{S as v,i as x,s as y,C as r,w as T,x as F,y as R,z as $,A as u,q as b,o as w,B as I,r as k,R as m,e as f,t as D,k as E,c as _,a as d,h as B,d as c,m as C,b as S,g as o,F as q,O as L}from"../../chunks/vendor-ea160616.js";import{B as M}from"../../chunks/BlogLayout-1be3dc1e.js";import{_ as j}from"../../chunks/twitter-card-image-a57df29d.js";import"../../chunks/stores-7d7fda0c.js";import"../../chunks/WebMentions-d768a574.js";/* empty css                                */function z(p){let s,t,l,e,n=`<pre class="prism language-"><code><span class="line">import * as React from &#39;react&#39;;</span>
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
<span class="line">&#125;</span></code></pre>`;return{c(){s=f("p"),t=D("is this the right way of doing it? :thinking:"),l=E(),e=f("div"),this.h()},l(a){s=_(a,"P",{});var i=d(s);t=B(i,"is this the right way of doing it? :thinking:"),i.forEach(c),l=C(a),e=_(a,"DIV",{class:!0});var h=d(e);h.forEach(c),this.h()},h(){S(e,"class","code-section")},m(a,i){o(a,s,i),q(s,t),o(a,l,i),o(a,e,i),e.innerHTML=n},p:L,d(a){a&&c(s),a&&c(l),a&&c(e)}}}function A(p){let s,t;const l=[p[0],g];let e={$$slots:{default:[z]},$$scope:{ctx:p}};for(let n=0;n<l.length;n+=1)e=r(e,l[n]);return s=new M({props:e}),{c(){T(s.$$.fragment)},l(n){F(s.$$.fragment,n)},m(n,a){R(s,n,a),t=!0},p(n,[a]){const i=a&1?$(l,[a&1&&u(n[0]),a&0&&u(g)]):{};a&2&&(i.$$scope={dirty:a,ctx:n}),s.$set(i)},i(n){t||(b(s.$$.fragment,n),t=!0)},o(n){w(s.$$.fragment,n),t=!1},d(n){I(s,n)}}}const g={title:"useDebounceFn",tags:["react","hooks"]};function H(p,s,t){return k("blog",{image:j}),p.$$set=l=>{t(0,s=r(r({},s),m(l)))},s=m(s),[s]}class G extends v{constructor(s){super();x(this,s,H,A,y,{})}}export{G as default,g as metadata};
