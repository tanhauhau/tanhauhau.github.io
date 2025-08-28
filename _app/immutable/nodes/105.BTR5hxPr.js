import"../chunks/Bzak7iHL.js";import"../chunks/kfVmCPsV.js";import{p as c,g as r,d as o,b as g,s as m,f as u,a as d,e as f,r as h}from"../chunks/C2PHntuy.js";import{h as y}from"../chunks/C3QlhiH-.js";import{i as _}from"../chunks/BQOOHHT8.js";import{l as $,s as v}from"../chunks/gzNpScmH.js";import{B as T}from"../chunks/B1caYEk9.js";import{t as R}from"../chunks/C3bQ3Oc7.js";const e={title:"useDebounceFn",tags:["react","hooks"],description:"is this the right way of doing it? :thinking:..."},{title:C,tags:J,description:L}=e;var F=g('<p>is this the right way of doing it? :thinking:</p> <div class="code-section"><!></div>',1);function M(t,s){const l=$(s,["children","$$slots","$$events","$$legacy"]);c(s,!1),r("blog",{image:R}),_(),T(t,v(()=>l,()=>e,{children:(i,b)=>{var a=F(),n=m(u(a),2),p=f(n);y(p,()=>`<pre class="prism language-"><code><span class="line">import * as React from &#39;react&#39;;</span>
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
<span class="line">&#125;</span></code></pre>`),h(n),d(i,a)},$$slots:{default:!0}})),o()}export{M as component};
