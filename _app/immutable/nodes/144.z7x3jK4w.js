import{s as W,d as y,f as L,p as qe,n as re,h as $n,E as ue,q as _e,r as Ne,F as Hn,o as Dn,m as bn}from"../chunks/scheduler.85ImRbsk.js";import{S as Y,i as K,m as N,n as J,o as R,t as X,a as O,p as G,s as T,w as tt,h as E,j as m,y as ze,z as Ae,g as i,e as f,c as d,q,u as c,D as je,C as ke,E as wn,F as Tn,d as $,k as p,G as S,A as En,b as pe,f as fe,l as xt,H as Pe,r as Ve,I as le,J as oe,v as Be,K as Mt,L as Me,M as Mn,N as In,O as jn}from"../chunks/index.JMRAb4ib.js";import{g as Z,a as C}from"../chunks/code-snippet.p32Anx_S.js";import{S as Pn,a as Vn}from"../chunks/Slides.AhFZQ5Ap.js";import{B as ee}from"../chunks/BlogLayout.TadBQAnB.js";import{b as nt,s as gt,q as Ln,a as jt,c as Pt,d as Vt,f as yt,e as Xn,g as Sn,h as qn,i as On,j as Fn,k as zn,l as An,m as Un,n as Bn,o as Nn}from"../chunks/index.LtwMzvSK.js";import{e as st}from"../chunks/each.mrcKafHm.js";import{p as Cn,a as ve,b as Jn}from"../chunks/prism.H8ZCx89s.js";import{P as Xt}from"../chunks/prism.FWTxH3KY.js";function St(o){let e,s="🚀 Demystifying Transitions",n,a;return{c(){e=f("h1"),e.textContent=s,this.h()},l(t){e=d(t,"H1",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-cda0qp"&&(e.textContent=s),this.h()},h(){c(e,"class","svelte-kb1uhf")},m(t,l){m(t,e,l),a=!0},i(t){a||(t&&qe(()=>{a&&(n||(n=je(e,gt,{easing:nt,duration:3e3,delay:900},!0)),n.run(1))}),a=!0)},o(t){t&&(n||(n=je(e,gt,{easing:nt,duration:3e3,delay:900},!1)),n.run(0)),a=!1},d(t){t&&i(e),t&&n&&n.end()}}}function qt(o){let e,s="Click Me",n,a,t,l,r;return{c(){e=f("button"),e.textContent=s,this.h()},l(u){e=d(u,"BUTTON",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-9qwfqp"&&(e.textContent=s),this.h()},h(){c(e,"class","svelte-kb1uhf")},m(u,h){m(u,e,h),t=!0,l||(r=ke(e,"click",o[4]),l=!0)},p:re,i(u){t||(u&&qe(()=>{t&&(a&&a.end(1),n=wn(e,gt,{easing:Ln}),n.start())}),t=!0)},o(u){n&&n.invalidate(),u&&(a=Tn(e,Wn,{easing:nt,duration:1200,y:-200})),t=!1},d(u){u&&i(e),u&&a&&a.end(),l=!1,r()}}}function Rn(o){let e,s,n=o[0]===2&&St(),a=o[0]===1&&qt(o);return{c(){n&&n.c(),e=T(),a&&a.c(),s=tt()},l(t){n&&n.l(t),e=E(t),a&&a.l(t),s=tt()},m(t,l){n&&n.m(t,l),m(t,e,l),a&&a.m(t,l),m(t,s,l)},p(t,l){t[0]===2?n?l&1&&X(n,1):(n=St(),n.c(),X(n,1),n.m(e.parentNode,e)):n&&(ze(),O(n,1,1,()=>{n=null}),Ae()),t[0]===1?a?(a.p(t,l),l&1&&X(a,1)):(a=qt(t),a.c(),X(a,1),a.m(s.parentNode,s)):a&&(ze(),O(a,1,1,()=>{a=null}),Ae())},d(t){t&&(i(e),i(s)),n&&n.d(t),a&&a.d(t)}}}function Gn(o){let e,s;const n=[o[1],Ot];let a={$$slots:{default:[Rn]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&2?Z(n,[l&2&&C(t[1]),l&0&&C(Ot)]):{};l&33&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Ot={description:"..."};function Wn(o,e){return{delay:e.delay,duration:e.duration,easing:e.easing,css(s,n){return`transform: translateX(-50%) translateY(${n*e.y}px) scale(${s})`}}}function Yn(o,e,s){let n=0;function a(){return n===2?!1:(s(0,n++,n),!0)}function t(){return n===0?!1:(s(0,n--,n),!0)}const l=()=>s(0,n=2);return o.$$set=r=>{s(1,e=y(y({},e),L(r)))},e=L(e),[n,e,a,t,l]}let Kn=class extends Y{constructor(e){super(),K(this,e,Yn,Gn,W,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}};function Ft(o){let e,s="🚴‍♂️  Level 1️⃣  - Using <code>transition:</code>",n,a;return{c(){e=f("div"),e.innerHTML=s,this.h()},l(t){e=d(t,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-a2g7le"&&(e.innerHTML=s),this.h()},h(){c(e,"class","actual svelte-1h90ifj")},m(t,l){m(t,e,l),a=!0},i(t){a||(t&&qe(()=>{a&&(n||(n=je(e,jt,{},!0)),n.run(1))}),a=!0)},o(t){t&&(n||(n=je(e,jt,{},!1)),n.run(0)),a=!1},d(t){t&&i(e),t&&n&&n.end()}}}function zt(o){let e,s="🚗  Level 2️⃣  - The <code>transition:</code> contract",n,a;return{c(){e=f("div"),e.innerHTML=s,this.h()},l(t){e=d(t,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-z1z0hr"&&(e.innerHTML=s),this.h()},h(){c(e,"class","actual svelte-1h90ifj")},m(t,l){m(t,e,l),a=!0},i(t){a||(t&&qe(()=>{a&&(n||(n=je(e,Pt,{},!0)),n.run(1))}),a=!0)},o(t){t&&(n||(n=je(e,Pt,{},!1)),n.run(0)),a=!1},d(t){t&&i(e),t&&n&&n.end()}}}function At(o){let e,s="🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head",n,a;return{c(){e=f("div"),e.innerHTML=s,this.h()},l(t){e=d(t,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-18rr9u8"&&(e.innerHTML=s),this.h()},h(){c(e,"class","actual svelte-1h90ifj")},m(t,l){m(t,e,l),a=!0},i(t){a||(t&&qe(()=>{a&&(n||(n=je(e,Vt,{y:30},!0)),n.run(1))}),a=!0)},o(t){t&&(n||(n=je(e,Vt,{y:30},!1)),n.run(0)),a=!1},d(t){t&&i(e),t&&n&&n.end()}}}function Zn(o){let e,s,n,a="🚴‍♂️  Level 1️⃣  - Using <code>transition:</code>",t,l,r,u,h="🚗  Level 2️⃣  - The <code>transition:</code> contract",k,M,_,v,P="🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head",b,g=o[0]>=1&&Ft(),j=o[0]>=2&&zt(),x=o[0]>=3&&At();return{c(){e=f("div"),s=f("div"),n=f("div"),n.innerHTML=a,t=T(),g&&g.c(),l=T(),r=f("div"),u=f("div"),u.innerHTML=h,k=T(),j&&j.c(),M=T(),_=f("div"),v=f("div"),v.innerHTML=P,b=T(),x&&x.c(),this.h()},l(H){e=d(H,"DIV",{class:!0});var I=$(e);s=d(I,"DIV",{class:!0});var w=$(s);n=d(w,"DIV",{class:!0,"data-svelte-h":!0}),q(n)!=="svelte-1nsgb6p"&&(n.innerHTML=a),t=E(w),g&&g.l(w),w.forEach(i),l=E(I),r=d(I,"DIV",{class:!0});var B=$(r);u=d(B,"DIV",{class:!0,"data-svelte-h":!0}),q(u)!=="svelte-14v887o"&&(u.innerHTML=h),k=E(B),j&&j.l(B),B.forEach(i),M=E(I),_=d(I,"DIV",{class:!0});var A=$(_);v=d(A,"DIV",{class:!0,"data-svelte-h":!0}),q(v)!=="svelte-sj78d4"&&(v.innerHTML=P),b=E(A),x&&x.l(A),A.forEach(i),I.forEach(i),this.h()},h(){c(n,"class","placeholder svelte-1h90ifj"),c(s,"class","svelte-1h90ifj"),c(u,"class","placeholder svelte-1h90ifj"),c(r,"class","svelte-1h90ifj"),c(v,"class","placeholder svelte-1h90ifj"),c(_,"class","svelte-1h90ifj"),c(e,"class","container svelte-1h90ifj")},m(H,I){m(H,e,I),p(e,s),p(s,n),p(s,t),g&&g.m(s,null),p(e,l),p(e,r),p(r,u),p(r,k),j&&j.m(r,null),p(e,M),p(e,_),p(_,v),p(_,b),x&&x.m(_,null)},p(H,I){H[0]>=1?g?I&1&&X(g,1):(g=Ft(),g.c(),X(g,1),g.m(s,null)):g&&(ze(),O(g,1,1,()=>{g=null}),Ae()),H[0]>=2?j?I&1&&X(j,1):(j=zt(),j.c(),X(j,1),j.m(r,null)):j&&(ze(),O(j,1,1,()=>{j=null}),Ae()),H[0]>=3?x?I&1&&X(x,1):(x=At(),x.c(),X(x,1),x.m(_,null)):x&&(ze(),O(x,1,1,()=>{x=null}),Ae())},d(H){H&&i(e),g&&g.d(),j&&j.d(),x&&x.d()}}}function Qn(o){let e,s;const n=[o[1],Ut];let a={$$slots:{default:[Zn]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&2?Z(n,[l&2&&C(t[1]),l&0&&C(Ut)]):{};l&17&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Ut={description:"..."};function es(o,e,s){let n=0;function a(){return n===3?!1:(s(0,n++,n),!0)}function t(){return n===0?!1:(s(0,n--,n),!0)}return o.$$set=l=>{s(1,e=y(y({},e),L(l)))},e=L(e),[n,e,a,t]}let ts=class extends Y{constructor(e){super(),K(this,e,es,Qn,W,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}};const ns=""+new URL("../assets/profile-pic.NoxifDdM.png",import.meta.url).href,ss=""+new URL("../assets/penang-rojak.2zaWt6FU.jpg",import.meta.url).href,as=""+new URL("../assets/koay-teow.4ym5B6Fi.jpg",import.meta.url).href;function ls(o){let e,s,n,a,t="@lihautan",l,r,u="<li>👨🏻‍💻 Frontend engineer at Shopee Singapore</li> <li>🇲🇾 Grew up in Penang, Malaysia</li> <li>🛠 Svelte Maintainer</li>",h,k,M=`<img src="${as}" alt="char koay teow" class="svelte-1l0c6ie"/> <div>Image credit: sidechef.com</div>`,_,v,P=`<img src="${ss}" alt="rojak" class="svelte-1l0c6ie"/> <div>Image credit: tripadvisor.com</div>`;return{c(){e=f("img"),n=T(),a=f("p"),a.textContent=t,l=T(),r=f("ul"),r.innerHTML=u,h=T(),k=f("div"),k.innerHTML=M,_=T(),v=f("div"),v.innerHTML=P,this.h()},l(b){e=d(b,"IMG",{src:!0,alt:!0,class:!0}),n=E(b),a=d(b,"P",{class:!0,"data-svelte-h":!0}),q(a)!=="svelte-1ssh3t2"&&(a.textContent=t),l=E(b),r=d(b,"UL",{class:!0,"data-svelte-h":!0}),q(r)!=="svelte-1x3vsu7"&&(r.innerHTML=u),h=E(b),k=d(b,"DIV",{class:!0,"data-svelte-h":!0}),q(k)!=="svelte-19iepwq"&&(k.innerHTML=M),_=E(b),v=d(b,"DIV",{class:!0,"data-svelte-h":!0}),q(v)!=="svelte-52je5n"&&(v.innerHTML=P),this.h()},h(){$n(e.src,s=ns)||c(e,"src",s),c(e,"alt","profile"),c(e,"class","svelte-1l0c6ie"),c(a,"class","svelte-1l0c6ie"),c(r,"class","svelte-1l0c6ie"),c(k,"class","ckt svelte-1l0c6ie"),S(k,"hidden",o[0]<1||o[0]>=3),c(v,"class","rojak svelte-1l0c6ie"),S(v,"hidden",o[0]<2||o[0]>=3)},m(b,g){m(b,e,g),m(b,n,g),m(b,a,g),m(b,l,g),m(b,r,g),m(b,h,g),m(b,k,g),m(b,_,g),m(b,v,g)},p(b,g){g&1&&S(k,"hidden",b[0]<1||b[0]>=3),g&1&&S(v,"hidden",b[0]<2||b[0]>=3)},d(b){b&&(i(e),i(n),i(a),i(l),i(r),i(h),i(k),i(_),i(v))}}}function os(o){let e,s;const n=[o[1],Bt];let a={$$slots:{default:[ls]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&2?Z(n,[l&2&&C(t[1]),l&0&&C(Bt)]):{};l&17&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Bt={description:"@lihautan👨🏻‍💻 Frontend engineer at Shopee Singapore🇲🇾 Grew up in Penang, Malaysia🛠 Svelte Maintainer..."};function rs(o,e,s){let n=0;function a(){return n===3?!1:(s(0,n++,n),!0)}function t(){return n===0?!1:(s(0,n--,n),!0)}return o.$$set=l=>{s(1,e=y(y({},e),L(l)))},e=L(e),[n,e,a,t]}let is=class extends Y{constructor(e){super(),K(this,e,rs,os,W,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}};function cs(o){let e,s='<h1 class="svelte-11o4zfu">🚴‍♂️ 1️⃣  Using <code class="inline">transition:</code></h1>';return{c(){e=f("div"),e.innerHTML=s,this.h()},l(n){e=d(n,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-erme6z"&&(e.innerHTML=s),this.h()},h(){c(e,"class","svelte-11o4zfu")},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function us(o){let e,s;const n=[o[0],Nt];let a={$$slots:{default:[cs]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(Nt)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Nt={description:"🚴‍♂️ 1️⃣  Using `transition:`..."};function ps(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let fs=class extends Y{constructor(e){super(),K(this,e,ps,us,W,{})}};const ds=`{#each items as item}
  <div>{item}</div>
{/each}`,hs=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div>{item}</div>
{/each}`,vs=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div in:fade>{item}</div>
{/each}`,ks=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div in:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,_s=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div out:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,ms=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div transition:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`;function Jt(o,e,s){const n=o.slice();return n[12]=e[s],n}function Rt(o){let e,s=o[12]+"",n,a,t,l;return{c(){e=f("div"),n=pe(s)},l(r){e=d(r,"DIV",{});var u=$(e);n=fe(u,s),u.forEach(i)},m(r,u){m(r,e,u),p(e,n),l=!0},p(r,u){(!l||u&1)&&s!==(s=r[12]+"")&&xt(n,s)},i(r){l||(r&&qe(()=>{l&&(t&&t.end(1),a=wn(e,o[4],{}),a.start())}),l=!0)},o(r){a&&a.invalidate(),r&&(t=Tn(e,o[5],{})),l=!1},d(r){r&&i(e),r&&t&&t.end()}}}function ys(o){let e,s,n,a,t,l,r="Add",u,h,k="Remove",M,_,v,P,b=st(o[0]),g=[];for(let x=0;x<b.length;x+=1)g[x]=Rt(Jt(o,b,x));const j=x=>O(g[x],1,1,()=>{g[x]=null});return{c(){e=f("div"),s=f("div"),a=T(),t=f("div"),l=f("button"),l.textContent=r,u=T(),h=f("button"),h.textContent=k,M=T();for(let x=0;x<g.length;x+=1)g[x].c();this.h()},l(x){e=d(x,"DIV",{class:!0});var H=$(e);s=d(H,"DIV",{class:!0}),$(s).forEach(i),a=E(H),t=d(H,"DIV",{});var I=$(t);l=d(I,"BUTTON",{"data-svelte-h":!0}),q(l)!=="svelte-vl3uo0"&&(l.textContent=r),u=E(I),h=d(I,"BUTTON",{"data-svelte-h":!0}),q(h)!=="svelte-1br7fqk"&&(h.textContent=k),M=E(I);for(let w=0;w<g.length;w+=1)g[w].l(I);I.forEach(i),H.forEach(i),this.h()},h(){c(s,"class","code"),c(e,"class","container svelte-zwzan3")},m(x,H){m(x,e,H),p(e,s),p(e,a),p(e,t),p(t,l),p(t,u),p(t,h),p(t,M);for(let I=0;I<g.length;I+=1)g[I]&&g[I].m(t,null);_=!0,v||(P=[ue(n=Cn.call(null,s,o[1])),ke(l,"click",o[2]),ke(h,"click",o[3])],v=!0)},p(x,H){if(n&&_e(n.update)&&H&2&&n.update.call(null,x[1]),H&1){b=st(x[0]);let I;for(I=0;I<b.length;I+=1){const w=Jt(x,b,I);g[I]?(g[I].p(w,H),X(g[I],1)):(g[I]=Rt(w),g[I].c(),X(g[I],1),g[I].m(t,null))}for(ze(),I=b.length;I<g.length;I+=1)j(I);Ae()}},i(x){if(!_){for(let H=0;H<b.length;H+=1)X(g[H]);_=!0}},o(x){g=g.filter(Boolean);for(let H=0;H<g.length;H+=1)O(g[H]);_=!1},d(x){x&&i(e),En(g,x),v=!1,Ne(P)}}}function gs(o){let e,s;const n=[o[6],Gt];let a={$$slots:{default:[ys]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&64?Z(n,[l&64&&C(t[6]),l&0&&C(Gt)]):{};l&32771&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Gt={description:"..."};function xs(o,e,s){let n,a=0;const t=[ds,hs,vs,ks,_s,ms],l=t.length-1;function r(){return a<l&&s(9,a++,a)<l}function u(){return a>0&&s(9,a--,a)>0}let h=["a","b"];function k(){s(0,h=[...h,String.fromCharCode(97+h.length)])}function M(){s(0,h=h.slice(0,-1))}function _(P){return function(){return a===2?yt(P,{}):a===3||a===5?yt(P,{duration:4e3,delay:500}):{duration:0}}}function v(P){return function(){return a===4||a===5?yt(P,{duration:4e3,delay:500}):{duration:0}}}return o.$$set=P=>{s(6,e=y(y({},e),L(P)))},o.$$.update=()=>{o.$$.dirty&512&&s(1,n=t[a])},e=L(e),[h,n,k,M,_,v,e,r,u,a]}let $s=class extends Y{constructor(e){super(),K(this,e,xs,gs,W,{next:7,prev:8})}get next(){return this.$$.ctx[7]}get prev(){return this.$$.ctx[8]}};function bs(o){let e,s,n,a=`<pre class="prism language-svelte"><code><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript"></div><div class="line">  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> fly<span class="token punctuation">,</span> slide<span class="token punctuation">,</span> scale<span class="token punctuation">,</span> blur <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span><span class="token punctuation">;</span></div><div class="line"></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></div><div class="line"></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>fly=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">x</span><span class="token operator">:</span> <span class="token number">50</span><span class="token punctuation">,</span> <span class="token literal-property property">y</span><span class="token operator">:</span><span class="token number">50</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>slide</span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>scale=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">start</span><span class="token operator">:</span> <span class="token number">0.5</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>blur=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">amount</span><span class="token operator">:</span> <span class="token number">2</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div></code></pre>`;return{c(){e=f("div"),s=f("div"),n=new Pe(!1),this.h()},l(t){e=d(t,"DIV",{class:!0});var l=$(e);s=d(l,"DIV",{class:!0});var r=$(s);n=Ve(r,!1),r.forEach(i),l.forEach(i),this.h()},h(){n.a=null,c(s,"class","code-section"),c(e,"class","container svelte-l83dwf")},m(t,l){m(t,e,l),p(e,s),n.m(a,s)},p:re,d(t){t&&i(e)}}}function ws(o){let e,s;const n=[o[0],Wt];let a={$$slots:{default:[bs]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(Wt)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Wt={description:"..."};function Ts(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let Es=class extends Y{constructor(e){super(),K(this,e,Ts,ws,W,{})}};function Is(o){let e,s='<ul class="svelte-h8tvqg"><li class="svelte-h8tvqg"><a href="https://svelte.dev/docs#svelte_transition" rel="nofollow">https://svelte.dev/docs#svelte_transition</a></li> <li class="svelte-h8tvqg"><a href="https://svelte.dev/tutorial/transition" rel="nofollow">https://svelte.dev/tutorial/transition</a></li></ul>';return{c(){e=f("div"),e.innerHTML=s,this.h()},l(n){e=d(n,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-1p3ol3"&&(e.innerHTML=s),this.h()},h(){c(e,"class","svelte-h8tvqg")},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function Ls(o){let e,s;const n=[o[0],Yt];let a={$$slots:{default:[Is]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(Yt)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Yt={description:"https://svelte.dev/docs#svelte_transitionhttps://svelte.dev/tutorial/transition..."};function Cs(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let Hs=class extends Y{constructor(e){super(),K(this,e,Cs,Ls,W,{})}};function Ds(o){let e,s='<h1 class="svelte-11o4zfu">🚗 2️⃣  The <code class="inline">transition:</code> contract</h1>';return{c(){e=f("div"),e.innerHTML=s,this.h()},l(n){e=d(n,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-1g7vgme"&&(e.innerHTML=s),this.h()},h(){c(e,"class","svelte-11o4zfu")},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function Ms(o){let e,s;const n=[o[0],Kt];let a={$$slots:{default:[Ds]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(Kt)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Kt={description:"🚗 2️⃣  The `transition:` contract..."};function js(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let Ps=class extends Y{constructor(e){super(),K(this,e,js,Ms,W,{})}};function Vs(o){let e,s='The <code class="inline">transition:</code> contract',n,a,t,l=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=f("h2"),e.innerHTML=s,n=T(),a=f("div"),t=new Pe(!1),this.h()},l(r){e=d(r,"H2",{"data-svelte-h":!0}),q(e)!=="svelte-jzc1oh"&&(e.innerHTML=s),n=E(r),a=d(r,"DIV",{class:!0});var u=$(a);t=Ve(u,!1),u.forEach(i),this.h()},h(){t.a=null,c(a,"class","code-section")},m(r,u){m(r,e,u),m(r,n,u),m(r,a,u),t.m(l,a)},p:re,d(r){r&&(i(e),i(n),i(a))}}}function Xs(o){let e,s;const n=[o[0],Zt];let a={$$slots:{default:[Vs]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(Zt)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Zt={description:"The `transition:` contract..."};function Ss(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let qs=class extends Y{constructor(e){super(),K(this,e,Ss,Xs,W,{})}};function Os(o){let e,s='The <code class="inline">transition:</code> contract',n,a,t,l=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=f("h2"),e.innerHTML=s,n=T(),a=f("div"),t=new Pe(!1),this.h()},l(r){e=d(r,"H2",{"data-svelte-h":!0}),q(e)!=="svelte-jzc1oh"&&(e.innerHTML=s),n=E(r),a=d(r,"DIV",{class:!0});var u=$(a);t=Ve(u,!1),u.forEach(i),this.h()},h(){t.a=null,c(a,"class","code-section")},m(r,u){m(r,e,u),m(r,n,u),m(r,a,u),t.m(l,a)},p:re,d(r){r&&(i(e),i(n),i(a))}}}function Fs(o){let e,s;const n=[o[0],Qt];let a={$$slots:{default:[Os]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(Qt)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const Qt={description:"The `transition:` contract..."};function zs(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let As=class extends Y{constructor(e){super(),K(this,e,zs,Fs,W,{})}};function Us(o){let e,s='The <code class="inline">transition:</code> contract',n,a,t,l=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=f("h2"),e.innerHTML=s,n=T(),a=f("div"),t=new Pe(!1),this.h()},l(r){e=d(r,"H2",{"data-svelte-h":!0}),q(e)!=="svelte-jzc1oh"&&(e.innerHTML=s),n=E(r),a=d(r,"DIV",{class:!0});var u=$(a);t=Ve(u,!1),u.forEach(i),this.h()},h(){t.a=null,c(a,"class","code-section")},m(r,u){m(r,e,u),m(r,n,u),m(r,a,u),t.m(l,a)},p:re,d(r){r&&(i(e),i(n),i(a))}}}function Bs(o){let e,s;const n=[o[0],en];let a={$$slots:{default:[Us]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(en)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const en={description:"The `transition:` contract..."};function Ns(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let Js=class extends Y{constructor(e){super(),K(this,e,Ns,Bs,W,{})}};function tn(o,e,s){const n=o.slice();return n[1]=e[s],n}function nn(o){let e,s=o[1].name+"",n;return{c(){e=f("option"),n=pe(s),this.h()},l(a){e=d(a,"OPTION",{});var t=$(e);n=fe(t,s),t.forEach(i),this.h()},h(){e.__value=o[1],Me(e,e.__value)},m(a,t){m(a,e,t),p(e,n)},p:re,d(a){a&&i(e)}}}function Rs(o){let e,s,n,a,t,l,r,u,h,k,M,_,v,P,b,g,j,x,H,I,w,B,A,V,F,ae,Xe,ie,me,te,ne,de,he,ye=(o[0]===11?o[4].toFixed(3):o[0]===12?"Hello World".slice(0,Math.round(11*o[4])):"")+"",ge,Se,U,Oe,Je,at,lt,ot,xe,rt,$e,Re,it,be,Ge,ct,we,We,ut,pt,ft,Te,Ye,dt,Ee,ht,Ie,vt,Le,kt,Ce,_t,$t,Fe=st(o[8]),ce=[];for(let D=0;D<Fe.length;D+=1)ce[D]=nn(tn(o,Fe,D));return{c(){e=f("div"),s=f("div"),n=f("select");for(let D=0;D<ce.length;D+=1)ce[D].c();a=T(),t=le("svg"),l=le("defs"),r=le("marker"),u=le("path"),h=le("path"),k=le("g"),M=le("text"),_=pe("0"),v=le("text"),P=pe("1"),b=le("text"),g=pe("eased time"),j=le("path"),x=le("g"),H=le("text"),I=pe("1"),w=le("text"),B=pe("0"),A=le("text"),V=pe("time"),F=le("polyline"),ae=le("circle"),Xe=T(),ie=le("svg"),me=le("path"),te=le("path"),ne=le("circle"),de=T(),he=f("div"),ge=pe(ye),Se=T(),U=f("div"),Oe=f("div"),at=T(),lt=f("br"),ot=T(),xe=f("div"),rt=T(),$e=f("div"),it=T(),be=f("div"),ct=T(),we=f("div"),ut=T(),pt=f("br"),ft=T(),Te=f("div"),dt=T(),Ee=f("div"),ht=T(),Ie=f("div"),vt=T(),Le=f("div"),kt=T(),Ce=f("div"),this.h()},l(D){e=d(D,"DIV",{class:!0});var z=$(e);s=d(z,"DIV",{class:!0});var Q=$(s);n=d(Q,"SELECT",{class:!0});var Ue=$(n);for(let mt=0;mt<ce.length;mt+=1)ce[mt].l(Ue);Ue.forEach(i),a=E(Q),t=oe(Q,"svg",{width:!0,height:!0,class:!0});var He=$(t);l=oe(He,"defs",{});var bt=$(l);r=oe(bt,"marker",{id:!0,orient:!0,markerWidth:!0,markerHeight:!0,refX:!0,refY:!0});var wt=$(r);u=oe(wt,"path",{d:!0,fill:!0}),$(u).forEach(i),wt.forEach(i),bt.forEach(i),h=oe(He,"path",{d:!0,"marker-end":!0,stroke:!0}),$(h).forEach(i),k=oe(He,"g",{class:!0,transform:!0});var Ke=$(k);M=oe(Ke,"text",{x:!0,class:!0});var Tt=$(M);_=fe(Tt,"0"),Tt.forEach(i),v=oe(Ke,"text",{x:!0,class:!0});var Et=$(v);P=fe(Et,"1"),Et.forEach(i),b=oe(Ke,"text",{x:!0,class:!0});var It=$(b);g=fe(It,"eased time"),It.forEach(i),Ke.forEach(i),j=oe(He,"path",{d:!0,"marker-end":!0,stroke:!0}),$(j).forEach(i),x=oe(He,"g",{class:!0,transform:!0});var Ze=$(x);H=oe(Ze,"text",{y:!0,class:!0});var Lt=$(H);I=fe(Lt,"1"),Lt.forEach(i),w=oe(Ze,"text",{y:!0,class:!0});var Ct=$(w);B=fe(Ct,"0"),Ct.forEach(i),A=oe(Ze,"text",{y:!0,class:!0});var Ht=$(A);V=fe(Ht,"time"),Ht.forEach(i),Ze.forEach(i),F=oe(He,"polyline",{points:!0,class:!0}),$(F).forEach(i),ae=oe(He,"circle",{r:!0,fill:!0,cx:!0,cy:!0}),$(ae).forEach(i),He.forEach(i),Xe=E(Q),ie=oe(Q,"svg",{height:!0,width:!0,style:!0,class:!0});var Qe=$(ie);me=oe(Qe,"path",{d:!0,stroke:!0,"stroke-width":!0}),$(me).forEach(i),te=oe(Qe,"path",{d:!0,stroke:!0,"stroke-width":!0}),$(te).forEach(i),ne=oe(Qe,"circle",{r:!0,fill:!0,cx:!0,cy:!0}),$(ne).forEach(i),Qe.forEach(i),de=E(Q),he=d(Q,"DIV",{class:!0,style:!0});var Dt=$(he);ge=fe(Dt,ye),Dt.forEach(i),Q.forEach(i),Se=E(z),U=d(z,"DIV",{class:!0});var se=$(U);Oe=d(se,"DIV",{class:!0}),$(Oe).forEach(i),at=E(se),lt=d(se,"BR",{}),ot=E(se),xe=d(se,"DIV",{class:!0}),$(xe).forEach(i),rt=E(se),$e=d(se,"DIV",{class:!0}),$($e).forEach(i),it=E(se),be=d(se,"DIV",{class:!0}),$(be).forEach(i),ct=E(se),we=d(se,"DIV",{class:!0}),$(we).forEach(i),ut=E(se),pt=d(se,"BR",{}),ft=E(se),Te=d(se,"DIV",{class:!0}),$(Te).forEach(i),dt=E(se),Ee=d(se,"DIV",{class:!0}),$(Ee).forEach(i),ht=E(se),Ie=d(se,"DIV",{class:!0}),$(Ie).forEach(i),vt=E(se),Le=d(se,"DIV",{class:!0}),$(Le).forEach(i),kt=E(se),Ce=d(se,"DIV",{class:!0}),$(Ce).forEach(i),se.forEach(i),z.forEach(i),this.h()},h(){c(n,"class","svelte-ea51ja"),o[1]===void 0&&qe(()=>o[9].call(n)),S(n,"hidden",o[0]<2),c(u,"d","M0,0 V12 L6,6 Z"),c(u,"fill","black"),c(r,"id","head"),c(r,"orient","auto"),c(r,"markerWidth","6"),c(r,"markerHeight","12"),c(r,"refX","0.1"),c(r,"refY","6"),c(h,"d","M0,0 200,0"),c(h,"marker-end","url(#head)"),c(h,"stroke","black"),c(M,"x","0"),c(M,"class","svelte-ea51ja"),c(v,"x","200"),c(v,"class","svelte-ea51ja"),c(b,"x","100"),c(b,"class","svelte-ea51ja"),c(k,"class","x svelte-ea51ja"),c(k,"transform","translate(0,-10)"),c(j,"d","M0,0 0,200"),c(j,"marker-end","url(#head)"),c(j,"stroke","black"),c(H,"y","200"),c(H,"class","svelte-ea51ja"),c(w,"y","0"),c(w,"class","svelte-ea51ja"),c(A,"y","100"),c(A,"class","svelte-ea51ja"),c(x,"class","y svelte-ea51ja"),c(x,"transform","translate(-10,0)"),c(F,"points",o[7]),c(F,"class","svelte-ea51ja"),c(ae,"r","5"),c(ae,"fill","red"),c(ae,"cx",o[5]),c(ae,"cy",o[6]),S(ae,"hidden",o[0]<1),c(t,"width","200"),c(t,"height","200"),c(t,"class","svelte-ea51ja"),c(me,"d","M-50,0 250,0"),c(me,"stroke","#ddd"),c(me,"stroke-width","2"),c(te,"d","M0,0 200,0"),c(te,"stroke","black"),c(te,"stroke-width","3"),c(ne,"r","5"),c(ne,"fill","black"),c(ne,"cx",o[5]),c(ne,"cy","0"),c(ie,"height","5"),c(ie,"width","200"),Be(ie,"margin","1em 0"),c(ie,"class","svelte-ea51ja"),S(ie,"hidden",o[0]<1),c(he,"class","square svelte-ea51ja"),Be(he,"transform","translateX("+(o[0]===9||o[0]===8?o[4]:o[0]===10?1-o[4]:0)*250+"px)"),S(he,"hidden",o[0]<8),c(s,"class","left svelte-ea51ja"),c(Oe,"class","code"),c(xe,"class","code"),S(xe,"hidden",o[0]<4),c($e,"class","code"),S($e,"hidden",o[0]<5),c(be,"class","code"),S(be,"hidden",o[0]<6),c(we,"class","code"),S(we,"hidden",o[0]<7),c(Te,"class","code svelte-ea51ja"),S(Te,"none",o[0]!==8),c(Ee,"class","code svelte-ea51ja"),S(Ee,"none",o[0]!==9),c(Ie,"class","code svelte-ea51ja"),S(Ie,"none",o[0]!==10),c(Le,"class","code svelte-ea51ja"),S(Le,"none",o[0]!==11),c(Ce,"class","code svelte-ea51ja"),S(Ce,"none",o[0]!==12),c(U,"class","right svelte-ea51ja"),S(U,"hidden",o[0]<3),c(e,"class","container svelte-ea51ja")},m(D,z){m(D,e,z),p(e,s),p(s,n);for(let Q=0;Q<ce.length;Q+=1)ce[Q]&&ce[Q].m(n,null);Mt(n,o[1],!0),p(s,a),p(s,t),p(t,l),p(l,r),p(r,u),p(t,h),p(t,k),p(k,M),p(M,_),p(k,v),p(v,P),p(k,b),p(b,g),p(t,j),p(t,x),p(x,H),p(H,I),p(x,w),p(w,B),p(x,A),p(A,V),p(t,F),p(t,ae),p(s,Xe),p(s,ie),p(ie,me),p(ie,te),p(ie,ne),p(s,de),p(s,he),p(he,ge),p(e,Se),p(e,U),p(U,Oe),p(U,at),p(U,lt),p(U,ot),p(U,xe),p(U,rt),p(U,$e),p(U,it),p(U,be),p(U,ct),p(U,we),p(U,ut),p(U,pt),p(U,ft),p(U,Te),p(U,dt),p(U,Ee),p(U,ht),p(U,Ie),p(U,vt),p(U,Le),p(U,kt),p(U,Ce),_t||($t=[ke(n,"change",o[9]),ue(Je=ve.call(null,Oe,o[1].fn.toString())),ue(ve.call(null,xe,"let start = Date.now();")),ue(Re=ve.call(null,$e,`let t = Date.now() - start; // ${sn(o[2])}`)),ue(Ge=ve.call(null,be,`t = t / duration; // ${o[3].toFixed(3)}`)),ue(We=ve.call(null,we,`t = ${o[1].fn.name}(t); // ${o[4].toFixed(3)}`)),ue(Ye=ve.call(null,Te,`node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(o[4]*250).toFixed(1)}px)`)),ue(ve.call(null,Ee,"css: (t, u) => `translateX(${t * 250}px)`")),ue(ve.call(null,Ie,"css: (t, u) => `translateX(${u * 250}px)`")),ue(ve.call(null,Le,"tick: (t, u) => node.textContent = t")),ue(ve.call(null,Ce,`const string = 'Hello World';
tick: (t, u) => {
  node.textContent = string.slice(0, Math.round(string.length * t));
}`))],_t=!0)},p(D,[z]){if(z&256){Fe=st(D[8]);let Q;for(Q=0;Q<Fe.length;Q+=1){const Ue=tn(D,Fe,Q);ce[Q]?ce[Q].p(Ue,z):(ce[Q]=nn(Ue),ce[Q].c(),ce[Q].m(n,null))}for(;Q<ce.length;Q+=1)ce[Q].d(1);ce.length=Fe.length}z&258&&Mt(n,D[1]),z&1&&S(n,"hidden",D[0]<2),z&128&&c(F,"points",D[7]),z&32&&c(ae,"cx",D[5]),z&64&&c(ae,"cy",D[6]),z&1&&S(ae,"hidden",D[0]<1),z&32&&c(ne,"cx",D[5]),z&1&&S(ie,"hidden",D[0]<1),z&17&&ye!==(ye=(D[0]===11?D[4].toFixed(3):D[0]===12?"Hello World".slice(0,Math.round(11*D[4])):"")+"")&&xt(ge,ye),z&17&&Be(he,"transform","translateX("+(D[0]===9||D[0]===8?D[4]:D[0]===10?1-D[4]:0)*250+"px)"),z&1&&S(he,"hidden",D[0]<8),Je&&_e(Je.update)&&z&2&&Je.update.call(null,D[1].fn.toString()),z&1&&S(xe,"hidden",D[0]<4),Re&&_e(Re.update)&&z&4&&Re.update.call(null,`let t = Date.now() - start; // ${sn(D[2])}`),z&1&&S($e,"hidden",D[0]<5),Ge&&_e(Ge.update)&&z&8&&Ge.update.call(null,`t = t / duration; // ${D[3].toFixed(3)}`),z&1&&S(be,"hidden",D[0]<6),We&&_e(We.update)&&z&18&&We.update.call(null,`t = ${D[1].fn.name}(t); // ${D[4].toFixed(3)}`),z&1&&S(we,"hidden",D[0]<7),Ye&&_e(Ye.update)&&z&16&&Ye.update.call(null,`node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(D[4]*250).toFixed(1)}px)`),z&1&&S(Te,"none",D[0]!==8),z&1&&S(Ee,"none",D[0]!==9),z&1&&S(Ie,"none",D[0]!==10),z&1&&S(Le,"none",D[0]!==11),z&1&&S(Ce,"none",D[0]!==12),z&1&&S(U,"hidden",D[0]<3)},i:re,o:re,d(D){D&&i(e),En(ce,D),_t=!1,Ne($t)}}}function Gs(o){return o}function Ws(o){let e="";for(let s=0;s<1;s+=.005)e+=`${o(s)*200},${s*200} `;return e}function sn(o){return o-o%5}function Ys(o,e,s){let n,a,t=[{name:"linear",fn:Gs},{name:"bounceInOut",fn:Xn},{name:"bounceIn",fn:Sn},{name:"bounceOut",fn:nt},{name:"cubicInOut",fn:qn},{name:"cubicIn",fn:On},{name:"cubicOut",fn:Fn},{name:"quadInOut",fn:Ln},{name:"quadIn",fn:zn},{name:"quadOut",fn:An},{name:"quartInOut",fn:Un},{name:"quartIn",fn:Bn},{name:"quartOut",fn:Nn}],l=t[0],r=Date.now(),u,h=0,k=0,{i:M=3}=e,_=0,v=0,P;function b(){const j=Date.now();s(2,u=(j-r)%n),s(3,h=u/n),s(4,k=l.fn(h)),s(6,v=h*200),s(5,_=l.fn(h)*200),P=requestAnimationFrame(b)}P=requestAnimationFrame(b),Hn(()=>{cancelAnimationFrame(P)});function g(){l=Mn(this),s(1,l),s(8,t)}return o.$$set=j=>{"i"in j&&s(0,M=j.i)},o.$$.update=()=>{o.$$.dirty&1&&(n=M<5?2e3:8e3),o.$$.dirty&2&&s(7,a=Ws(l.fn))},[M,l,u,h,k,_,v,a,t,g]}class Ks extends Y{constructor(e){super(),K(this,e,Ys,Rs,W,{i:0})}}function Zs(o){let e,s;return e=new Ks({props:{i:o[0]}}),{c(){N(e.$$.fragment)},l(n){J(e.$$.fragment,n)},m(n,a){R(e,n,a),s=!0},p(n,a){const t={};a&1&&(t.i=n[0]),e.$set(t)},i(n){s||(X(e.$$.fragment,n),s=!0)},o(n){O(e.$$.fragment,n),s=!1},d(n){G(e,n)}}}function Qs(o){let e,s;const n=[o[1],an];let a={$$slots:{default:[Zs]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&2?Z(n,[l&2&&C(t[1]),l&0&&C(an)]):{};l&17&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const an={description:"..."},ln=12;function ea(o,e,s){let n=0;function a(){return n<ln&&s(0,n++,n)<ln}function t(){return n>0&&s(0,n--,n)>0}return o.$$set=l=>{s(1,e=y(y({},e),L(l)))},e=L(e),[n,e,a,t]}let ta=class extends Y{constructor(e){super(),K(this,e,ea,Qs,W,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}};function na(o){let e,s='The <code class="inline">transition:</code> contract',n,a,t,l=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=f("h2"),e.innerHTML=s,n=T(),a=f("div"),t=new Pe(!1),this.h()},l(r){e=d(r,"H2",{"data-svelte-h":!0}),q(e)!=="svelte-jzc1oh"&&(e.innerHTML=s),n=E(r),a=d(r,"DIV",{class:!0});var u=$(a);t=Ve(u,!1),u.forEach(i),this.h()},h(){t.a=null,c(a,"class","code-section")},m(r,u){m(r,e,u),m(r,n,u),m(r,a,u),t.m(l,a)},p:re,d(r){r&&(i(e),i(n),i(a))}}}function sa(o){let e,s;const n=[o[0],on];let a={$$slots:{default:[na]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(on)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const on={description:"The `transition:` contract..."};function aa(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let la=class extends Y{constructor(e){super(),K(this,e,aa,sa,W,{})}};function oa(o){let e,s;return{c(){e=f("iframe"),this.h()},l(n){e=d(n,"IFRAME",{title:!0,src:!0,class:!0}),$(e).forEach(i),this.h()},h(){c(e,"title","Svelte REPL"),$n(e.src,s="https://svelte.dev/repl/c88da2fde68a415cbd43aa738bfcefab?version=3.29.0")||c(e,"src",s),c(e,"class","svelte-cxmxle")},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function ra(o){let e,s;const n=[o[0],rn];let a={$$slots:{default:[oa]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(rn)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const rn={description:"..."};function ia(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let ca=class extends Y{constructor(e){super(),K(this,e,ia,ra,W,{})}};function ua(o){let e,s='<h1 class="svelte-1q4kbmd">🚀 3️⃣  Compile <code class="inline">transition:</code> in your Head</h1> <div><div>📚 Compile Svelte in your head</div> <div><a href="https://lihautan.com/compile-svelte-in-your-head">https://lihautan.com/compile-svelte-in-your-head</a></div></div>';return{c(){e=f("div"),e.innerHTML=s,this.h()},l(n){e=d(n,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-m2ln3r"&&(e.innerHTML=s),this.h()},h(){c(e,"class","container svelte-1q4kbmd")},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function pa(o){let e,s;const n=[o[0],cn];let a={$$slots:{default:[ua]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(cn)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const cn={description:"🚀 3️⃣  Compile `transition:` in your Head..."};function fa(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let da=class extends Y{constructor(e){super(),K(this,e,fa,pa,W,{})}};function ha(o){let e,s,n='<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">&lt;</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;TEST&lt;/</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;</span></span></code></pre>';return{c(){e=f("div"),s=new Pe(!1),this.h()},l(a){e=d(a,"DIV",{class:!0});var t=$(e);s=Ve(t,!1),t.forEach(i),this.h()},h(){s.a=null,c(e,"class","code-section")},m(a,t){m(a,e,t),s.m(n,e)},d(a){a&&i(e)}}}function va(o){let e,s,n='<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">&lt;</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">class</span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-token-string-expression)">&quot;transparent&quot;</span><span style="color: var(--shiki-color-text)">&gt;TEST&lt;/</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;</span></span></code></pre>';return{c(){e=f("div"),s=new Pe(!1),this.h()},l(a){e=d(a,"DIV",{class:!0});var t=$(e);s=Ve(t,!1),t.forEach(i),this.h()},h(){s.a=null,c(e,"class","code-section")},m(a,t){m(a,e,t),s.m(n,e)},d(a){a&&i(e)}}}function ka(o){let e,s="CSS Transition",n,a,t,l=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">opacity</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">1</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">transition</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">opacity 1</span><span style="color: var(--shiki-token-keyword)">s</span><span style="color: var(--shiki-token-constant)"> ease 0.5</span><span style="color: var(--shiki-token-keyword)">s</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span>
<span class="line"><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-token-function)">.transparent</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">opacity</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">0</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`,r,u,h,k,M="TEST",_,v,P=o[0]?"Remove":"Add",b,g,j,x,H,I;function w(V,F){return V[0]?va:ha}let B=w(o),A=B(o);return{c(){e=f("h1"),e.textContent=s,n=T(),a=f("div"),t=new Pe(!1),r=T(),u=f("hr"),h=T(),k=f("div"),k.textContent=M,_=T(),v=f("button"),b=pe(P),g=pe(" class"),j=T(),A.c(),x=tt(),this.h()},l(V){e=d(V,"H1",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-i55sie"&&(e.textContent=s),n=E(V),a=d(V,"DIV",{class:!0});var F=$(a);t=Ve(F,!1),F.forEach(i),r=E(V),u=d(V,"HR",{}),h=E(V),k=d(V,"DIV",{id:!0,class:!0,"data-svelte-h":!0}),q(k)!=="svelte-1c2j32i"&&(k.textContent=M),_=E(V),v=d(V,"BUTTON",{});var ae=$(v);b=fe(ae,P),g=fe(ae," class"),ae.forEach(i),j=E(V),A.l(V),x=tt(),this.h()},h(){c(e,"class","svelte-1nbgh8f"),t.a=null,c(a,"class","code-section"),c(k,"id","demo"),c(k,"class","svelte-1nbgh8f"),S(k,"transparent",o[0])},m(V,F){m(V,e,F),m(V,n,F),m(V,a,F),t.m(l,a),m(V,r,F),m(V,u,F),m(V,h,F),m(V,k,F),m(V,_,F),m(V,v,F),p(v,b),p(v,g),m(V,j,F),A.m(V,F),m(V,x,F),H||(I=ke(v,"click",o[1]),H=!0)},p(V,F){F&1&&S(k,"transparent",V[0]),F&1&&P!==(P=V[0]?"Remove":"Add")&&xt(b,P),B!==(B=w(V))&&(A.d(1),A=B(V),A&&(A.c(),A.m(x.parentNode,x)))},d(V){V&&(i(e),i(n),i(a),i(r),i(u),i(h),i(k),i(_),i(v),i(j),i(x)),A.d(V),H=!1,I()}}}function _a(o){let e,s;const n=[o[2],un];let a={$$slots:{default:[ka]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&4?Z(n,[l&4&&C(t[2]),l&0&&C(un)]):{};l&9&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const un={description:"CSS Transition..."};function ma(o,e,s){let n=!1;function a(){s(0,n=!n)}return o.$$set=t=>{s(2,e=y(y({},e),L(t)))},e=L(e),[n,a,e]}let ya=class extends Y{constructor(e){super(),K(this,e,ma,_a,W,{})}};const ga=`<style>
{{rule}}
  div {
    animation: slide {{duration}}s linear;
  }
</style>
<div>TEXT</div>`,xa=`  @keyframes slide {
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
  }`,$a=`  @keyframes slide {
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
  }`,ba=`  @keyframes slide {
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
  }`;function wa(o){let e,s="CSS Animations",n,a,t,l,r,u,h,k,M,_,v,P,b,g,j,x,H,I,w,B,A,V,F,ae,Xe,ie,me;return Xe=jn(o[5][0]),{c(){e=f("h1"),e.textContent=s,n=T(),a=f("div"),t=f("div"),r=T(),u=f("div"),h=f("label"),k=f("input"),M=pe("Linear"),_=T(),v=f("label"),P=f("input"),b=pe("2 Animations"),g=T(),j=f("label"),x=f("input"),H=pe("Cubic Easing"),I=T(),w=f("label"),B=pe("Duration: "),A=f("input"),V=T(),F=f("div"),ae=pe("TEXT"),this.h()},l(te){e=d(te,"H1",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-1bbyg12"&&(e.textContent=s),n=E(te),a=d(te,"DIV",{class:!0});var ne=$(a);t=d(ne,"DIV",{class:!0}),$(t).forEach(i),r=E(ne),u=d(ne,"DIV",{class:!0});var de=$(u);h=d(de,"LABEL",{});var he=$(h);k=d(he,"INPUT",{type:!0}),M=fe(he,"Linear"),he.forEach(i),_=E(de),v=d(de,"LABEL",{});var ye=$(v);P=d(ye,"INPUT",{type:!0}),b=fe(ye,"2 Animations"),ye.forEach(i),g=E(de),j=d(de,"LABEL",{});var ge=$(j);x=d(ge,"INPUT",{type:!0}),H=fe(ge,"Cubic Easing"),ge.forEach(i),I=E(de),w=d(de,"LABEL",{});var Se=$(w);B=fe(Se,"Duration: "),A=d(Se,"INPUT",{type:!0,min:!0,max:!0,step:!0}),Se.forEach(i),V=E(de),F=d(de,"DIV",{style:!0});var U=$(F);ae=fe(U,"TEXT"),U.forEach(i),de.forEach(i),ne.forEach(i),this.h()},h(){c(e,"class","svelte-3ssdsl"),c(t,"class","code"),c(k,"type","radio"),k.__value="anim1",Me(k,k.__value),c(P,"type","radio"),P.__value="anim2",Me(P,P.__value),c(x,"type","radio"),x.__value="anim3",Me(x,x.__value),c(A,"type","range"),c(A,"min","100"),c(A,"max","5000"),c(A,"step","50"),Be(F,"animation",o[0]+" "+o[1]+"ms linear infinite both"),c(u,"class","demo svelte-3ssdsl"),c(a,"class","container svelte-3ssdsl"),Xe.p(k,P,x)},m(te,ne){m(te,e,ne),m(te,n,ne),m(te,a,ne),p(a,t),p(a,r),p(a,u),p(u,h),p(h,k),k.checked=k.__value===o[0],p(h,M),p(u,_),p(u,v),p(v,P),P.checked=P.__value===o[0],p(v,b),p(u,g),p(u,j),p(j,x),x.checked=x.__value===o[0],p(j,H),p(u,I),p(u,w),p(w,B),p(w,A),Me(A,o[1]),p(u,V),p(u,F),p(F,ae),ie||(me=[ue(l=Jn.call(null,t,{code:o[2],lang:Xt.languages.html})),ke(k,"change",o[4]),ke(P,"change",o[6]),ke(x,"change",o[7]),ke(A,"change",o[8]),ke(A,"input",o[8])],ie=!0)},p(te,ne){l&&_e(l.update)&&ne&4&&l.update.call(null,{code:te[2],lang:Xt.languages.html}),ne&1&&(k.checked=k.__value===te[0]),ne&1&&(P.checked=P.__value===te[0]),ne&1&&(x.checked=x.__value===te[0]),ne&2&&Me(A,te[1]),ne&3&&Be(F,"animation",te[0]+" "+te[1]+"ms linear infinite both")},d(te){te&&(i(e),i(n),i(a)),Xe.r(),ie=!1,Ne(me)}}}function Ta(o){let e,s;const n=[o[3],pn];let a={$$slots:{default:[wa]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&8?Z(n,[l&8&&C(t[3]),l&0&&C(pn)]):{};l&1031&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const pn={description:"CSS Animations..."};function Ea(o,e,s){let n;const a={anim1:xa,anim2:$a,anim3:ba};let t="anim1",l=3e3;const r=[[]];function u(){t=this.__value,s(0,t)}function h(){t=this.__value,s(0,t)}function k(){t=this.__value,s(0,t)}function M(){l=In(this.value),s(1,l)}return o.$$set=_=>{s(3,e=y(y({},e),L(_)))},o.$$.update=()=>{o.$$.dirty&3&&s(2,n=ga.replace("{{rule}}",a[t]).replace("{{duration}}",(l/1e3).toFixed(2)))},e=L(e),[t,l,n,e,u,r,h,k,M]}let Ia=class extends Y{constructor(e){super(),K(this,e,Ea,Ta,W,{})}};const La=`const string = 'Hello World';
const duration = {{duration}}

let start = Date.now();

function loop() {
  const now = Date.now();
  // time ranges from [0, 1]
  const time = (now - start) / duration;

  div.textContent = string.slice(0, Math.round(time * string.length));

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);`;function Ca(o){let e,s="JS Animations",n,a,t,l,r,u,h,k,M;return{c(){e=f("h1"),e.textContent=s,n=T(),a=f("div"),l=T(),r=f("input"),u=T(),h=f("div"),this.h()},l(_){e=d(_,"H1",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-1rtz5mo"&&(e.textContent=s),n=E(_),a=d(_,"DIV",{class:!0}),$(a).forEach(i),l=E(_),r=d(_,"INPUT",{type:!0,min:!0,max:!0,step:!0}),u=E(_),h=d(_,"DIV",{}),$(h).forEach(i),this.h()},h(){c(e,"class","svelte-9k5trb"),c(a,"class","code"),c(r,"type","range"),c(r,"min","100"),c(r,"max","10000"),c(r,"step","50")},m(_,v){m(_,e,v),m(_,n,v),m(_,a,v),m(_,l,v),m(_,r,v),Me(r,o[0]),m(_,u,v),m(_,h,v),o[5](h),k||(M=[ue(t=ve.call(null,a,o[2])),ke(r,"change",o[4]),ke(r,"input",o[4])],k=!0)},p(_,v){t&&_e(t.update)&&v&4&&t.update.call(null,_[2]),v&1&&Me(r,_[0])},d(_){_&&(i(e),i(n),i(a),i(l),i(r),i(u),i(h)),o[5](null),k=!1,Ne(M)}}}function Ha(o){let e,s;const n=[o[3],fn];let a={$$slots:{default:[Ca]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&8?Z(n,[l&8&&C(t[3]),l&0&&C(fn)]):{};l&135&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const fn={description:"JS Animations..."},et="Hello World";function Da(o,e,s){let n,a=3e3,t,l=Date.now();Dn(()=>{let h;function k(){const _=(Date.now()-l)/a,v=Math.round(_*et.length)%et.length;s(1,t.textContent=et.slice(0,v===0?et.length:v),t),h=requestAnimationFrame(k)}return h=requestAnimationFrame(k),()=>cancelAnimationFrame(h)});function r(){a=In(this.value),s(0,a)}function u(h){bn[h?"unshift":"push"](()=>{t=h,s(1,t)})}return o.$$set=h=>{s(3,e=y(y({},e),L(h)))},o.$$.update=()=>{o.$$.dirty&1&&s(2,n=La.replace("{{duration}}",`${a}; // ${(a/1e3).toFixed(2)}s`))},e=L(e),[a,t,n,e,r,u]}let Ma=class extends Y{constructor(e){super(),K(this,e,Da,Ha,W,{})}};function ja(o){let e,s='<code class="inline">transition:</code> in Vanilla JS';return{c(){e=f("h1"),e.innerHTML=s},l(n){e=d(n,"H1",{"data-svelte-h":!0}),q(e)!=="svelte-1mzothf"&&(e.innerHTML=s)},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function Pa(o){let e,s;const n=[o[0],dn];let a={$$slots:{default:[ja]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(dn)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const dn={description:"`transition:` in Vanilla JS..."};function Va(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let Xa=class extends Y{constructor(e){super(),K(this,e,Va,Pa,W,{})}};function Sa(o){let e,s='<code class="inline">transition:</code> in compiled JS';return{c(){e=f("h1"),e.innerHTML=s},l(n){e=d(n,"H1",{"data-svelte-h":!0}),q(e)!=="svelte-1i0ilrp"&&(e.innerHTML=s)},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function qa(o){let e,s;const n=[o[0],hn];let a={$$slots:{default:[Sa]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(hn)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const hn={description:"`transition:` in compiled JS..."};function Oa(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let Fa=class extends Y{constructor(e){super(),K(this,e,Oa,qa,W,{})}};const za=`function create_fragment(ctx) {
  return {
    /* create */  c() { /* ... */ },
    /* mount */   m(target, anchor) { /* ... */ },
    /* update */  p(ctx, dirty) { /* ... */ },
    /* destroy */ d(detaching) { /* ... */ }
  };
}
`,Aa=`function create_fragment(ctx) {
  return {
    /* create */  c() { /* ... */ },
    /* mount */   m(target, anchor) { /* ... */ },
    /* update */  p(ctx, dirty) { /* ... */ },

    /* intro */   i(local) { /* ... */ },
    /* outro */   o(local) { /* ... */ },

    /* destroy */ d(detaching) { /* ... */ }
  };
}
`;function Ua(o){let e,s,n,a,t;return{c(){e=f("div"),s=f("div"),this.h()},l(l){e=d(l,"DIV",{class:!0});var r=$(e);s=d(r,"DIV",{class:!0}),$(s).forEach(i),r.forEach(i),this.h()},h(){c(s,"class","code"),c(e,"class","container svelte-slvxkp")},m(l,r){m(l,e,r),p(e,s),a||(t=ue(n=ve.call(null,s,o[0])),a=!0)},p(l,r){n&&_e(n.update)&&r&1&&n.update.call(null,l[0])},d(l){l&&i(e),a=!1,t()}}}function Ba(o){let e,s;const n=[o[1],vn];let a={$$slots:{default:[Ua]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&2?Z(n,[l&2&&C(t[1]),l&0&&C(vn)]):{};l&33&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const vn={description:"..."};function Na(o,e,s){let n,a=0;function t(){return a<1&&s(4,a++,a)<1}function l(){return a>0&&s(4,a--,a)>0}return o.$$set=r=>{s(1,e=y(y({},e),L(r)))},o.$$.update=()=>{o.$$.dirty&16&&s(0,n=[za,Aa][a])},e=L(e),[n,e,t,l,a]}let Ja=class extends Y{constructor(e){super(),K(this,e,Na,Ba,W,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}};const De=`{#each array as item}
  <div transition:fade={{ delay: 10 }} />
{/each}`,Ra=`{#each array as item}
  <div in:fade={{ delay: 10 }} />
{/each}`,Ga=`{#each array as item}
  <div out:fade={{ delay: 10 }} />
{/each}`,Wa=`// <div transition:fade />
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
`,Ya=`// <div transition:fade />
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
`,Ka=`// <div transition:fade />
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
}`,Za=`// <div transition:fade />
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
}`,Qa=`// <div transition:fade />
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
}`,el=`// <div transition:fade />
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
`,tl=`// <div transition:fade />
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
`,nl=`// <div transition:fade />
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
`,sl=`// <div transition:fade />
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
`,al=`// <div transition:fade />
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
`;function ll(o){let e,s,n,a,t,l,r,u,h,k,M;return{c(){e=f("div"),s=f("div"),a=T(),t=f("div"),r=T(),u=f("div"),this.h()},l(_){e=d(_,"DIV",{class:!0});var v=$(e);s=d(v,"DIV",{class:!0}),$(s).forEach(i),a=E(v),t=d(v,"DIV",{class:!0}),$(t).forEach(i),v.forEach(i),r=E(_),u=d(_,"DIV",{class:!0}),$(u).forEach(i),this.h()},h(){c(s,"class","code svelte-oi1ldz"),c(t,"class","code svelte-oi1ldz"),c(e,"class","container svelte-oi1ldz"),c(u,"class",h="box box-"+o[0]+" svelte-oi1ldz"),S(u,"hidden",o[0]<1||o[0]===2||o[0]===5)},m(_,v){m(_,e,v),p(e,s),p(e,a),p(e,t),m(_,r,v),m(_,u,v),k||(M=[ue(n=Cn.call(null,s,o[1])),ue(l=ve.call(null,t,o[2]))],k=!0)},p(_,v){n&&_e(n.update)&&v&2&&n.update.call(null,_[1]),l&&_e(l.update)&&v&4&&l.update.call(null,_[2]),v&1&&h!==(h="box box-"+_[0]+" svelte-oi1ldz")&&c(u,"class",h),v&1&&S(u,"hidden",_[0]<1||_[0]===2||_[0]===5)},d(_){_&&(i(e),i(r),i(u)),k=!1,Ne(M)}}}function ol(o){let e,s;const n=[o[3],kn];let a={$$slots:{default:[ll]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&8?Z(n,[l&8&&C(t[3]),l&0&&C(kn)]):{};l&519&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const kn={description:"..."};function rl(o,e,s){let n,a,t=0;const l=[Wa,Ya,Ka,Za,Qa,el,tl,nl,sl,al],r=[De,De,De,De,De,De,De,De,Ra,Ga],u=l.length-1;function h(){return t<u&&s(0,t++,t)<u}function k(){return t>0&&s(0,t--,t)>0}return o.$$set=M=>{s(3,e=y(y({},e),L(M)))},o.$$.update=()=>{o.$$.dirty&1&&s(2,n=l[t]),o.$$.dirty&1&&s(1,a=r[t])},e=L(e),[t,a,n,e,h,k]}let il=class extends Y{constructor(e){super(),K(this,e,rl,ol,W,{next:4,prev:5})}get next(){return this.$$.ctx[4]}get prev(){return this.$$.ctx[5]}};const cl=`export function create_in_transition(node, fn, params) {
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
}`;function ul(o){let e,s,n,a,t,l,r;return{c(){e=f("div"),s=f("div"),n=T(),a=f("div"),this.h()},l(u){e=d(u,"DIV",{class:!0});var h=$(e);s=d(h,"DIV",{class:!0}),$(s).forEach(i),n=E(h),a=d(h,"DIV",{class:!0}),$(a).forEach(i),h.forEach(i),this.h()},h(){c(s,"class","code"),c(a,"class",t="box box-"+o[0]+" svelte-18x8sxj"),S(a,"hidden",!1),c(e,"class","container svelte-18x8sxj")},m(u,h){m(u,e,h),p(e,s),p(e,n),p(e,a),o[6](e),l||(r=ue(ve.call(null,s,o[2])),l=!0)},p(u,h){h&1&&t!==(t="box box-"+u[0]+" svelte-18x8sxj")&&c(a,"class",t),h&1&&S(a,"hidden",!1)},d(u){u&&i(e),o[6](null),l=!1,r()}}}function pl(o){let e,s;const n=[o[3],_n];let a={$$slots:{default:[ul]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&8?Z(n,[l&8&&C(t[3]),l&0&&C(_n)]):{};l&515&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const _n={description:"..."};function fl(o,e,s){let n=0,a;const t=cl,l=[0,0,1920,1920,2064,2064,544,326,208,720,444,444,444],r=l.length-1;function u(){return n<r&&s(0,n++,n)<r}function h(){return n>0&&s(0,n--,n)>0}function k(M){bn[M?"unshift":"push"](()=>{a=M,s(1,a)})}return o.$$set=M=>{s(3,e=y(y({},e),L(M)))},o.$$.update=()=>{o.$$.dirty&3&&a&&l[n]!==void 0&&a.scrollTo({top:l[n],behavior:"smooth"})},e=L(e),[n,a,t,e,u,h,k]}let dl=class extends Y{constructor(e){super(),K(this,e,fl,pl,W,{next:4,prev:5})}get next(){return this.$$.ctx[4]}get prev(){return this.$$.ctx[5]}};function hl(o){let e,s="Source code reference",n,a,t='<a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/transitions.ts" rel="nofollow">src/runtime/internal/transitions.ts</a>',l,r,u='<li><code class="inline">transition_in</code>, <code class="inline">transition_out</code></li> <li><code class="inline">create_in_transition</code>, <code class="inline">create_out_transition</code>, <code class="inline">create_bidirectional_transition</code></li>',h,k,M='<a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/style_manager.ts" rel="nofollow">src/runtime/internal/style_manager.ts</a>',_,v,P='<li><code class="inline">create_rule</code>, <code class="inline">delete_rule</code>, <code class="inline">clear_rules</code></li>',b,g,j='<a href="https://github.com/sveltejs/svelte/blob/master/src/runtime/transition/index.ts" rel="nofollow">src/runtime/transition/index.ts</a> (<code class="inline">svelte/transition</code>)',x,H,I='<li><code class="inline">fade</code>, <code class="inline">fly</code>, <code class="inline">slide</code>, <code class="inline">crossfade</code>, ...</li>';return{c(){e=f("h1"),e.textContent=s,n=T(),a=f("h2"),a.innerHTML=t,l=T(),r=f("ul"),r.innerHTML=u,h=T(),k=f("h2"),k.innerHTML=M,_=T(),v=f("ul"),v.innerHTML=P,b=T(),g=f("h2"),g.innerHTML=j,x=T(),H=f("ul"),H.innerHTML=I,this.h()},l(w){e=d(w,"H1",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-gdt9qv"&&(e.textContent=s),n=E(w),a=d(w,"H2",{class:!0,"data-svelte-h":!0}),q(a)!=="svelte-be61rd"&&(a.innerHTML=t),l=E(w),r=d(w,"UL",{"data-svelte-h":!0}),q(r)!=="svelte-ca3xgf"&&(r.innerHTML=u),h=E(w),k=d(w,"H2",{class:!0,"data-svelte-h":!0}),q(k)!=="svelte-1egy0oj"&&(k.innerHTML=M),_=E(w),v=d(w,"UL",{"data-svelte-h":!0}),q(v)!=="svelte-uinlhy"&&(v.innerHTML=P),b=E(w),g=d(w,"H2",{class:!0,"data-svelte-h":!0}),q(g)!=="svelte-wjhpdi"&&(g.innerHTML=j),x=E(w),H=d(w,"UL",{"data-svelte-h":!0}),q(H)!=="svelte-19jlec1"&&(H.innerHTML=I),this.h()},h(){c(e,"class","svelte-1khujlx"),c(a,"class","svelte-1khujlx"),c(k,"class","svelte-1khujlx"),c(g,"class","svelte-1khujlx")},m(w,B){m(w,e,B),m(w,n,B),m(w,a,B),m(w,l,B),m(w,r,B),m(w,h,B),m(w,k,B),m(w,_,B),m(w,v,B),m(w,b,B),m(w,g,B),m(w,x,B),m(w,H,B)},p:re,d(w){w&&(i(e),i(n),i(a),i(l),i(r),i(h),i(k),i(_),i(v),i(b),i(g),i(x),i(H))}}}function vl(o){let e,s;const n=[o[0],mn];let a={$$slots:{default:[hl]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(mn)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const mn={description:"Source code referencesrc/runtime/internal/transitions.ts`transition_in`, `transition_out``create_in_transition`, `create_out_transition`, `create_bidirectional_transition`src/runtime/internal/style_manager.ts..."};function kl(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let _l=class extends Y{constructor(e){super(),K(this,e,kl,vl,W,{})}};function ml(o){let e,s='<div class="svelte-rvhzm1">🚴‍♂️  Level 1️⃣  - Using <code>transition:</code></div> <div class="svelte-rvhzm1">🚗  Level 2️⃣  - The <code>transition:</code> contract</div> <div class="svelte-rvhzm1">🚀  Level 3️⃣  - Compile <code>transition:</code> in your Head</div>';return{c(){e=f("div"),e.innerHTML=s,this.h()},l(n){e=d(n,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-560u5e"&&(e.innerHTML=s),this.h()},h(){c(e,"class","container svelte-rvhzm1")},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function yl(o){let e,s;const n=[o[0],yn];let a={$$slots:{default:[ml]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(yn)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const yn={description:"..."};function gl(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let xl=class extends Y{constructor(e){super(),K(this,e,gl,yl,W,{})}};function $l(o){let e,s="<div><h1>Thank you</h1> <p>@lihautan</p></div>";return{c(){e=f("div"),e.innerHTML=s,this.h()},l(n){e=d(n,"DIV",{class:!0,"data-svelte-h":!0}),q(e)!=="svelte-kpo9x2"&&(e.innerHTML=s),this.h()},h(){c(e,"class","container svelte-1296l67")},m(n,a){m(n,e,a)},p:re,d(n){n&&i(e)}}}function bl(o){let e,s;const n=[o[0],gn];let a={$$slots:{default:[$l]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new ee({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&1?Z(n,[l&1&&C(t[0]),l&0&&C(gn)]):{};l&2&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const gn={description:"Thank you@lihautan..."};function wl(o,e,s){return o.$$set=n=>{s(0,e=y(y({},e),L(n)))},e=L(e),[e]}let Tl=class extends Y{constructor(e){super(),K(this,e,wl,bl,W,{})}};function El(o){let e,s;return e=new Vn({props:{slides:o[0]}}),{c(){N(e.$$.fragment)},l(n){J(e.$$.fragment,n)},m(n,a){R(e,n,a),s=!0},p:re,i(n){s||(X(e.$$.fragment,n),s=!0)},o(n){O(e.$$.fragment,n),s=!1},d(n){G(e,n)}}}function Il(o){let e,s;const n=[o[1],xn];let a={$$slots:{default:[El]},$$scope:{ctx:o}};for(let t=0;t<n.length;t+=1)a=y(a,n[t]);return e=new Pn({props:a}),{c(){N(e.$$.fragment)},l(t){J(e.$$.fragment,t)},m(t,l){R(e,t,l),s=!0},p(t,[l]){const r=l&2?Z(n,[l&2&&C(t[1]),l&0&&C(xn)]):{};l&4&&(r.$$scope={dirty:l,ctx:t}),e.$set(r)},i(t){s||(X(e.$$.fragment,t),s=!0)},o(t){O(e.$$.fragment,t),s=!1},d(t){G(e,t)}}}const xn={layout:"slide",description:"..."};function Ll(o,e,s){const n=[Kn,ts,is,fs,$s,Es,Hs,Ps,qs,As,Js,ta,la,ca,da,ya,Ia,Ma,Xa,Fa,Ja,il,dl,_l,xl,Tl];return o.$$set=a=>{s(1,e=y(y({},e),L(a)))},e=L(e),[n,e]}class uo extends Y{constructor(e){super(),K(this,e,Ll,Il,W,{})}}export{uo as component};
