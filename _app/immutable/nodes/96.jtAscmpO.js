import{s as pn,d as B,e as on,f as Z,n as ln}from"../chunks/scheduler.85ImRbsk.js";import{S as cn,i as un,m as kn,n as rn,o as dn,t as vn,a as mn,p as gn,e as i,s as r,H as S,c as u,d as j,q as x,h as d,r as q,g as k,u as b,j as T,k as t}from"../chunks/index.JMRAb4ib.js";import{g as yn,a as nn}from"../chunks/code-snippet.p32Anx_S.js";import{B as fn}from"../chunks/BlogLayout.TadBQAnB.js";import{t as _n}from"../chunks/twitter-card-image.6izpPI6I.js";function wn(f){let n,e,v='<a href="#lazy-loading-svelte-component" id="lazy-loading-svelte-component">Lazy Loading Svelte component</a>',m,s,o,H='<pre class="prism language-svelte"><code><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript"></div><div class="line">	<span class="token keyword">let</span> lazyComponent<span class="token punctuation">;</span></div><div class="line"></div><div class="line">	<span class="token keyword">function</span> <span class="token function">load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></div><div class="line">		lazyComponent <span class="token operator">=</span> <span class="token keyword">import</span><span class="token punctuation">(</span><span class="token template-string"><span class="token template-punctuation string">&#96;</span><span class="token string">./LazyComponent.svelte</span><span class="token template-punctuation string">&#96;</span></span><span class="token punctuation">)</span><span class="token punctuation">;</span></div><div class="line">	<span class="token punctuation">&#125;</span></div><div class="line">	<span class="token keyword">let</span> count <span class="token operator">=</span> <span class="token number">0</span><span class="token punctuation">;</span></div><div class="line"></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></div><div class="line"></div><div class="line"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> lazyComponent<span class="token punctuation">&#125;</span></span></div><div class="line">	<span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">await</span> lazyComponent then <span class="token punctuation">&#123;</span> <span class="token keyword">default</span><span class="token operator">:</span> LazyComponent <span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span></div><div class="line">		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>LazyComponent</span> <span class="token language-javascript"><span class="token punctuation">&#123;</span>count<span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line">	<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">await</span><span class="token punctuation">&#125;</span></span></div><div class="line"><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></div><div class="line"></div><div class="line"></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">on:</span>click=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>load<span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>Load<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">on:</span>click=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> count <span class="token operator">++</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>Increment<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span></div></code></pre>',N,_,E,an='<pre class="prism language-svelte"><code><div class="line"><span class="token comment">&lt;!-- LazyComponent.svelte --></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript"></div><div class="line">	<span class="token keyword">export</span> <span class="token keyword">let</span> count<span class="token punctuation">;</span></div><div class="line"></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></div><div class="line"></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>strong</span><span class="token punctuation">></span></span><span class="token language-javascript"><span class="token punctuation">&#123;</span>count<span class="token punctuation">&#125;</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>strong</span><span class="token punctuation">></span></span></div></code></pre>',M,g,P='<h3><a href="#notes" id="notes">Notes</a></h3> <ul><li>For rollup users, dynamic imports only supported in the following output formats:<ul><li>esm</li> <li>amd</li> <li>systemjs</li></ul></li></ul>',I,a,w,J='<a href="#dynamic-lazy-component" id="dynamic-lazy-component">Dynamic Lazy Component</a>',O,y,K='<p lang="en" dir="ltr">This is great! I tried turning lazy loading into its own component, but got burned by dynamic imports of variables. Any thoughts on how this could work? <a href="https://t.co/yCDadJYFqf">pic.twitter.com/yCDadJYFqf</a></p>— sean mullen (@srmullen) <a href="https://twitter.com/srmullen/status/1293549224676777984?ref_src=twsrc%5Etfw">August 12, 2020</a>',F,h,Q='You can&#39;t use dynamic expressions for <code class="inline">import()</code> in rollup.',V,L,U="A better approach for dynamic lazy component would be passing in a function that will return a dynamic component",Y,C,$,tn=`<pre class="prism language-svelte"><code><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript"></div><div class="line">	<span class="token keyword">import</span> LazyComponent <span class="token keyword">from</span> <span class="token string">'./LazyComponent.svelte'</span><span class="token punctuation">;</span></div><div class="line">	<span class="token keyword">let</span> load <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span></div><div class="line"></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></div><div class="line"></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>LazyComponent</span> </div><div class="line">	<span class="token attr-name">when=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span>load<span class="token punctuation">&#125;</span></span></div><div class="line">	<span class="token attr-name">component=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token keyword">import</span><span class="token punctuation">(</span><span class="token string">'./LoadMeLikeLazy.svelte'</span><span class="token punctuation">)</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>button</span> <span class="token attr-name"><span class="token namespace">on:</span>click=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token operator">=></span> <span class="token punctuation">&#123;</span> load <span class="token operator">=</span> <span class="token boolean">true</span><span class="token punctuation">;</span> <span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span><span class="token punctuation">></span></span>Load<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>button</span><span class="token punctuation">></span></span></div></code></pre>`,A,z,D,en='<pre class="prism language-svelte"><code><div class="line"><span class="token comment">&lt;!-- filename: LazyComponent.svelte --></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript"></div><div class="line">	<span class="token keyword">export</span> <span class="token keyword">let</span> when <span class="token operator">=</span> <span class="token boolean">false</span><span class="token punctuation">;</span></div><div class="line">	<span class="token keyword">export</span> <span class="token keyword">let</span> component<span class="token punctuation">;</span></div><div class="line"></div><div class="line">	<span class="token keyword">let</span> loading<span class="token punctuation">;</span></div><div class="line"></div><div class="line">	<span class="token literal-property property">$</span><span class="token operator">:</span> <span class="token keyword">if</span> <span class="token punctuation">(</span>when<span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></div><div class="line">		<span class="token function">load</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></div><div class="line">	<span class="token punctuation">&#125;</span></div><div class="line"></div><div class="line">	<span class="token keyword">function</span> <span class="token function">load</span><span class="token punctuation">(</span><span class="token punctuation">)</span> <span class="token punctuation">&#123;</span></div><div class="line">		loading <span class="token operator">=</span> <span class="token function">component</span><span class="token punctuation">(</span><span class="token punctuation">)</span><span class="token punctuation">;</span></div><div class="line">	<span class="token punctuation">&#125;</span></div><div class="line"></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></div><div class="line"><span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">if</span> when<span class="token punctuation">&#125;</span></span></div><div class="line">	<span class="token language-javascript"><span class="token punctuation">&#123;</span>#<span class="token keyword">await</span> loading then <span class="token punctuation">&#123;</span> <span class="token keyword">default</span><span class="token operator">:</span> Component <span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span></div><div class="line">		<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>Component</span> <span class="token punctuation">/></span></span></div><div class="line">	<span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">await</span><span class="token punctuation">&#125;</span></span></div><div class="line"><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token operator">/</span><span class="token keyword">if</span><span class="token punctuation">&#125;</span></span></div></code></pre>';return{c(){n=i("section"),e=i("h2"),e.innerHTML=v,m=r(),s=i("div"),o=new S(!1),N=r(),_=i("div"),E=new S(!1),M=r(),g=i("section"),g.innerHTML=P,I=r(),a=i("section"),w=i("h2"),w.innerHTML=J,O=r(),y=i("blockquote"),y.innerHTML=K,F=r(),h=i("p"),h.innerHTML=Q,V=r(),L=i("p"),L.textContent=U,Y=r(),C=i("div"),$=new S(!1),A=r(),z=i("div"),D=new S(!1),this.h()},l(p){n=u(p,"SECTION",{});var l=j(n);e=u(l,"H2",{"data-svelte-h":!0}),x(e)!=="svelte-1t7ysw0"&&(e.innerHTML=v),m=d(l),s=u(l,"DIV",{class:!0});var G=j(s);o=q(G,!1),G.forEach(k),N=d(l),_=u(l,"DIV",{class:!0});var R=j(_);E=q(R,!1),R.forEach(k),l.forEach(k),M=d(p),g=u(p,"SECTION",{"data-svelte-h":!0}),x(g)!=="svelte-zhonx1"&&(g.innerHTML=P),I=d(p),a=u(p,"SECTION",{});var c=j(a);w=u(c,"H2",{"data-svelte-h":!0}),x(w)!=="svelte-1yzjsdm"&&(w.innerHTML=J),O=d(c),y=u(c,"BLOCKQUOTE",{class:!0,"data-svelte-h":!0}),x(y)!=="svelte-dkng7i"&&(y.innerHTML=K),F=d(c),h=u(c,"P",{"data-svelte-h":!0}),x(h)!=="svelte-127xkro"&&(h.innerHTML=Q),V=d(c),L=u(c,"P",{"data-svelte-h":!0}),x(L)!=="svelte-18rj047"&&(L.textContent=U),Y=d(c),C=u(c,"DIV",{class:!0});var W=j(C);$=q(W,!1),W.forEach(k),A=d(c),z=u(c,"DIV",{class:!0});var X=j(z);D=q(X,!1),X.forEach(k),c.forEach(k),this.h()},h(){o.a=null,b(s,"class","code-section"),E.a=null,b(_,"class","code-section"),b(y,"class","twitter-tweet"),$.a=null,b(C,"class","code-section"),D.a=null,b(z,"class","code-section")},m(p,l){T(p,n,l),t(n,e),t(n,m),t(n,s),o.m(H,s),t(n,N),t(n,_),E.m(an,_),T(p,M,l),T(p,g,l),T(p,I,l),T(p,a,l),t(a,w),t(a,O),t(a,y),t(a,F),t(a,h),t(a,V),t(a,L),t(a,Y),t(a,C),$.m(tn,C),t(a,A),t(a,z),D.m(en,z)},p:ln,d(p){p&&(k(n),k(M),k(g),k(I),k(a))}}}function hn(f){let n,e;const v=[f[0],sn];let m={$$slots:{default:[wn]},$$scope:{ctx:f}};for(let s=0;s<v.length;s+=1)m=B(m,v[s]);return n=new fn({props:m}),{c(){kn(n.$$.fragment)},l(s){rn(n.$$.fragment,s)},m(s,o){dn(n,s,o),e=!0},p(s,[o]){const H=o&1?yn(v,[o&1&&nn(s[0]),o&0&&nn(sn)]):{};o&2&&(H.$$scope={dirty:o,ctx:s}),n.$set(H)},i(s){e||(vn(n.$$.fragment,s),e=!0)},o(s){mn(n.$$.fragment,s),e=!1},d(s){gn(n,s)}}}const sn={title:"Lazy Loading Svelte component",tags:["lazy load","svelte"],description:"Lazy Loading Svelte componentNotesFor rollup users, dynamic imports only supported in the following output formats:esmamdsystemjsDynamic Lazy ComponentYou can't use dynamic expressions for `import()` in rollup....",tableOfContents:[{link:"lazy-loading-svelte-component",title:"Lazy Loading Svelte component",nested:[{link:"notes",title:"Notes"}]},{link:"dynamic-lazy-component",title:"Dynamic Lazy Component"}]};function Ln(f,n,e){return on("blog",{image:_n}),f.$$set=v=>{e(0,n=B(B({},n),Z(v)))},n=Z(n),[n]}class Tn extends cn{constructor(n){super(),un(this,n,Ln,hn,pn,{})}}export{Tn as component};
