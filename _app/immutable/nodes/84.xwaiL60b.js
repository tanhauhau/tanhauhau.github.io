import{s as P,d as w,e as b,f as $,n as j}from"../chunks/scheduler.85ImRbsk.js";import{S as q,i as S,m as D,n as B,o as I,t as E,a as U,p as V,e as _,s as h,H as z,c as v,q as x,h as y,d as A,r as F,g as i,u as G,j as c}from"../chunks/index.JMRAb4ib.js";import{g as J,a as L}from"../chunks/code-snippet.p32Anx_S.js";import{B as K}from"../chunks/BlogLayout.TadBQAnB.js";import{t as N}from"../chunks/twitter-card-image.6izpPI6I.js";function O(u){let e,n='movie to gif via <code class="inline">ffmpeg</code>',a,o,t,r='<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">ffmpeg -i </span><span style="color: var(--shiki-token-keyword)">~</span><span style="color: var(--shiki-color-text)">/Desktop/darkmode.mov -filter_complex </span><span style="color: var(--shiki-token-string-expression)">&quot;[0:v] fps=40, setpts=0.5*PTS&quot;</span><span style="color: var(--shiki-color-text)"> -f gif </span><span style="color: var(--shiki-token-keyword)">~</span><span style="color: var(--shiki-color-text)">/Desktop/darkmode-2.gif</span></span></code></pre>',f,p,H=`<code class="inline">-i</code> specify input file
<code class="inline">-f</code> specify format
lastly sepcify output file`,g,m,C="extras:",k,d,T='<li><code class="inline">-ss</code> for seeking</li> <li><code class="inline">-filter_complex</code> to do filtering<ul><li><code class="inline">fps=40</code> control frame per second, more or less detail</li> <li><code class="inline">setpts=0.5*PTS</code> speed up the video <a href="https://trac.ffmpeg.org/wiki/How%20to%20speed%20up%20/%20slow%20down%20a%20video" rel="nofollow">reference</a></li></ul></li>';return{c(){e=_("p"),e.innerHTML=n,a=h(),o=_("div"),t=new z(!1),f=h(),p=_("p"),p.innerHTML=H,g=h(),m=_("p"),m.textContent=C,k=h(),d=_("ul"),d.innerHTML=T,this.h()},l(s){e=v(s,"P",{"data-svelte-h":!0}),x(e)!=="svelte-1f4nkvl"&&(e.innerHTML=n),a=y(s),o=v(s,"DIV",{class:!0});var l=A(o);t=F(l,!1),l.forEach(i),f=y(s),p=v(s,"P",{"data-svelte-h":!0}),x(p)!=="svelte-1juvcf1"&&(p.innerHTML=H),g=y(s),m=v(s,"P",{"data-svelte-h":!0}),x(m)!=="svelte-1ce0cfn"&&(m.textContent=C),k=y(s),d=v(s,"UL",{"data-svelte-h":!0}),x(d)!=="svelte-19tyfej"&&(d.innerHTML=T),this.h()},h(){t.a=null,G(o,"class","code-section")},m(s,l){c(s,e,l),c(s,a,l),c(s,o,l),t.m(r,o),c(s,f,l),c(s,p,l),c(s,g,l),c(s,m,l),c(s,k,l),c(s,d,l)},p:j,d(s){s&&(i(e),i(a),i(o),i(f),i(p),i(g),i(m),i(k),i(d))}}}function Q(u){let e,n;const a=[u[0],M];let o={$$slots:{default:[O]},$$scope:{ctx:u}};for(let t=0;t<a.length;t+=1)o=w(o,a[t]);return e=new K({props:o}),{c(){D(e.$$.fragment)},l(t){B(e.$$.fragment,t)},m(t,r){I(e,t,r),n=!0},p(t,[r]){const f=r&1?J(a,[r&1&&L(t[0]),r&0&&L(M)]):{};r&2&&(f.$$scope={dirty:r,ctx:t}),e.$set(f)},i(t){n||(E(e.$$.fragment,t),n=!0)},o(t){U(e.$$.fragment,t),n=!1},d(t){V(e,t)}}}const M={title:"Converting movie to gif",tags:["ffmpeg"],description:"movie to gif via `ffmpeg``-i` specify input file\n`-f` specify format\nlastly sepcify output fileextras:`-ss` for seeking`-filter_complex` to do filtering`fps=40` control frame per second, more or less detail..."};function R(u,e,n){return b("blog",{image:N}),u.$$set=a=>{n(0,e=w(w({},e),$(a)))},e=$(e),[e]}class te extends q{constructor(e){super(),S(this,e,R,Q,P,{})}}export{te as component};
