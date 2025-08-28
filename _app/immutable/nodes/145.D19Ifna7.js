import"../chunks/Bzak7iHL.js";import"../chunks/kfVmCPsV.js";import{l as z,s as I,p as Es}from"../chunks/gzNpScmH.js";import{S as Ls,a as Fs}from"../chunks/D1NQBkEP.js";import{b4 as Ds,aN as Ms,G as As,k as Hs,b8 as Gs,b6 as Js,p as J,b as x,f as U,s as c,a as $,d as R,a5 as n,al as S,ab as D,a7 as O,e as _,r as f,t as N,n as tn,b9 as W,ba as sn,q as Hn,ar as Gn,bb as Rs,bc as Us}from"../chunks/C2PHntuy.js";import{e as dn,s as vn}from"../chunks/F79hK6eD.js";import{i as an}from"../chunks/mnCOdu-q.js";import{t as Y,s as Jn,b as Bs,a as Ns,c as Ws,f as bn}from"../chunks/BKJY_Hxi.js";import{b as M,a as jn,q as Rn,p as Un,c as Vs,d as Ys,e as Ks,f as Zs,g as Qs,h as nt,i as st,j as tt,k as at,l as et,m as H,n as ot}from"../chunks/C7Qkfjgs.js";import{B as q}from"../chunks/B1caYEk9.js";import{s as nn,r as en}from"../chunks/CEusTUg_.js";import{s as C}from"../chunks/DwHwQPD1.js";import{e as Bn,i as Nn}from"../chunks/pHDcyWD2.js";import{a as E,h as K}from"../chunks/C3QlhiH-.js";import{i as rn}from"../chunks/BQOOHHT8.js";import{a as it,o as rt}from"../chunks/D8xCbML1.js";import{s as Wn}from"../chunks/DnM2s-CZ.js";import{b as wn,a as Vn,P as lt}from"../chunks/CCUOd8XA.js";import{b as Yn}from"../chunks/BQPykor9.js";function Kn(e,t,r=!1){if(e.multiple){if(t==null)return;if(!Hs(t))return Gs();for(var s of e.options)s.selected=t.includes(on(s));return}for(s of e.options){var o=on(s);if(Js(o,t)){s.selected=!0;return}}(!r||t!==void 0)&&(e.selectedIndex=-1)}function ct(e){var t=new MutationObserver(()=>{Kn(e,e.__value)});t.observe(e,{childList:!0,subtree:!0,attributes:!0,attributeFilter:["value"]}),As(()=>{t.disconnect()})}function pt(e,t,r=t){var s=!0;Ds(e,"change",o=>{var a=o?"[selected]":":checked",i;if(e.multiple)i=[].map.call(e.querySelectorAll(a),on);else{var p=e.querySelector(a)??e.querySelector("option:not([disabled])");i=p&&on(p)}r(i)}),Ms(()=>{var o=t();if(Kn(e,o,s),s&&o===void 0){var a=e.querySelector(":checked");a!==null&&(o=on(a),r(o))}e.__value=o,s=!1}),ct(e)}function on(e){return"__value"in e?e.__value:e.value}const Zn={description:"..."},{description:ke}=Zn;var dt=x('<h1 class="svelte-kb1uhf">🚀 Demystifying Transitions</h1>'),vt=x('<button class="svelte-kb1uhf">Click Me</button>'),kt=x("<!> <!>",1);function ut(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);let s=S(0);function o(p,u){return{delay:u.delay,duration:u.duration,easing:u.easing,css(d,k){return`transform: translateX(-50%) translateY(${k*u.y}px) scale(${d})`}}}function a(){return n(s)===2?!1:(D(s),!0)}function i(){return n(s)===0?!1:(D(s,-1),!0)}return q(e,I(()=>r,()=>Zn,{children:(p,u)=>{var d=kt(),k=U(d);{var l=v=>{var b=dt();Y(3,b,()=>Jn,()=>({easing:jn,duration:3e3,delay:900})),$(v,b)};an(k,v=>{n(s)===2&&v(l)})}var y=c(k,2);{var X=v=>{var b=vt();Y(1,b,()=>Jn,()=>({easing:Rn})),Y(2,b,()=>o,()=>({easing:jn,duration:1200,y:-200})),dn("click",b,()=>O(s,2)),$(v,b)};an(y,v=>{n(s)===1&&v(X)})}$(p,d)},$$slots:{default:!0}})),M(t,"next",a),M(t,"prev",i),R({next:a,prev:i})}const Qn={description:"..."},{description:ue}=Qn;var ht=x('<div class="actual svelte-1h90ifj">🚴‍♂️  Level 1️⃣  - Using <code>transition:</code></div>'),yt=x('<div class="actual svelte-1h90ifj">🚗  Level 2️⃣  - The <code>transition:</code> contract</div>'),mt=x('<div class="actual svelte-1h90ifj">🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head</div>'),ft=x('<div class="container svelte-1h90ifj"><div class="svelte-1h90ifj"><div class="placeholder svelte-1h90ifj">🚴‍♂️  Level 1️⃣  - Using <code>transition:</code></div> <!></div> <div class="svelte-1h90ifj"><div class="placeholder svelte-1h90ifj">🚗  Level 2️⃣  - The <code>transition:</code> contract</div> <!></div> <div class="svelte-1h90ifj"><div class="placeholder svelte-1h90ifj">🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head</div> <!></div></div>');function _t(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);let s=S(0);function o(){return n(s)===3?!1:(D(s),!0)}function a(){return n(s)===0?!1:(D(s,-1),!0)}return q(e,I(()=>r,()=>Qn,{children:(i,p)=>{var u=ft(),d=_(u),k=c(_(d),2);{var l=m=>{var w=ht();Y(3,w,()=>Bs),$(m,w)};an(k,m=>{n(s)>=1&&m(l)})}f(d);var y=c(d,2),X=c(_(y),2);{var v=m=>{var w=yt();Y(3,w,()=>Ns),$(m,w)};an(X,m=>{n(s)>=2&&m(v)})}f(y);var b=c(y,2),P=c(_(b),2);{var T=m=>{var w=mt();Y(3,w,()=>Ws,()=>({y:30})),$(m,w)};an(P,m=>{n(s)>=3&&m(T)})}f(b),f(u),$(i,u)},$$slots:{default:!0}})),M(t,"next",o),M(t,"prev",a),R({next:o,prev:a})}const $t=""+new URL("../assets/profile-pic.2jGJ8N0y.png",import.meta.url).href,xt=""+new URL("../assets/penang-rojak.DbNpa3oV.jpg",import.meta.url).href,gt=""+new URL("../assets/koay-teow.DjKbkHoW.jpg",import.meta.url).href,ns={description:"@lihautan👨🏻‍💻 Frontend engineer at Shopee Singapore🇲🇾 Grew up in Penang, Malaysia🛠 Svelte Maintainer..."},{description:he}=ns;var bt=x('<img alt="profile" class="svelte-1l0c6ie"/> <p class="svelte-1l0c6ie">@lihautan</p> <ul class="svelte-1l0c6ie"><li>👨🏻‍💻 Frontend engineer at Shopee Singapore</li> <li>🇲🇾 Grew up in Penang, Malaysia</li> <li>🛠 Svelte Maintainer</li></ul> <div><img alt="char koay teow" class="svelte-1l0c6ie"/> <div>Image credit: sidechef.com</div></div> <div><img alt="rojak" class="svelte-1l0c6ie"/> <div>Image credit: tripadvisor.com</div></div>',1);function wt(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);let s=S(0);function o(){return n(s)===3?!1:(D(s),!0)}function a(){return n(s)===0?!1:(D(s,-1),!0)}return q(e,I(()=>r,()=>ns,{children:(i,p)=>{var u=bt(),d=U(u),k=c(d,6);let l;var y=_(k);tn(2),f(k);var X=c(k,2);let v;var b=_(X);tn(2),f(X),N((P,T)=>{nn(d,"src",$t),l=C(k,1,"ckt svelte-1l0c6ie",null,l,P),nn(y,"src",gt),v=C(X,1,"rojak svelte-1l0c6ie",null,v,T),nn(b,"src",xt)},[()=>({hidden:n(s)<1||n(s)>=3}),()=>({hidden:n(s)<2||n(s)>=3})]),$(i,u)},$$slots:{default:!0}})),M(t,"next",o),M(t,"prev",a),R({next:o,prev:a})}const ss={description:"🚴‍♂️ 1️⃣  Using `transition:`..."},{description:ye}=ss;var jt=x('<div class="svelte-11o4zfu"><h1 class="svelte-11o4zfu">🚴‍♂️ 1️⃣  Using <code class="inline">transition:</code></h1></div>');function St(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>ss,{children:(s,o)=>{var a=jt();$(s,a)},$$slots:{default:!0}}))}const Xt=`{#each items as item}
  <div>{item}</div>
{/each}`,zt=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div>{item}</div>
{/each}`,It=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div in:fade>{item}</div>
{/each}`,Tt=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div in:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,qt=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div out:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,Ot=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div transition:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,ts={description:"..."},{description:me}=ts;var Pt=x("<div> </div>"),Ct=x('<div class="container svelte-zwzan3"><div class="code"></div> <div><button>Add</button> <button>Remove</button> <!></div></div>');function Et(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);const s=S();let o=S(0);const a=[Xt,zt,It,Tt,qt,Ot],i=a.length-1;function p(){return n(o)<i&&D(o)<i}function u(){return n(o)>0&&D(o,-1)>0}let d=S(["a","b"]);function k(){O(d,[...n(d),String.fromCharCode(97+n(d).length)])}function l(){O(d,n(d).slice(0,-1))}function y(v){return function(){return n(o)===2?bn(v,{}):n(o)===3||n(o)===5?bn(v,{duration:4e3,delay:500}):{duration:0}}}function X(v){return function(){return n(o)===4||n(o)===5?bn(v,{duration:4e3,delay:500}):{duration:0}}}return W(()=>n(o),()=>{O(s,a[n(o)])}),sn(),rn(),q(e,I(()=>r,()=>ts,{children:(v,b)=>{var P=Ct(),T=_(P);E(T,(B,F)=>{var A;return(A=Un)==null?void 0:A(B,F)},()=>n(s));var m=c(T,2),w=_(m),L=c(w,2),G=c(L,2);Bn(G,1,()=>n(d),Nn,(B,F)=>{var A=Pt(),Z=_(A,!0);f(A),N(()=>vn(Z,n(F))),Y(1,A,()=>y),Y(2,A,()=>X),$(B,A)}),f(m),f(P),dn("click",w,k),dn("click",L,l),$(v,P)},$$slots:{default:!0}})),M(t,"next",p),M(t,"prev",u),R({next:p,prev:u})}const as={description:"..."},{description:fe}=as;var Lt=x('<div class="container svelte-l83dwf"><div class="code-section"><!></div></div>');function Ft(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>as,{children:(s,o)=>{var a=Lt(),i=_(a),p=_(i);K(p,()=>`<pre class="prism language-svelte"><code><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript"></div><div class="line">  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> fly<span class="token punctuation">,</span> slide<span class="token punctuation">,</span> scale<span class="token punctuation">,</span> blur <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span><span class="token punctuation">;</span></div><div class="line"></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></div><div class="line"></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>fly=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">x</span><span class="token operator">:</span> <span class="token number">50</span><span class="token punctuation">,</span> <span class="token literal-property property">y</span><span class="token operator">:</span><span class="token number">50</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>slide</span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>scale=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">start</span><span class="token operator">:</span> <span class="token number">0.5</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>blur=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">amount</span><span class="token operator">:</span> <span class="token number">2</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div></code></pre>`),f(i),f(a),$(s,a)},$$slots:{default:!0}}))}const es={description:"https://svelte.dev/docs#svelte_transitionhttps://svelte.dev/tutorial/transition..."},{description:_e}=es;var Dt=x('<div class="svelte-h8tvqg"><ul class="svelte-h8tvqg"><li class="svelte-h8tvqg"><a href="https://svelte.dev/docs#svelte_transition" rel="nofollow">https://svelte.dev/docs#svelte_transition</a></li> <li class="svelte-h8tvqg"><a href="https://svelte.dev/tutorial/transition" rel="nofollow">https://svelte.dev/tutorial/transition</a></li></ul></div>');function Mt(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>es,{children:(s,o)=>{var a=Dt();$(s,a)},$$slots:{default:!0}}))}const os={description:"🚗 2️⃣  The `transition:` contract..."},{description:$e}=os;var At=x('<div class="svelte-11o4zfu"><h1 class="svelte-11o4zfu">🚗 2️⃣  The <code class="inline">transition:</code> contract</h1></div>');function Ht(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>os,{children:(s,o)=>{var a=At();$(s,a)},$$slots:{default:!0}}))}const is={description:"The `transition:` contract..."},{description:xe}=is;var Gt=x('<h2>The <code class="inline">transition:</code> contract</h2> <div class="code-section"><!></div>',1);function Jt(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>is,{children:(s,o)=>{var a=Gt(),i=c(U(a),2),p=_(i);K(p,()=>`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    delay</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">0</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// delay in ms</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    duration</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">300</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// duration in ms</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    easing</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> linear</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// easing function</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    </span><span style="color: var(--shiki-token-function)">css</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> (t</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> u) </span><span style="color: var(--shiki-token-keyword)">=&gt;</span><span style="color: var(--shiki-color-text)"> &#123; </span><span style="color: var(--shiki-token-comment)">// css transition</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-string-expression)">&#96;transform: translateX(</span><span style="color: var(--shiki-token-keyword)">$&#123;</span><span style="color: var(--shiki-color-text)">t </span><span style="color: var(--shiki-token-keyword)">*</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">100</span><span style="color: var(--shiki-token-keyword)">&#125;</span><span style="color: var(--shiki-token-string-expression)">px)&#96;</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    &#125;</span><span style="color: var(--shiki-token-punctuation)">,</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    </span><span style="color: var(--shiki-token-function)">tick</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> (t</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> u) </span><span style="color: var(--shiki-token-keyword)">=&gt;</span><span style="color: var(--shiki-color-text)"> &#123; </span><span style="color: var(--shiki-token-comment)">// callback</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      </span><span style="color: var(--shiki-token-constant)">node</span><span style="color: var(--shiki-color-text)">.</span><span style="color: var(--shiki-token-constant)">styles</span><span style="color: var(--shiki-color-text)">.color </span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">getColor</span><span style="color: var(--shiki-color-text)">(t);</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    &#125;</span><span style="color: var(--shiki-token-punctuation)">,</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  &#125;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`),f(i),$(s,a)},$$slots:{default:!0}}))}const rs={description:"The `transition:` contract..."},{description:ge}=rs;var Rt=x('<h2>The <code class="inline">transition:</code> contract</h2> <div class="code-section"><!></div>',1);function Ut(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>rs,{children:(s,o)=>{var a=Rt(),i=c(U(a),2),p=_(i);K(p,()=>`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> () &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      delay</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">0</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// delay in ms</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      duration</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">300</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// duration in ms</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      easing</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> linear</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// easing function</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      </span><span style="color: var(--shiki-token-function)">css</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> (t</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> u) </span><span style="color: var(--shiki-token-keyword)">=&gt;</span><span style="color: var(--shiki-color-text)"> &#123; </span><span style="color: var(--shiki-token-comment)">// css transition</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">        </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-string-expression)">&#96;transform: translateX(</span><span style="color: var(--shiki-token-keyword)">$&#123;</span><span style="color: var(--shiki-color-text)">t </span><span style="color: var(--shiki-token-keyword)">*</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">100</span><span style="color: var(--shiki-token-keyword)">&#125;</span><span style="color: var(--shiki-token-string-expression)">px)&#96;</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      &#125;</span><span style="color: var(--shiki-token-punctuation)">,</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      </span><span style="color: var(--shiki-token-function)">tick</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> (t</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> u) </span><span style="color: var(--shiki-token-keyword)">=&gt;</span><span style="color: var(--shiki-color-text)"> &#123; </span><span style="color: var(--shiki-token-comment)">// callback</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">        </span><span style="color: var(--shiki-token-constant)">node</span><span style="color: var(--shiki-color-text)">.</span><span style="color: var(--shiki-token-constant)">styles</span><span style="color: var(--shiki-color-text)">.color </span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">getColor</span><span style="color: var(--shiki-color-text)">(t);</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      &#125;</span><span style="color: var(--shiki-token-punctuation)">,</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    &#125;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  &#125;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`),f(i),$(s,a)},$$slots:{default:!0}}))}const ls={description:"The `transition:` contract..."},{description:be}=ls;var Bt=x('<h2>The <code class="inline">transition:</code> contract</h2> <div class="code-section"><!></div>',1);function Nt(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>ls,{children:(s,o)=>{var a=Bt(),i=c(U(a),2),p=_(i);K(p,()=>`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    delay</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">params</span><span style="color: var(--shiki-color-text)">.delay</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// delay in ms</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    duration</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">params</span><span style="color: var(--shiki-color-text)">.duration</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// duration in ms</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    easing</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">params</span><span style="color: var(--shiki-color-text)">.easing</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// easing function</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    </span><span style="color: var(--shiki-token-function)">css</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> (t</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> u) </span><span style="color: var(--shiki-token-keyword)">=&gt;</span><span style="color: var(--shiki-color-text)"> &#123; </span><span style="color: var(--shiki-token-comment)">// css transition</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-string-expression)">&#96;transform: translateX(</span><span style="color: var(--shiki-token-keyword)">$&#123;</span><span style="color: var(--shiki-color-text)">t </span><span style="color: var(--shiki-token-keyword)">*</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">100</span><span style="color: var(--shiki-token-keyword)">&#125;</span><span style="color: var(--shiki-token-string-expression)">px)&#96;</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    &#125;</span><span style="color: var(--shiki-token-punctuation)">,</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    </span><span style="color: var(--shiki-token-function)">tick</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> (t</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> u) </span><span style="color: var(--shiki-token-keyword)">=&gt;</span><span style="color: var(--shiki-color-text)"> &#123; </span><span style="color: var(--shiki-token-comment)">// callback</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      </span><span style="color: var(--shiki-token-constant)">node</span><span style="color: var(--shiki-color-text)">.</span><span style="color: var(--shiki-token-constant)">styles</span><span style="color: var(--shiki-color-text)">.color </span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">getColor</span><span style="color: var(--shiki-color-text)">(t);</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    &#125;</span><span style="color: var(--shiki-token-punctuation)">,</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  &#125;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`),f(i),$(s,a)},$$slots:{default:!0}}))}var Wt=x("<option> </option>"),Vt=x('<div class="container svelte-ea51ja"><div class="left svelte-ea51ja"><select></select> <svg width="200" height="200" class="svelte-ea51ja"><defs><marker id="head" orient="auto" markerWidth="6" markerHeight="12" refX="0.1" refY="6"><path d="M0,0 V12 L6,6 Z" fill="black"></path></marker></defs><path d="M0,0 200,0" marker-end="url(#head)" stroke="black"></path><g class="x svelte-ea51ja" transform="translate(0,-10)"><text x="0" class="svelte-ea51ja">0</text><text x="200" class="svelte-ea51ja">1</text><text x="100" class="svelte-ea51ja">eased time</text></g><path d="M0,0 0,200" marker-end="url(#head)" stroke="black"></path><g class="y svelte-ea51ja" transform="translate(-10,0)"><text y="200" class="svelte-ea51ja">1</text><text y="0" class="svelte-ea51ja">0</text><text y="100" class="svelte-ea51ja">time</text></g><polyline class="svelte-ea51ja"></polyline><circle r="5" fill="red"></circle></svg> <svg height="5" width="200" style="margin: 1em 0;"><path d="M-50,0 250,0" stroke="#ddd" stroke-width="2"></path><path d="M0,0 200,0" stroke="black" stroke-width="3"></path><circle r="5" fill="black" cy="0"></circle></svg> <div> </div></div> <div><div class="code"></div> <br/> <div></div> <div></div> <div></div> <div></div> <br/> <div></div> <div></div> <div></div> <div></div> <div></div></div></div>');function Yt(e,t){J(t,!1);const r=S(),s=S();function o(g){return g}let a=[{name:"linear",fn:o},{name:"bounceInOut",fn:Vs},{name:"bounceIn",fn:Ys},{name:"bounceOut",fn:jn},{name:"cubicInOut",fn:Ks},{name:"cubicIn",fn:Zs},{name:"cubicOut",fn:Qs},{name:"quadInOut",fn:Rn},{name:"quadIn",fn:nt},{name:"quadOut",fn:st},{name:"quartInOut",fn:tt},{name:"quartIn",fn:at},{name:"quartOut",fn:et}],i=S(a[0]),p=Date.now(),u=S(),d=S(0),k=S(0),l=Es(t,"i",8,3),y=S(0),X=S(0),v;function b(){const g=Date.now();O(u,(g-p)%n(r)),O(d,n(u)/n(r)),O(k,n(i).fn(n(d))),n(k)*100,O(X,n(d)*200),O(y,n(i).fn(n(d))*200),v=requestAnimationFrame(b)}v=requestAnimationFrame(b),it(()=>{cancelAnimationFrame(v)});function P(g){let j="";for(let h=0;h<1;h+=.005)j+=`${g(h)*200},${h*200} `;return j}function T(g){return g-g%5}W(()=>Gn(l()),()=>{O(r,l()<5?2e3:8e3)}),W(()=>n(i),()=>{O(s,P(n(i).fn))}),sn(),rn();var m=Vt(),w=_(m),L=_(w);N(()=>{n(i),Rs(()=>{l()})});let G;Bn(L,5,()=>a,Nn,(g,j,h,An)=>{var Q=Wt(),gn=_(Q,!0);f(Q);var pn={};N(()=>{vn(gn,(n(j),Hn(()=>n(j).name))),pn!==(pn=n(j))&&(Q.value=(Q.__value=n(j))??"")}),$(g,Q)}),f(L);var B=c(L,2),F=c(_(B),5),A=c(F);let Z;f(B);var ln=c(B,2);let Sn;var js=c(_(ln),2);f(ln);var cn=c(ln,2);let Xn;var Ss=_(cn,!0);f(cn),f(w);var kn=c(w,2);let zn;var In=_(kn);E(In,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>n(i).fn.toString());var un=c(In,4);let Tn;E(un,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>"let start = Date.now();");var hn=c(un,2);let qn;E(hn,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>`let t = Date.now() - start; // ${T(n(u))}`);var yn=c(hn,2);let On;E(yn,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>`t = t / duration; // ${n(d).toFixed(3)}`);var mn=c(yn,2);let Pn;E(mn,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>`t = ${n(i).fn.name}(t); // ${n(k).toFixed(3)}`);var fn=c(mn,4);let Cn;E(fn,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>`node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(n(k)*250).toFixed(1)}px)`);var _n=c(fn,2);let En;E(_n,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>"css: (t, u) => `translateX(${t * 250}px)`");var $n=c(_n,2);let Ln;E($n,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>"css: (t, u) => `translateX(${u * 250}px)`");var xn=c($n,2);let Fn;E(xn,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>"tick: (t, u) => node.textContent = t");var Dn=c(xn,2);let Mn;E(Dn,(g,j)=>{var h;return(h=H)==null?void 0:h(g,j)},()=>`const string = 'Hello World';
tick: (t, u) => {
  node.textContent = string.slice(0, Math.round(string.length * t));
}`),f(kn),f(m),N((g,j,h,An,Q,gn,pn,Xs,zs,Is,Ts,qs,Os,Ps,Cs)=>{G=C(L,1,"svelte-ea51ja",null,G,g),nn(F,"points",n(s)),nn(A,"cx",n(y)),nn(A,"cy",n(X)),Z=C(A,0,"",null,Z,j),Sn=C(ln,0,"svelte-ea51ja",null,Sn,h),nn(js,"cx",n(y)),Xn=C(cn,1,"square svelte-ea51ja",null,Xn,An),Wn(cn,`transform: translateX(${(l()===9||l()===8?n(k):l()===10?1-n(k):0)*250}px)`),vn(Ss,Q),zn=C(kn,1,"right svelte-ea51ja",null,zn,gn),Tn=C(un,1,"code",null,Tn,pn),qn=C(hn,1,"code",null,qn,Xs),On=C(yn,1,"code",null,On,zs),Pn=C(mn,1,"code",null,Pn,Is),Cn=C(fn,1,"code svelte-ea51ja",null,Cn,Ts),En=C(_n,1,"code svelte-ea51ja",null,En,qs),Ln=C($n,1,"code svelte-ea51ja",null,Ln,Os),Fn=C(xn,1,"code svelte-ea51ja",null,Fn,Ps),Mn=C(Dn,1,"code svelte-ea51ja",null,Mn,Cs)},[()=>({hidden:l()<2}),()=>({hidden:l()<1}),()=>({hidden:l()<1}),()=>({hidden:l()<8}),()=>(Gn(l()),n(k),Hn(()=>l()===11?n(k).toFixed(3):l()===12?"Hello World".slice(0,Math.round(11*n(k))):"")),()=>({hidden:l()<3}),()=>({hidden:l()<4}),()=>({hidden:l()<5}),()=>({hidden:l()<6}),()=>({hidden:l()<7}),()=>({none:l()!==8}),()=>({none:l()!==9}),()=>({none:l()!==10}),()=>({none:l()!==11}),()=>({none:l()!==12})]),pt(L,()=>n(i),g=>O(i,g)),$(e,m),R()}const cs={description:"..."},{description:we}=cs;function Kt(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);let s=S(0);const o=12;function a(){return n(s)<o&&D(s)<o}function i(){return n(s)>0&&D(s,-1)>0}return q(e,I(()=>r,()=>cs,{children:(p,u)=>{Yt(p,{get i(){return n(s)}})},$$slots:{default:!0}})),M(t,"next",a),M(t,"prev",i),R({next:a,prev:i})}const ps={description:"The `transition:` contract..."},{description:je}=ps;var Zt=x('<h2>The <code class="inline">transition:</code> contract</h2> <div class="code-section"><!></div>',1);function Qt(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>ps,{children:(s,o)=>{var a=Zt(),i=c(U(a),2),p=_(i);K(p,()=>`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    delay</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">0</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// delay in ms</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    duration</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">300</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// duration in ms</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    easing</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> linear</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-comment)">// easing function</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    </span><span style="color: var(--shiki-token-function)">css</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> (t</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> u) </span><span style="color: var(--shiki-token-keyword)">=&gt;</span><span style="color: var(--shiki-color-text)"> &#123; </span><span style="color: var(--shiki-token-comment)">// css transition</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      </span><span style="color: var(--shiki-token-keyword)">return</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-string-expression)">&#96;transform: translateX(</span><span style="color: var(--shiki-token-keyword)">$&#123;</span><span style="color: var(--shiki-color-text)">t </span><span style="color: var(--shiki-token-keyword)">*</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">100</span><span style="color: var(--shiki-token-keyword)">&#125;</span><span style="color: var(--shiki-token-string-expression)">px)&#96;</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    &#125;</span><span style="color: var(--shiki-token-punctuation)">,</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    </span><span style="color: var(--shiki-token-function)">tick</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> (t</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> u) </span><span style="color: var(--shiki-token-keyword)">=&gt;</span><span style="color: var(--shiki-color-text)"> &#123; </span><span style="color: var(--shiki-token-comment)">// callback</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">      </span><span style="color: var(--shiki-token-constant)">node</span><span style="color: var(--shiki-color-text)">.</span><span style="color: var(--shiki-token-constant)">styles</span><span style="color: var(--shiki-color-text)">.color </span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">getColor</span><span style="color: var(--shiki-color-text)">(t);</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">    &#125;</span><span style="color: var(--shiki-token-punctuation)">,</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  &#125;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`),f(i),$(s,a)},$$slots:{default:!0}}))}const ds={description:"..."},{description:Se}=ds;var na=x('<iframe title="Svelte REPL" src="https://svelte.dev/repl/c88da2fde68a415cbd43aa738bfcefab?version=3.29.0" class="svelte-cxmxle"></iframe>');function sa(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>ds,{children:(s,o)=>{var a=na();$(s,a)},$$slots:{default:!0}}))}const vs={description:"🚀 3️⃣  Compile `transition:` in your Head..."},{description:Xe}=vs;var ta=x('<div class="container svelte-1q4kbmd"><h1 class="svelte-1q4kbmd">🚀 3️⃣  Compile <code class="inline">transition:</code> in your Head</h1> <div><div>📚 Compile Svelte in your head</div> <div><a href="https://lihautan.com/compile-svelte-in-your-head">https://lihautan.com/compile-svelte-in-your-head</a></div></div></div>');function aa(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>vs,{children:(s,o)=>{var a=ta();$(s,a)},$$slots:{default:!0}}))}const ks={description:"CSS Transition..."},{description:ze}=ks;var ea=x('<div class="code-section"><!></div>'),oa=x('<div class="code-section"><!></div>'),ia=x('<h1 class="svelte-1nbgh8f">CSS Transition</h1> <div class="code-section"><!></div> <hr/> <div id="demo">TEST</div> <button> </button> <!>',1);function ra(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);let s=S(!1);function o(){O(s,!n(s))}q(e,I(()=>r,()=>ks,{children:(a,i)=>{var p=ia(),u=c(U(p),2),d=_(u);K(d,()=>`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">opacity</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">1</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">transition</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">opacity 1</span><span style="color: var(--shiki-token-keyword)">s</span><span style="color: var(--shiki-token-constant)"> ease 0.5</span><span style="color: var(--shiki-token-keyword)">s</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span>
<span class="line"><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-token-function)">.transparent</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">opacity</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">0</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`),f(u);var k=c(u,4);let l;var y=c(k,2),X=_(y);f(y);var v=c(y,2);{var b=T=>{var m=ea(),w=_(m);K(w,()=>'<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">&lt;</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">class</span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-token-string-expression)">&quot;transparent&quot;</span><span style="color: var(--shiki-color-text)">&gt;TEST&lt;/</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;</span></span></code></pre>'),f(m),$(T,m)},P=T=>{var m=oa(),w=_(m);K(w,()=>'<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">&lt;</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;TEST&lt;/</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;</span></span></code></pre>'),f(m),$(T,m)};an(v,T=>{n(s)?T(b):T(P,!1)})}N(T=>{l=C(k,1,"svelte-1nbgh8f",null,l,T),vn(X,`${n(s)?"Remove":"Add"} class`)},[()=>({transparent:n(s)})]),dn("click",y,o),$(a,p)},$$slots:{default:!0}}))}const la=`<style>
{{rule}}
  div {
    animation: slide {{duration}}s linear;
  }
</style>
<div>TEXT</div>`,ca=`  @keyframes slide {
    0% { transform: translateX(0px); }
    10% { transform: translateX(10px); }
    20% { transform: translateX(20px); }
    30% { transform: translateX(30px); }
    40% { transform: translateX(40px); }
    50% { transform: translateX(50px); }
    60% { transform: translateX(60px); }
    70% { transform: translateX(70px); }
    80% { transform: translateX(80px); }
    90% { transform: translateX(90px); }
    100% { transform: translateX(100px); }
  }`,pa=`  @keyframes slide {
    0% { transform: translateX(0px); opacity: 0; }
    10% { transform: translateX(10px); opacity: 0.5; }
    20% { transform: translateX(20px); opacity: 1; }
    30% { transform: translateX(30px); opacity: 0.5; }
    40% { transform: translateX(40px); opacity: 0; }
    50% { transform: translateX(50px); opacity: 0.5; }
    60% { transform: translateX(60px); opacity: 1; }
    70% { transform: translateX(70px); opacity: 0.5; }
    80% { transform: translateX(80px); opacity: 0; }
    90% { transform: translateX(90px); opacity: 0.5; }
    100% { transform: translateX(100px); opacity: 1; }
  }`,da=`  @keyframes slide {
    0% { transform: translateX(0px); }
    10% { transform: translateX(0.1px); }
    20% { transform: translateX(0.8px); }
    30% { transform: translateX(2.7px); }
    40% { transform: translateX(6.4px); }
    50% { transform: translateX(12.5px); }
    60% { transform: translateX(21.6px); }
    70% { transform: translateX(34.3px); }
    80% { transform: translateX(51.2px); }
    90% { transform: translateX(72.9px); }
    100% { transform: translateX(100px); }
  }`,us={description:"CSS Animations..."},{description:Ie}=us;var va=x('<h1 class="svelte-3ssdsl">CSS Animations</h1> <div class="container svelte-3ssdsl"><div class="code svelte-3ssdsl"></div> <div class="demo svelte-3ssdsl"><label class="svelte-3ssdsl"><input type="radio" class="svelte-3ssdsl"/>Linear</label> <label class="svelte-3ssdsl"><input type="radio" class="svelte-3ssdsl"/>2 Animations</label> <label class="svelte-3ssdsl"><input type="radio" class="svelte-3ssdsl"/>Cubic Easing</label> <label class="svelte-3ssdsl">Duration: <input type="range" min="100" max="5000" step="50" class="svelte-3ssdsl"/></label> <div class="svelte-3ssdsl">TEXT</div></div></div>',1);function ka(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);const s=S(),o=[],a={anim1:ca,anim2:pa,anim3:da};let i=S("anim1"),p=S(3e3);W(()=>(n(i),n(p)),()=>{O(s,la.replace("{{rule}}",a[n(i)]).replace("{{duration}}",(n(p)/1e3).toFixed(2)))}),sn(),rn(),q(e,I(()=>r,()=>us,{children:(u,d)=>{var k=va(),l=c(U(k),2),y=_(l);E(y,(F,A)=>{var Z;return(Z=ot)==null?void 0:Z(F,A)},()=>({code:n(s),lang:lt.languages.html}));var X=c(y,2),v=_(X),b=_(v);en(b),b.value=b.__value="anim1",tn(),f(v);var P=c(v,2),T=_(P);en(T),T.value=T.__value="anim2",tn(),f(P);var m=c(P,2),w=_(m);en(w),w.value=w.__value="anim3",tn(),f(m);var L=c(m,2),G=c(_(L));en(G),f(L);var B=c(L,2);f(X),f(l),N(()=>Wn(B,`animation: ${n(i)??""} ${n(p)??""}ms linear infinite both`)),wn(o,[],b,()=>n(i),F=>O(i,F)),wn(o,[],T,()=>n(i),F=>O(i,F)),wn(o,[],w,()=>n(i),F=>O(i,F)),Vn(G,()=>n(p),F=>O(p,F)),$(u,k)},$$slots:{default:!0}})),R()}const ua=`const string = 'Hello World';
const duration = {{duration}}

let start = Date.now();

function loop() {
  const now = Date.now();
  // time ranges from [0, 1]
  const time = (now - start) / duration;

  div.textContent = string.slice(0, Math.round(time * string.length));

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);`,hs={description:"JS Animations..."},{description:Te}=hs;var ha=x('<h1 class="svelte-9k5trb">JS Animations</h1> <div class="code"></div> <input type="range" min="100" max="10000" step="50"/> <div></div>',1);function ya(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);const s=S(),o="Hello World";let a=S(3e3),i=S(),p=Date.now();rt(()=>{let u;function d(){const l=(Date.now()-p)/n(a),y=Math.round(l*o.length)%o.length;Us(i,n(i).textContent=o.slice(0,y===0?o.length:y)),u=requestAnimationFrame(d)}return u=requestAnimationFrame(d),()=>cancelAnimationFrame(u)}),W(()=>n(a),()=>{O(s,ua.replace("{{duration}}",`${n(a)}; // ${(n(a)/1e3).toFixed(2)}s`))}),sn(),rn(),q(e,I(()=>r,()=>hs,{children:(u,d)=>{var k=ha(),l=c(U(k),2);E(l,(v,b)=>{var P;return(P=H)==null?void 0:P(v,b)},()=>n(s));var y=c(l,2);en(y);var X=c(y,2);Yn(X,v=>O(i,v),()=>n(i)),Vn(y,()=>n(a),v=>O(a,v)),$(u,k)},$$slots:{default:!0}})),R()}const ys={description:"`transition:` in Vanilla JS..."},{description:qe}=ys;var ma=x('<h1><code class="inline">transition:</code> in Vanilla JS</h1>');function fa(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>ys,{children:(s,o)=>{var a=ma();$(s,a)},$$slots:{default:!0}}))}const ms={description:"`transition:` in compiled JS..."},{description:Oe}=ms;var _a=x('<h1><code class="inline">transition:</code> in compiled JS</h1>');function $a(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>ms,{children:(s,o)=>{var a=_a();$(s,a)},$$slots:{default:!0}}))}const xa=`function create_fragment(ctx) {
  return {
    /* create */  c() { /* ... */ },
    /* mount */   m(target, anchor) { /* ... */ },
    /* update */  p(ctx, dirty) { /* ... */ },
    /* destroy */ d(detaching) { /* ... */ }
  };
}
`,ga=`function create_fragment(ctx) {
  return {
    /* create */  c() { /* ... */ },
    /* mount */   m(target, anchor) { /* ... */ },
    /* update */  p(ctx, dirty) { /* ... */ },

    /* intro */   i(local) { /* ... */ },
    /* outro */   o(local) { /* ... */ },

    /* destroy */ d(detaching) { /* ... */ }
  };
}
`,fs={description:"..."},{description:Pe}=fs;var ba=x('<div class="container svelte-slvxkp"><div class="code"></div></div>');function wa(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);const s=S();let o=S(0);function a(){return n(o)<1&&D(o)<1}function i(){return n(o)>0&&D(o,-1)>0}return W(()=>n(o),()=>{O(s,[xa,ga][n(o)])}),sn(),rn(),q(e,I(()=>r,()=>fs,{children:(p,u)=>{var d=ba(),k=_(d);E(k,(l,y)=>{var X;return(X=H)==null?void 0:X(l,y)},()=>n(s)),f(d),$(p,d)},$$slots:{default:!0}})),M(t,"next",a),M(t,"prev",i),R({next:a,prev:i})}const V=`{#each array as item}
  <div transition:fade={{ delay: 10 }} />
{/each}`,ja=`{#each array as item}
  <div in:fade={{ delay: 10 }} />
{/each}`,Sa=`{#each array as item}
  <div out:fade={{ delay: 10 }} />
{/each}`,Xa=`// <div transition:fade />
function create_each_block(ctx) { /*... */ }

// {#each array as item}
function create_fragment(ctx) {
  let each_block = create_each_block(ctx);

  return {
    // ...
    i(local) {},
    o(local) {},
    // ...
  };
}
`,za=`// <div transition:fade />
function create_each_block(ctx) { /*... */ }

// {#each array as item}
function create_fragment(ctx) {
  let each_block = create_each_block(ctx);

  return {
    // ...
    i(local) {
      transition_in(each_block);
    },
    o(local) {
      transition_out(each_block);
    },
    // ...
  };
}
`,Ia=`// <div transition:fade />
function create_each_block(ctx) { /*... */ }

// {#each array as item}
function create_fragment(ctx) {
  let each_block = create_each_block(ctx);

  return {
    // ...
    i(local) {
      transition_in(each_block);
    },
    o(local) {
      transition_out(each_block);
    },
    // ...
  };
}

function transition_in(block, local = false) {
  if (block && block.i) {
    // ...
    block.i(local);
  }
}

function transition_out(block, local = false) {
  if (block && block.o) {
    // ...
    block.o(local);
  }
}`,Ta=`// <div transition:fade />
function create_each_block(ctx) { /*... */ }

// {#each array as item}
function create_fragment(ctx) {
  let each_block = create_each_block(ctx);

  return {
    // ...
    p(ctx, dirty) { 
      // add new item
      transition_in(each_block);
    },
    i(local) {
      transition_in(each_block);
    },
    o(local) {
      transition_out(each_block);
    },
    // ...
  };
}

function transition_in(block, local = false) {
  if (block && block.i) {
    // ...
    block.i(local);
  }
}

function transition_out(block, local = false) {
  if (block && block.o) {
    // ...
    block.o(local);
  }
}`,qa=`// <div transition:fade />
function create_each_block(ctx) { /*... */ }

// {#each array as item}
function create_fragment(ctx) {
  let each_block = create_each_block(ctx);

  return {
    // ...
    p(ctx, dirty) { 
      // add new item
      transition_in(each_block);

      // remove unneeded item
      group_outros();
      transition_out(each_block_1);
      transition_out(each_block_2);
      check_outros();
    },
    i(local) {
      transition_in(each_block);
    },
    o(local) {
      transition_out(each_block);
    },
    // ...
  };
}

function transition_in(block, local = false) {
  if (block && block.i) {
    // ...
    block.i(local);
  }
}

function transition_out(block, local = false) {
  if (block && block.o) {
    // ...
    block.o(local);
  }
}`,Oa=`// <div transition:fade />
function create_each_block(ctx) {
  return {
    // ...
    i(local) {},
    o(local) {},
    // ...
  };
}

// {#each array as item}
function create_fragment(ctx) { /* ... */}
`,Pa=`// <div transition:fade />
function create_each_block(ctx) {
  return {
    // ...
    i(local) {
      add_render_callback(() => {
        if (!div_transition) {
          div_transition =
            create_bidirectional_transition(
              div, fade, { delay: 10 }, true
            );
        }
        div_transition.run(1);
      });
    },
    o(local) {},
    // ...
  };
}

// {#each array as item}
function create_fragment(ctx) {
  /* ... */
}
`,Ca=`// <div transition:fade />
function create_each_block(ctx) {
  return {
    // ...
    i(local) {
      add_render_callback(() => {
        if (!div_transition) {
          div_transition = 
            create_bidirectional_transition(
              div, fade, { delay: 10 }, true
            );
        }
        div_transition.run(1);
      });
    },
    o(local) {
      if (!div_transition) {
        div_transition = 
          create_bidirectional_transition(
            div, fade, { delay: 10 }, true
          );
      }
      div_transition.run(0);
    },
    // ...
  };
}

// {#each array as item}
function create_fragment(ctx) {
  /* ... */
}
`,Ea=`// <div transition:fade />
function create_each_block(ctx) {
  return {
    // ...
    i(local) {
      if (!div_intro) {
        add_render_callback(() => {
          div_intro = create_in_transition(
            div, fade, { delay: 10 }
          );
          div_intro.start();
        });
      }
    },
    // ...
  };
}

// {#each array as item}
function create_fragment(ctx) { /* ... */ }
`,La=`// <div transition:fade />
function create_each_block(ctx) {
  return {
    // ...
    i(local) {
      if (div_outro) div_outro.end(1);
    },
    o(local) {
      div_outro = create_out_transition(
        div, fade, { delay: 10 }
      );
    },
    // ...
  };
}

// {#each array as item}
function create_fragment(ctx) { /* ... */ }
`,_s={description:"..."},{description:Ce}=_s;var Fa=x('<div class="container svelte-oi1ldz"><div class="code svelte-oi1ldz"></div> <div class="code svelte-oi1ldz"></div></div> <div></div>',1);function Da(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);const s=S(),o=S();let a=S(0);const i=[Xa,za,Ia,Ta,qa,Oa,Pa,Ca,Ea,La],p=[V,V,V,V,V,V,V,V,ja,Sa],u=i.length-1;function d(){return n(a)<u&&D(a)<u}function k(){return n(a)>0&&D(a,-1)>0}return W(()=>n(a),()=>{O(s,i[n(a)])}),W(()=>n(a),()=>{O(o,p[n(a)])}),sn(),q(e,I(()=>r,()=>_s,{children:(l,y)=>{var X=Fa(),v=U(X),b=_(v);E(b,(w,L)=>{var G;return(G=Un)==null?void 0:G(w,L)},()=>n(o));var P=c(b,2);E(P,(w,L)=>{var G;return(G=H)==null?void 0:G(w,L)},()=>n(s)),f(v);var T=c(v,2);let m;N(w=>m=C(T,1,`box box-${n(a)??""}`,"svelte-oi1ldz",m,w),[()=>({hidden:n(a)<1||n(a)===2||n(a)===5})]),$(l,X)},$$slots:{default:!0}})),M(t,"next",d),M(t,"prev",k),R({next:d,prev:k})}const Ma=`export function create_in_transition(node, fn, params) {
  let config = fn(node, params);
  let running = false;
  let animation_name;
  let task;
  let uid = 0;

  function cleanup() {
    if (animation_name) delete_rule(node, animation_name);
  }

  function go() {
    const { delay = 0, duration = 300, easing = linear, tick = noop, css } = config || null_transition;

    if (css) animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
    tick(0, 1);

    const start_time = now() + delay;
    const end_time = start_time + duration;

    if (task) task.abort();
    running = true;

    add_render_callback(() => dispatch(node, true, 'start'));

    task = loop(now => {
      if (running) {
        if (now >= end_time) {
          tick(1, 0);

          dispatch(node, true, 'end');

          cleanup();
          return (running = false);
        }

        if (now >= start_time) {
          const t = easing((now - start_time) / duration);
          tick(t, 1 - t);
        }
      }

      return running;
    });
  }

  let started = false;

  return {
    start() {
      if (started) return;

      delete_rule(node);

      if (is_function(config)) {
        config = config();
        wait().then(go);
      } else {
        go();
      }
    },

    invalidate() {
      started = false;
    },

    end() {
      if (running) {
        cleanup();
        running = false;
      }
    },
  };
}

// src/runtime/internal/style_manager.ts
function create_rule(node, a, b, duration, delay, ease, fn, uid) {
  const step = 16.666 / duration;
  let keyframes = '{\\n';

  for (let p = 0; p <= 1; p += step) {
    const t = a + (b - a) * ease(p);
    keyframes += p * 100 + \`%{\${fn(t, 1 - t)}}\\n\`;
  }

  const rule = keyframes + \`100% {\${fn(b, 1 - b)}}\\n}\`;
  const name = \`__svelte_\${hash(rule)}_\${uid}\`;
  const doc = node.ownerDocument as ExtendedDoc;
  active_docs.add(doc);
  const stylesheet = doc.__svelte_stylesheet || (doc.__svelte_stylesheet = doc.head.appendChild(element('style') as HTMLStyleElement).sheet as CSSStyleSheet);
  const current_rules = doc.__svelte_rules || (doc.__svelte_rules = {});

  if (!current_rules[name]) {
    current_rules[name] = true;
    stylesheet.insertRule(\`@keyframes \${name} \${rule}\`, stylesheet.cssRules.length);
  }

  const animation = node.style.animation || '';
  node.style.animation = \`\${animation ? \`\${animation}, \` : ''}\${name} \${duration}ms linear \${delay}ms 1 both\`;

  active += 1;
  return name;
}`,$s={description:"..."},{description:Ee}=$s;var Aa=x('<div class="container svelte-18x8sxj"><div class="code"></div> <div></div></div>');function Ha(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);J(t,!1);let s=S(0),o=S();const a=Ma,i=[0,0,1920,1920,2064,2064,544,326,208,720,444,444,444],p=i.length-1;function u(){return n(s)<p&&D(s)<p}function d(){return n(s)>0&&D(s,-1)>0}return W(()=>(n(o),n(s)),()=>{n(o)&&i[n(s)]!==void 0&&n(o).scrollTo({top:i[n(s)],behavior:"smooth"})}),sn(),q(e,I(()=>r,()=>$s,{children:(k,l)=>{var y=Aa(),X=_(y);E(X,(P,T)=>{var m;return(m=H)==null?void 0:m(P,T)},()=>a);var v=c(X,2);let b;f(y),Yn(y,P=>O(o,P),()=>n(o)),N(()=>b=C(v,1,`box box-${n(s)??""}`,"svelte-18x8sxj",b,{hidden:!1})),$(k,y)},$$slots:{default:!0}})),M(t,"next",u),M(t,"prev",d),R({next:u,prev:d})}const xs={description:"Source code referencesrc/runtime/internal/transitions.ts`transition_in`, `transition_out``create_in_transition`, `create_out_transition`, `create_bidirectional_transition`src/runtime/internal/style_manager.ts..."},{description:Le}=xs;var Ga=x('<h1 class="svelte-1khujlx">Source code reference</h1> <h2 class="svelte-1khujlx"><a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/transitions.ts" rel="nofollow">src/runtime/internal/transitions.ts</a></h2> <ul><li><code class="inline">transition_in</code>, <code class="inline">transition_out</code></li> <li><code class="inline">create_in_transition</code>, <code class="inline">create_out_transition</code>, <code class="inline">create_bidirectional_transition</code></li></ul> <h2 class="svelte-1khujlx"><a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/style_manager.ts" rel="nofollow">src/runtime/internal/style_manager.ts</a></h2> <ul><li><code class="inline">create_rule</code>, <code class="inline">delete_rule</code>, <code class="inline">clear_rules</code></li></ul> <h2 class="svelte-1khujlx"><a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/transition/index.ts" rel="nofollow">src/runtime/transition/index.ts</a> (<code class="inline">svelte/transition</code>)</h2> <ul><li><code class="inline">fade</code>, <code class="inline">fly</code>, <code class="inline">slide</code>, <code class="inline">crossfade</code>, ...</li></ul>',1);function Ja(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>xs,{children:(s,o)=>{var a=Ga();tn(12),$(s,a)},$$slots:{default:!0}}))}const gs={description:"..."},{description:Fe}=gs;var Ra=x('<div class="container svelte-rvhzm1"><div class="svelte-rvhzm1">🚴‍♂️  Level 1️⃣  - Using <code>transition:</code></div> <div class="svelte-rvhzm1">🚗  Level 2️⃣  - The <code>transition:</code> contract</div> <div class="svelte-rvhzm1">🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head</div></div>');function Ua(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>gs,{children:(s,o)=>{var a=Ra();$(s,a)},$$slots:{default:!0}}))}const bs={description:"Thank you@lihautan..."},{description:De}=bs;var Ba=x('<div class="container svelte-1296l67"><div><h1>Thank you</h1> <p>@lihautan</p></div></div>');function Na(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]);q(e,I(()=>r,()=>bs,{children:(s,o)=>{var a=Ba();$(s,a)},$$slots:{default:!0}}))}const ws={layout:"slide",description:"..."},{layout:Me,description:Ae}=ws;function He(e,t){const r=z(t,["children","$$slots","$$events","$$legacy"]),s=[ut,_t,wt,St,Et,Ft,Mt,Ht,Jt,Ut,Nt,Kt,Qt,sa,aa,ra,ka,ya,fa,$a,wa,Da,Ha,Ja,Ua,Na];Ls(e,I(()=>r,()=>ws,{children:(o,a)=>{Fs(o,{get slides(){return s}})},$$slots:{default:!0}}))}export{He as component};
