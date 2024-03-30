import{s as G,d as $,e as I,f as T,n as j}from"../chunks/scheduler.85ImRbsk.js";import{S as B,i as S,m as U,n as D,o as F,t as V,a as z,p as A,e as _,s as k,b as J,H as K,c as f,q as y,h as b,d as C,f as N,r as O,g as r,u as Q,j as u,k as w}from"../chunks/index.JMRAb4ib.js";import{g as R,a as M}from"../chunks/code-snippet.p32Anx_S.js";import{B as W}from"../chunks/BlogLayout.TadBQAnB.js";import{t as X}from"../chunks/twitter-card-image.6izpPI6I.js";function Y(h){let e,i='Puppeteer <a href="https://github.com/GoogleChrome/puppeteer" rel="nofollow">https://github.com/GoogleChrome/puppeteer</a>',o,l,t,a,p,d,E='<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-constant)">puppeteer</span><span style="color: var(--shiki-token-function)">.launch</span><span style="color: var(--shiki-color-text)">(&#123; args</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> [</span><span style="color: var(--shiki-token-string-expression)">&#39;--remote-debugging-port=12345&#39;</span><span style="color: var(--shiki-color-text)">] &#125;)</span></span></code></pre>',g,c,L="Chrome flags:",v,m,H='<li><a href="https://peter.sh/experiments/chromium-command-line-switches/" rel="nofollow">https://peter.sh/experiments/chromium-command-line-switches/</a></li>';return{c(){e=_("p"),e.innerHTML=i,o=k(),l=_("ul"),t=_("li"),a=J("set custom debugging port"),p=_("div"),d=new K(!1),g=k(),c=_("p"),c.textContent=L,v=k(),m=_("ul"),m.innerHTML=H,this.h()},l(s){e=f(s,"P",{"data-svelte-h":!0}),y(e)!=="svelte-1q54fbt"&&(e.innerHTML=i),o=b(s),l=f(s,"UL",{});var n=C(l);t=f(n,"LI",{});var x=C(t);a=N(x,"set custom debugging port"),p=f(x,"DIV",{class:!0});var P=C(p);d=O(P,!1),P.forEach(r),x.forEach(r),n.forEach(r),g=b(s),c=f(s,"P",{"data-svelte-h":!0}),y(c)!=="svelte-18evahl"&&(c.textContent=L),v=b(s),m=f(s,"UL",{"data-svelte-h":!0}),y(m)!=="svelte-t7vyre"&&(m.innerHTML=H),this.h()},h(){d.a=null,Q(p,"class","code-section")},m(s,n){u(s,e,n),u(s,o,n),u(s,l,n),w(l,t),w(t,a),w(t,p),d.m(E,p),u(s,g,n),u(s,c,n),u(s,v,n),u(s,m,n)},p:j,d(s){s&&(r(e),r(o),r(l),r(g),r(c),r(v),r(m))}}}function Z(h){let e,i;const o=[h[0],q];let l={$$slots:{default:[Y]},$$scope:{ctx:h}};for(let t=0;t<o.length;t+=1)l=$(l,o[t]);return e=new W({props:l}),{c(){U(e.$$.fragment)},l(t){D(e.$$.fragment,t)},m(t,a){F(e,t,a),i=!0},p(t,[a]){const p=a&1?R(o,[a&1&&M(t[0]),a&0&&M(q)]):{};a&2&&(p.$$scope={dirty:a,ctx:t}),e.$set(p)},i(t){i||(V(e.$$.fragment,t),i=!0)},o(t){z(e.$$.fragment,t),i=!1},d(t){A(e,t)}}}const q={title:"Custom Flags with Puppeteer",tags:["puppeteer"],description:"Puppeteer https://github.com/GoogleChrome/puppeteerset custom debugging portChrome flags: https://peter.sh/experiments/chromium-command-line-switches/..."};function ee(h,e,i){return I("blog",{image:X}),h.$$set=o=>{i(0,e=$($({},e),T(o)))},e=T(e),[e]}class ne extends B{constructor(e){super(),S(this,e,ee,Z,G,{})}}export{ne as component};
