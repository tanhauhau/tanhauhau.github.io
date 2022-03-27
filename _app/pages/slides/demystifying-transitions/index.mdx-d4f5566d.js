import{S as le,i as oe,s as re,C as w,w as ee,x as te,y as ne,z as ce,A as X,q as J,o as W,B as se,Y as H,e as v,t as m,c as h,a as f,h as y,d as c,b as p,g as E,H as i,K as it,L as Ke,I as Le,a3 as xn,a4 as $n,k as T,l as Et,m as V,n as pt,p as dt,a5 as bt,a6 as It,a7 as En,a8 as Ct,a9 as Lt,aa as St,X as $t,ab as Z,O as Dt,j as Ot,$ as ge,ac as Fe,M as bn,N as gt,J as Ne,F as ke,G as me,f as yt,ad as jt,a0 as On,ae as Tn,af as Vn,ag as Cn,ah as Ln,ai as Sn,aj as jn,ak as Xn,al as Hn,am as qn,an as Mn,ao as An,ap as wn,aq as wt,ar as Xt,v as Fn,as as Dn}from"../../../chunks/vendor-da4388d4.js";import{S as Un,a as Bn}from"../../../chunks/Slides-7a3780af.js";import{B as pe}from"../../../chunks/BlogLayout-86707f1c.js";import{p as In,a as we,b as Jn}from"../../../chunks/prism-e666959e.js";/* empty css                                   */import"../../../chunks/stores-1fad7c36.js";import"../../../chunks/ldjson-b0805387.js";function Ht(o){let e,n,a,l;return{c(){e=v("h1"),n=m("\u{1F680} Demystifying Transitions"),this.h()},l(t){e=h(t,"H1",{class:!0});var s=f(e);n=y(s,"\u{1F680} Demystifying Transitions"),s.forEach(c),this.h()},h(){p(e,"class","svelte-kb1uhf")},m(t,s){E(t,e,s),i(e,n),l=!0},p(t,s){},i(t){l||(it(()=>{a||(a=Ke(e,It,{easing:bt,duration:3e3,delay:900},!0)),a.run(1)}),l=!0)},o(t){a||(a=Ke(e,It,{easing:bt,duration:3e3,delay:900},!1)),a.run(0),l=!1},d(t){t&&c(e),t&&a&&a.end()}}}function qt(o){let e,n,a,l,t,s,r;return{c(){e=v("button"),n=m("Click Me"),this.h()},l(d){e=h(d,"BUTTON",{class:!0});var u=f(e);n=y(u,"Click Me"),u.forEach(c),this.h()},h(){p(e,"class","svelte-kb1uhf")},m(d,u){E(d,e,u),i(e,n),t=!0,s||(r=Le(e,"click",o[4]),s=!0)},p(d,u){o=d},i(d){t||(it(()=>{l&&l.end(1),a=xn(e,It,{easing:En}),a.start()}),t=!0)},o(d){a&&a.invalidate(),l=$n(e,Pn,{easing:bt,duration:1200,y:-200}),t=!1},d(d){d&&c(e),d&&l&&l.end(),s=!1,r()}}}function Nn(o){let e,n,a,l=o[0]===2&&Ht(),t=o[0]===1&&qt(o);return{c(){l&&l.c(),e=T(),t&&t.c(),n=Et()},l(s){l&&l.l(s),e=V(s),t&&t.l(s),n=Et()},m(s,r){l&&l.m(s,r),E(s,e,r),t&&t.m(s,r),E(s,n,r),a=!0},p(s,r){s[0]===2?l?(l.p(s,r),r&1&&J(l,1)):(l=Ht(),l.c(),J(l,1),l.m(e.parentNode,e)):l&&(pt(),W(l,1,1,()=>{l=null}),dt()),s[0]===1?t?(t.p(s,r),r&1&&J(t,1)):(t=qt(s),t.c(),J(t,1),t.m(n.parentNode,n)):t&&(pt(),W(t,1,1,()=>{t=null}),dt())},i(s){a||(J(l),J(t),a=!0)},o(s){W(l),W(t),a=!1},d(s){l&&l.d(s),s&&c(e),t&&t.d(s),s&&c(n)}}}function zn(o){let e,n;const a=[o[1],Mt];let l={$$slots:{default:[Nn]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&2?ce(a,[s&2&&X(t[1]),s&0&&X(Mt)]):{};s&33&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Mt={description:"..."};function Pn(o,e){return{delay:e.delay,duration:e.duration,easing:e.easing,css(n,a){return`transform: translateX(-50%) translateY(${a*e.y}px) scale(${n})`}}}function Gn(o,e,n){let a=0;function l(){return a===2?!1:(n(0,a++,a),!0)}function t(){return a===0?!1:(n(0,a--,a),!0)}const s=()=>n(0,a=2);return o.$$set=r=>{n(1,e=w(w({},e),H(r)))},e=H(e),[a,e,l,t,s]}class Rn extends le{constructor(e){super();oe(this,e,Gn,zn,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}function At(o){let e,n,a,l,t,s;return{c(){e=v("div"),n=m("\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),a=v("code"),l=m("transition:"),this.h()},l(r){e=h(r,"DIV",{class:!0});var d=f(e);n=y(d,"\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),a=h(d,"CODE",{});var u=f(a);l=y(u,"transition:"),u.forEach(c),d.forEach(c),this.h()},h(){p(e,"class","actual svelte-1h90ifj")},m(r,d){E(r,e,d),i(e,n),i(e,a),i(a,l),s=!0},i(r){s||(it(()=>{t||(t=Ke(e,Ct,{},!0)),t.run(1)}),s=!0)},o(r){t||(t=Ke(e,Ct,{},!1)),t.run(0),s=!1},d(r){r&&c(e),r&&t&&t.end()}}}function Ft(o){let e,n,a,l,t,s,r;return{c(){e=v("div"),n=m("\u{1F697}  Level 2\uFE0F\u20E3  - The "),a=v("code"),l=m("transition:"),t=m(" contract"),this.h()},l(d){e=h(d,"DIV",{class:!0});var u=f(e);n=y(u,"\u{1F697}  Level 2\uFE0F\u20E3  - The "),a=h(u,"CODE",{});var _=f(a);l=y(_,"transition:"),_.forEach(c),t=y(u," contract"),u.forEach(c),this.h()},h(){p(e,"class","actual svelte-1h90ifj")},m(d,u){E(d,e,u),i(e,n),i(e,a),i(a,l),i(e,t),r=!0},i(d){r||(it(()=>{s||(s=Ke(e,Lt,{},!0)),s.run(1)}),r=!0)},o(d){s||(s=Ke(e,Lt,{},!1)),s.run(0),r=!1},d(d){d&&c(e),d&&s&&s.end()}}}function Ut(o){let e,n,a,l,t,s,r;return{c(){e=v("div"),n=m("\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),a=v("code"),l=m("transition:"),t=m(" in your Head"),this.h()},l(d){e=h(d,"DIV",{class:!0});var u=f(e);n=y(u,"\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),a=h(u,"CODE",{});var _=f(a);l=y(_,"transition:"),_.forEach(c),t=y(u," in your Head"),u.forEach(c),this.h()},h(){p(e,"class","actual svelte-1h90ifj")},m(d,u){E(d,e,u),i(e,n),i(e,a),i(a,l),i(e,t),r=!0},i(d){r||(it(()=>{s||(s=Ke(e,St,{y:30},!0)),s.run(1)}),r=!0)},o(d){s||(s=Ke(e,St,{y:30},!1)),s.run(0),r=!1},d(d){d&&c(e),d&&s&&s.end()}}}function Wn(o){let e,n,a,l,t,s,r,d,u,_,$,k,g,C,q,D,O,b,S,L,N,Y,x,M,A=o[0]>=1&&At(),F=o[0]>=2&&Ft(),G=o[0]>=3&&Ut();return{c(){e=v("div"),n=v("div"),a=v("div"),l=m("\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),t=v("code"),s=m("transition:"),r=T(),A&&A.c(),d=T(),u=v("div"),_=v("div"),$=m("\u{1F697}  Level 2\uFE0F\u20E3  - The "),k=v("code"),g=m("transition:"),C=m(" contract"),q=T(),F&&F.c(),D=T(),O=v("div"),b=v("div"),S=m("\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),L=v("code"),N=m("transition:"),Y=m(" in your Head"),x=T(),G&&G.c(),this.h()},l(K){e=h(K,"DIV",{class:!0});var B=f(e);n=h(B,"DIV",{class:!0});var I=f(n);a=h(I,"DIV",{class:!0});var P=f(a);l=y(P,"\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),t=h(P,"CODE",{});var Q=f(t);s=y(Q,"transition:"),Q.forEach(c),P.forEach(c),r=V(I),A&&A.l(I),I.forEach(c),d=V(B),u=h(B,"DIV",{class:!0});var ue=f(u);_=h(ue,"DIV",{class:!0});var de=f(_);$=y(de,"\u{1F697}  Level 2\uFE0F\u20E3  - The "),k=h(de,"CODE",{});var fe=f(k);g=y(fe,"transition:"),fe.forEach(c),C=y(de," contract"),de.forEach(c),q=V(ue),F&&F.l(ue),ue.forEach(c),D=V(B),O=h(B,"DIV",{class:!0});var ve=f(O);b=h(ve,"DIV",{class:!0});var z=f(b);S=y(z,"\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),L=h(z,"CODE",{});var he=f(L);N=y(he,"transition:"),he.forEach(c),Y=y(z," in your Head"),z.forEach(c),x=V(ve),G&&G.l(ve),ve.forEach(c),B.forEach(c),this.h()},h(){p(a,"class","placeholder svelte-1h90ifj"),p(n,"class","svelte-1h90ifj"),p(_,"class","placeholder svelte-1h90ifj"),p(u,"class","svelte-1h90ifj"),p(b,"class","placeholder svelte-1h90ifj"),p(O,"class","svelte-1h90ifj"),p(e,"class","container svelte-1h90ifj")},m(K,B){E(K,e,B),i(e,n),i(n,a),i(a,l),i(a,t),i(t,s),i(n,r),A&&A.m(n,null),i(e,d),i(e,u),i(u,_),i(_,$),i(_,k),i(k,g),i(_,C),i(u,q),F&&F.m(u,null),i(e,D),i(e,O),i(O,b),i(b,S),i(b,L),i(L,N),i(b,Y),i(O,x),G&&G.m(O,null),M=!0},p(K,B){K[0]>=1?A?B&1&&J(A,1):(A=At(),A.c(),J(A,1),A.m(n,null)):A&&(pt(),W(A,1,1,()=>{A=null}),dt()),K[0]>=2?F?B&1&&J(F,1):(F=Ft(),F.c(),J(F,1),F.m(u,null)):F&&(pt(),W(F,1,1,()=>{F=null}),dt()),K[0]>=3?G?B&1&&J(G,1):(G=Ut(),G.c(),J(G,1),G.m(O,null)):G&&(pt(),W(G,1,1,()=>{G=null}),dt())},i(K){M||(J(A),J(F),J(G),M=!0)},o(K){W(A),W(F),W(G),M=!1},d(K){K&&c(e),A&&A.d(),F&&F.d(),G&&G.d()}}}function Yn(o){let e,n;const a=[o[1],Bt];let l={$$slots:{default:[Wn]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&2?ce(a,[s&2&&X(t[1]),s&0&&X(Bt)]):{};s&17&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Bt={description:"..."};function Kn(o,e,n){let a=0;function l(){return a===3?!1:(n(0,a++,a),!0)}function t(){return a===0?!1:(n(0,a--,a),!0)}return o.$$set=s=>{n(1,e=w(w({},e),H(s)))},e=H(e),[a,e,l,t]}class Zn extends le{constructor(e){super();oe(this,e,Kn,Yn,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}var Qn="/_app/assets/profile-pic-09f4ed02.png",es="/_app/assets/penang-rojak-cb9bf904.jpg",ts="/_app/assets/koay-teow-a6e6fdb3.jpg";function ns(o){let e,n,a,l,t,s,r,d,u,_,$,k,g,C,q,D,O,b,S,L,N,Y,x,M,A,F,G,K,B;return{c(){e=v("img"),a=T(),l=v("p"),t=m("@lihautan"),s=T(),r=v("ul"),d=v("li"),u=m("\u{1F468}\u{1F3FB}\u200D\u{1F4BB} Frontend engineer at Shopee Singapore"),_=T(),$=v("li"),k=m("\u{1F1F2}\u{1F1FE} Grew up in Penang, Malaysia"),g=T(),C=v("li"),q=m("\u{1F6E0} Svelte Maintainer"),D=T(),O=v("div"),b=v("img"),L=T(),N=v("div"),Y=m("Image credit: sidechef.com"),x=T(),M=v("div"),A=v("img"),G=T(),K=v("div"),B=m("Image credit: tripadvisor.com"),this.h()},l(I){e=h(I,"IMG",{src:!0,alt:!0,class:!0}),a=V(I),l=h(I,"P",{class:!0});var P=f(l);t=y(P,"@lihautan"),P.forEach(c),s=V(I),r=h(I,"UL",{class:!0});var Q=f(r);d=h(Q,"LI",{});var ue=f(d);u=y(ue,"\u{1F468}\u{1F3FB}\u200D\u{1F4BB} Frontend engineer at Shopee Singapore"),ue.forEach(c),_=V(Q),$=h(Q,"LI",{});var de=f($);k=y(de,"\u{1F1F2}\u{1F1FE} Grew up in Penang, Malaysia"),de.forEach(c),g=V(Q),C=h(Q,"LI",{});var fe=f(C);q=y(fe,"\u{1F6E0} Svelte Maintainer"),fe.forEach(c),Q.forEach(c),D=V(I),O=h(I,"DIV",{class:!0});var ve=f(O);b=h(ve,"IMG",{src:!0,alt:!0,class:!0}),L=V(ve),N=h(ve,"DIV",{});var z=f(N);Y=y(z,"Image credit: sidechef.com"),z.forEach(c),ve.forEach(c),x=V(I),M=h(I,"DIV",{class:!0});var he=f(M);A=h(he,"IMG",{src:!0,alt:!0,class:!0}),G=V(he),K=h(he,"DIV",{});var Se=f(K);B=y(Se,"Image credit: tripadvisor.com"),Se.forEach(c),he.forEach(c),this.h()},h(){$t(e.src,n=Qn)||p(e,"src",n),p(e,"alt","profile"),p(e,"class","svelte-1l0c6ie"),p(l,"class","svelte-1l0c6ie"),p(r,"class","svelte-1l0c6ie"),$t(b.src,S=ts)||p(b,"src",S),p(b,"alt","char koay teow"),p(b,"class","svelte-1l0c6ie"),p(O,"class","ckt svelte-1l0c6ie"),Z(O,"hidden",o[0]<1||o[0]>=3),$t(A.src,F=es)||p(A,"src",F),p(A,"alt","rojak"),p(A,"class","svelte-1l0c6ie"),p(M,"class","rojak svelte-1l0c6ie"),Z(M,"hidden",o[0]<2||o[0]>=3)},m(I,P){E(I,e,P),E(I,a,P),E(I,l,P),i(l,t),E(I,s,P),E(I,r,P),i(r,d),i(d,u),i(r,_),i(r,$),i($,k),i(r,g),i(r,C),i(C,q),E(I,D,P),E(I,O,P),i(O,b),i(O,L),i(O,N),i(N,Y),E(I,x,P),E(I,M,P),i(M,A),i(M,G),i(M,K),i(K,B)},p(I,P){P&1&&Z(O,"hidden",I[0]<1||I[0]>=3),P&1&&Z(M,"hidden",I[0]<2||I[0]>=3)},d(I){I&&c(e),I&&c(a),I&&c(l),I&&c(s),I&&c(r),I&&c(D),I&&c(O),I&&c(x),I&&c(M)}}}function ss(o){let e,n;const a=[o[1],Jt];let l={$$slots:{default:[ns]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&2?ce(a,[s&2&&X(t[1]),s&0&&X(Jt)]):{};s&17&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Jt={description:"@lihautan\u{1F468}\u{1F3FB}\u200D\u{1F4BB} Frontend engineer at Shopee Singapore\u{1F1F2}\u{1F1FE} Grew up in Penang, Malaysia\u{1F6E0} Svelte Maintainer..."};function as(o,e,n){let a=0;function l(){return a===3?!1:(n(0,a++,a),!0)}function t(){return a===0?!1:(n(0,a--,a),!0)}return o.$$set=s=>{n(1,e=w(w({},e),H(s)))},e=H(e),[a,e,l,t]}class ls extends le{constructor(e){super();oe(this,e,as,ss,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}function os(o){let e,n,a,l,t;return{c(){e=v("div"),n=v("h1"),a=m("\u{1F6B4}\u200D\u2642\uFE0F 1\uFE0F\u20E3  Using "),l=v("code"),t=m("transition:"),this.h()},l(s){e=h(s,"DIV",{class:!0});var r=f(e);n=h(r,"H1",{class:!0});var d=f(n);a=y(d,"\u{1F6B4}\u200D\u2642\uFE0F 1\uFE0F\u20E3  Using "),l=h(d,"CODE",{class:!0});var u=f(l);t=y(u,"transition:"),u.forEach(c),d.forEach(c),r.forEach(c),this.h()},h(){p(l,"class","inline"),p(n,"class","svelte-11o4zfu"),p(e,"class","svelte-11o4zfu")},m(s,r){E(s,e,r),i(e,n),i(n,a),i(n,l),i(l,t)},d(s){s&&c(e)}}}function rs(o){let e,n;const a=[o[0],Nt];let l={$$slots:{default:[os]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(Nt)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Nt={description:"\u{1F6B4}\u200D\u2642\uFE0F 1\uFE0F\u20E3  Using `transition:`..."};function is(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class cs extends le{constructor(e){super();oe(this,e,is,rs,re,{})}}var us=`{#each items as item}
  <div>{item}</div>
{/each}`,ps=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div>{item}</div>
{/each}`,ds=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div in:fade>{item}</div>
{/each}`,fs=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div in:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,vs=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div out:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,hs=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div transition:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`;function zt(o,e,n){const a=o.slice();return a[12]=e[n],a}function Pt(o){let e,n=o[12]+"",a,l,t,s;return{c(){e=v("div"),a=m(n)},l(r){e=h(r,"DIV",{});var d=f(e);a=y(d,n),d.forEach(c)},m(r,d){E(r,e,d),i(e,a),s=!0},p(r,d){(!s||d&1)&&n!==(n=r[12]+"")&&Ot(a,n)},i(r){s||(it(()=>{t&&t.end(1),l=xn(e,o[4],{}),l.start()}),s=!0)},o(r){l&&l.invalidate(),t=$n(e,o[5],{}),s=!1},d(r){r&&c(e),r&&t&&t.end()}}}function _s(o){let e,n,a,l,t,s,r,d,u,_,$,k,g,C,q=o[0],D=[];for(let b=0;b<q.length;b+=1)D[b]=Pt(zt(o,q,b));const O=b=>W(D[b],1,1,()=>{D[b]=null});return{c(){e=v("div"),n=v("div"),l=T(),t=v("div"),s=v("button"),r=m("Add"),d=T(),u=v("button"),_=m("Remove"),$=T();for(let b=0;b<D.length;b+=1)D[b].c();this.h()},l(b){e=h(b,"DIV",{class:!0});var S=f(e);n=h(S,"DIV",{class:!0}),f(n).forEach(c),l=V(S),t=h(S,"DIV",{});var L=f(t);s=h(L,"BUTTON",{});var N=f(s);r=y(N,"Add"),N.forEach(c),d=V(L),u=h(L,"BUTTON",{});var Y=f(u);_=y(Y,"Remove"),Y.forEach(c),$=V(L);for(let x=0;x<D.length;x+=1)D[x].l(L);L.forEach(c),S.forEach(c),this.h()},h(){p(n,"class","code"),p(e,"class","container svelte-zwzan3")},m(b,S){E(b,e,S),i(e,n),i(e,l),i(e,t),i(t,s),i(s,r),i(t,d),i(t,u),i(u,_),i(t,$);for(let L=0;L<D.length;L+=1)D[L].m(t,null);k=!0,g||(C=[ge(a=In.call(null,n,o[1])),Le(s,"click",o[2]),Le(u,"click",o[3])],g=!0)},p(b,S){if(a&&Fe(a.update)&&S&2&&a.update.call(null,b[1]),S&1){q=b[0];let L;for(L=0;L<q.length;L+=1){const N=zt(b,q,L);D[L]?(D[L].p(N,S),J(D[L],1)):(D[L]=Pt(N),D[L].c(),J(D[L],1),D[L].m(t,null))}for(pt(),L=q.length;L<D.length;L+=1)O(L);dt()}},i(b){if(!k){for(let S=0;S<q.length;S+=1)J(D[S]);k=!0}},o(b){D=D.filter(Boolean);for(let S=0;S<D.length;S+=1)W(D[S]);k=!1},d(b){b&&c(e),bn(D,b),g=!1,gt(C)}}}function ks(o){let e,n;const a=[o[6],Gt];let l={$$slots:{default:[_s]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&64?ce(a,[s&64&&X(t[6]),s&0&&X(Gt)]):{};s&32771&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Gt={description:"..."};function ms(o,e,n){let a,l=0;const t=[us,ps,ds,fs,vs,hs],s=t.length-1;function r(){return l<s&&n(9,l++,l)<s}function d(){return l>0&&n(9,l--,l)>0}let u=["a","b"];function _(){n(0,u=[...u,String.fromCharCode(97+u.length)])}function $(){n(0,u=u.slice(0,-1))}function k(C){return function(){return l===2?Dt(C,{}):l===3||l===5?Dt(C,{duration:4e3,delay:500}):{duration:0}}}function g(C){return function(){return l===4||l===5?Dt(C,{duration:4e3,delay:500}):{duration:0}}}return o.$$set=C=>{n(6,e=w(w({},e),H(C)))},o.$$.update=()=>{o.$$.dirty&512&&n(1,a=t[l])},e=H(e),[u,a,_,$,k,g,e,r,d,l]}class ys extends le{constructor(e){super();oe(this,e,ms,ks,re,{next:7,prev:8})}get next(){return this.$$.ctx[7]}get prev(){return this.$$.ctx[8]}}function gs(o){let e,n,a=`<pre class="prism language-svelte"><code><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript"></div><div class="line">  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> fly<span class="token punctuation">,</span> slide<span class="token punctuation">,</span> scale<span class="token punctuation">,</span> blur <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span><span class="token punctuation">;</span></div><div class="line"></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></div><div class="line"></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>fly=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">x</span><span class="token operator">:</span> <span class="token number">50</span><span class="token punctuation">,</span> <span class="token literal-property property">y</span><span class="token operator">:</span><span class="token number">50</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>slide</span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>scale=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">start</span><span class="token operator">:</span> <span class="token number">0.5</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>blur=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">amount</span><span class="token operator">:</span> <span class="token number">2</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div></code></pre>`;return{c(){e=v("div"),n=v("div"),this.h()},l(l){e=h(l,"DIV",{class:!0});var t=f(e);n=h(t,"DIV",{class:!0});var s=f(n);s.forEach(c),t.forEach(c),this.h()},h(){p(n,"class","code-section"),p(e,"class","container svelte-l83dwf")},m(l,t){E(l,e,t),i(e,n),n.innerHTML=a},p:Ne,d(l){l&&c(e)}}}function xs(o){let e,n;const a=[o[0],Rt];let l={$$slots:{default:[gs]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(Rt)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Rt={description:"..."};function $s(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class Es extends le{constructor(e){super();oe(this,e,$s,xs,re,{})}}function bs(o){let e,n,a,l,t,s,r,d,u;return{c(){e=v("div"),n=v("ul"),a=v("li"),l=v("a"),t=m("https://svelte.dev/docs#svelte_transition"),s=T(),r=v("li"),d=v("a"),u=m("https://svelte.dev/tutorial/transition"),this.h()},l(_){e=h(_,"DIV",{class:!0});var $=f(e);n=h($,"UL",{class:!0});var k=f(n);a=h(k,"LI",{class:!0});var g=f(a);l=h(g,"A",{href:!0,rel:!0});var C=f(l);t=y(C,"https://svelte.dev/docs#svelte_transition"),C.forEach(c),g.forEach(c),s=V(k),r=h(k,"LI",{class:!0});var q=f(r);d=h(q,"A",{href:!0,rel:!0});var D=f(d);u=y(D,"https://svelte.dev/tutorial/transition"),D.forEach(c),q.forEach(c),k.forEach(c),$.forEach(c),this.h()},h(){p(l,"href","https://svelte.dev/docs#svelte_transition"),p(l,"rel","nofollow"),p(a,"class","svelte-h8tvqg"),p(d,"href","https://svelte.dev/tutorial/transition"),p(d,"rel","nofollow"),p(r,"class","svelte-h8tvqg"),p(n,"class","svelte-h8tvqg"),p(e,"class","svelte-h8tvqg")},m(_,$){E(_,e,$),i(e,n),i(n,a),i(a,l),i(l,t),i(n,s),i(n,r),i(r,d),i(d,u)},d(_){_&&c(e)}}}function ws(o){let e,n;const a=[o[0],Wt];let l={$$slots:{default:[bs]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(Wt)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Wt={description:"https://svelte.dev/docs#svelte_transitionhttps://svelte.dev/tutorial/transition..."};function Ds(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class Is extends le{constructor(e){super();oe(this,e,Ds,ws,re,{})}}function Os(o){let e,n,a,l,t,s;return{c(){e=v("div"),n=v("h1"),a=m("\u{1F697} 2\uFE0F\u20E3  The "),l=v("code"),t=m("transition:"),s=m(" contract"),this.h()},l(r){e=h(r,"DIV",{class:!0});var d=f(e);n=h(d,"H1",{class:!0});var u=f(n);a=y(u,"\u{1F697} 2\uFE0F\u20E3  The "),l=h(u,"CODE",{class:!0});var _=f(l);t=y(_,"transition:"),_.forEach(c),s=y(u," contract"),u.forEach(c),d.forEach(c),this.h()},h(){p(l,"class","inline"),p(n,"class","svelte-11o4zfu"),p(e,"class","svelte-11o4zfu")},m(r,d){E(r,e,d),i(e,n),i(n,a),i(n,l),i(l,t),i(n,s)},d(r){r&&c(e)}}}function Ts(o){let e,n;const a=[o[0],Yt];let l={$$slots:{default:[Os]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(Yt)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Yt={description:"\u{1F697} 2\uFE0F\u20E3  The `transition:` contract..."};function Vs(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class Cs extends le{constructor(e){super();oe(this,e,Vs,Ts,re,{})}}function Ls(o){let e,n,a,l,t,s,r,d=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=v("h2"),n=m("The "),a=v("code"),l=m("transition:"),t=m(" contract"),s=T(),r=v("div"),this.h()},l(u){e=h(u,"H2",{});var _=f(e);n=y(_,"The "),a=h(_,"CODE",{class:!0});var $=f(a);l=y($,"transition:"),$.forEach(c),t=y(_," contract"),_.forEach(c),s=V(u),r=h(u,"DIV",{class:!0});var k=f(r);k.forEach(c),this.h()},h(){p(a,"class","inline"),p(r,"class","code-section")},m(u,_){E(u,e,_),i(e,n),i(e,a),i(a,l),i(e,t),E(u,s,_),E(u,r,_),r.innerHTML=d},p:Ne,d(u){u&&c(e),u&&c(s),u&&c(r)}}}function Ss(o){let e,n;const a=[o[0],Kt];let l={$$slots:{default:[Ls]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(Kt)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Kt={description:"The `transition:` contract..."};function js(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class Xs extends le{constructor(e){super();oe(this,e,js,Ss,re,{})}}function Hs(o){let e,n,a,l,t,s,r,d=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=v("h2"),n=m("The "),a=v("code"),l=m("transition:"),t=m(" contract"),s=T(),r=v("div"),this.h()},l(u){e=h(u,"H2",{});var _=f(e);n=y(_,"The "),a=h(_,"CODE",{class:!0});var $=f(a);l=y($,"transition:"),$.forEach(c),t=y(_," contract"),_.forEach(c),s=V(u),r=h(u,"DIV",{class:!0});var k=f(r);k.forEach(c),this.h()},h(){p(a,"class","inline"),p(r,"class","code-section")},m(u,_){E(u,e,_),i(e,n),i(e,a),i(a,l),i(e,t),E(u,s,_),E(u,r,_),r.innerHTML=d},p:Ne,d(u){u&&c(e),u&&c(s),u&&c(r)}}}function qs(o){let e,n;const a=[o[0],Zt];let l={$$slots:{default:[Hs]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(Zt)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Zt={description:"The `transition:` contract..."};function Ms(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class As extends le{constructor(e){super();oe(this,e,Ms,qs,re,{})}}function Fs(o){let e,n,a,l,t,s,r,d=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=v("h2"),n=m("The "),a=v("code"),l=m("transition:"),t=m(" contract"),s=T(),r=v("div"),this.h()},l(u){e=h(u,"H2",{});var _=f(e);n=y(_,"The "),a=h(_,"CODE",{class:!0});var $=f(a);l=y($,"transition:"),$.forEach(c),t=y(_," contract"),_.forEach(c),s=V(u),r=h(u,"DIV",{class:!0});var k=f(r);k.forEach(c),this.h()},h(){p(a,"class","inline"),p(r,"class","code-section")},m(u,_){E(u,e,_),i(e,n),i(e,a),i(a,l),i(e,t),E(u,s,_),E(u,r,_),r.innerHTML=d},p:Ne,d(u){u&&c(e),u&&c(s),u&&c(r)}}}function Us(o){let e,n;const a=[o[0],Qt];let l={$$slots:{default:[Fs]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(Qt)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const Qt={description:"The `transition:` contract..."};function Bs(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class Js extends le{constructor(e){super();oe(this,e,Bs,Us,re,{})}}function en(o,e,n){const a=o.slice();return a[1]=e[n],a}function tn(o){let e,n=o[1].name+"",a,l;return{c(){e=v("option"),a=m(n),this.h()},l(t){e=h(t,"OPTION",{});var s=f(e);a=y(s,n),s.forEach(c),this.h()},h(){e.__value=l=o[1],e.value=e.__value},m(t,s){E(t,e,s),i(e,a)},p:Ne,d(t){t&&c(e)}}}function Ns(o){let e,n,a,l,t,s,r,d,u,_,$,k,g,C,q,D,O,b,S,L,N,Y,x,M,A,F,G,K,B,I,P,Q,ue,de=(o[0]===11?o[4].toFixed(3):o[0]===12?"Hello World".slice(0,Math.round(11*o[4])):"")+"",fe,ve,z,he,Se,ze,be,je,Ie,Ze,$e,Pe,Qe,De,Xe,xe,Ee,Ge,et,Ue,tt,Oe,He,nt,Te,Be,Ve,st,U,_e,qe,ct,at,Me=o[8],ye=[];for(let j=0;j<Me.length;j+=1)ye[j]=tn(en(o,Me,j));return{c(){e=v("div"),n=v("div"),a=v("select");for(let j=0;j<ye.length;j+=1)ye[j].c();l=T(),t=ke("svg"),s=ke("defs"),r=ke("marker"),d=ke("path"),u=ke("path"),_=ke("g"),$=ke("text"),k=m("0"),g=ke("text"),C=m("1"),q=ke("text"),D=m("eased time"),O=ke("path"),b=ke("g"),S=ke("text"),L=m("1"),N=ke("text"),Y=m("0"),x=ke("text"),M=m("time"),A=ke("polyline"),F=ke("circle"),G=T(),K=ke("svg"),B=ke("path"),I=ke("path"),P=ke("circle"),Q=T(),ue=v("div"),fe=m(de),ve=T(),z=v("div"),he=v("div"),ze=T(),be=v("br"),je=T(),Ie=v("div"),Ze=T(),$e=v("div"),Qe=T(),De=v("div"),xe=T(),Ee=v("div"),et=T(),Ue=v("br"),tt=T(),Oe=v("div"),nt=T(),Te=v("div"),Be=T(),Ve=v("div"),st=T(),U=v("div"),_e=T(),qe=v("div"),this.h()},l(j){e=h(j,"DIV",{class:!0});var R=f(e);n=h(R,"DIV",{class:!0});var ae=f(n);a=h(ae,"SELECT",{class:!0});var Re=f(a);for(let ut=0;ut<ye.length;ut+=1)ye[ut].l(Re);Re.forEach(c),l=V(ae),t=me(ae,"svg",{width:!0,height:!0,class:!0});var Ae=f(t);s=me(Ae,"defs",{});var ft=f(s);r=me(ft,"marker",{id:!0,orient:!0,markerWidth:!0,markerHeight:!0,refX:!0,refY:!0});var vt=f(r);d=me(vt,"path",{d:!0,fill:!0}),f(d).forEach(c),vt.forEach(c),ft.forEach(c),u=me(Ae,"path",{d:!0,"marker-end":!0,stroke:!0}),f(u).forEach(c),_=me(Ae,"g",{class:!0,transform:!0});var lt=f(_);$=me(lt,"text",{x:!0,class:!0});var Je=f($);k=y(Je,"0"),Je.forEach(c),g=me(lt,"text",{x:!0,class:!0});var ht=f(g);C=y(ht,"1"),ht.forEach(c),q=me(lt,"text",{x:!0,class:!0});var _t=f(q);D=y(_t,"eased time"),_t.forEach(c),lt.forEach(c),O=me(Ae,"path",{d:!0,"marker-end":!0,stroke:!0}),f(O).forEach(c),b=me(Ae,"g",{class:!0,transform:!0});var ot=f(b);S=me(ot,"text",{y:!0,class:!0});var We=f(S);L=y(We,"1"),We.forEach(c),N=me(ot,"text",{y:!0,class:!0});var kt=f(N);Y=y(kt,"0"),kt.forEach(c),x=me(ot,"text",{y:!0,class:!0});var mt=f(x);M=y(mt,"time"),mt.forEach(c),ot.forEach(c),A=me(Ae,"polyline",{points:!0,class:!0}),f(A).forEach(c),F=me(Ae,"circle",{r:!0,fill:!0,cx:!0,cy:!0}),f(F).forEach(c),Ae.forEach(c),G=V(ae),K=me(ae,"svg",{height:!0,width:!0,style:!0,class:!0});var rt=f(K);B=me(rt,"path",{d:!0,stroke:!0,"stroke-width":!0}),f(B).forEach(c),I=me(rt,"path",{d:!0,stroke:!0,"stroke-width":!0}),f(I).forEach(c),P=me(rt,"circle",{r:!0,fill:!0,cx:!0,cy:!0}),f(P).forEach(c),rt.forEach(c),Q=V(ae),ue=h(ae,"DIV",{class:!0,style:!0});var Ce=f(ue);fe=y(Ce,de),Ce.forEach(c),ae.forEach(c),ve=V(R),z=h(R,"DIV",{class:!0});var ie=f(z);he=h(ie,"DIV",{class:!0}),f(he).forEach(c),ze=V(ie),be=h(ie,"BR",{}),je=V(ie),Ie=h(ie,"DIV",{class:!0}),f(Ie).forEach(c),Ze=V(ie),$e=h(ie,"DIV",{class:!0}),f($e).forEach(c),Qe=V(ie),De=h(ie,"DIV",{class:!0}),f(De).forEach(c),xe=V(ie),Ee=h(ie,"DIV",{class:!0}),f(Ee).forEach(c),et=V(ie),Ue=h(ie,"BR",{}),tt=V(ie),Oe=h(ie,"DIV",{class:!0}),f(Oe).forEach(c),nt=V(ie),Te=h(ie,"DIV",{class:!0}),f(Te).forEach(c),Be=V(ie),Ve=h(ie,"DIV",{class:!0}),f(Ve).forEach(c),st=V(ie),U=h(ie,"DIV",{class:!0}),f(U).forEach(c),_e=V(ie),qe=h(ie,"DIV",{class:!0}),f(qe).forEach(c),ie.forEach(c),R.forEach(c),this.h()},h(){p(a,"class","svelte-ea51ja"),o[1]===void 0&&it(()=>o[9].call(a)),Z(a,"hidden",o[0]<2),p(d,"d","M0,0 V12 L6,6 Z"),p(d,"fill","black"),p(r,"id","head"),p(r,"orient","auto"),p(r,"markerWidth","6"),p(r,"markerHeight","12"),p(r,"refX","0.1"),p(r,"refY","6"),p(u,"d","M0,0 200,0"),p(u,"marker-end","url(#head)"),p(u,"stroke","black"),p($,"x","0"),p($,"class","svelte-ea51ja"),p(g,"x","200"),p(g,"class","svelte-ea51ja"),p(q,"x","100"),p(q,"class","svelte-ea51ja"),p(_,"class","x svelte-ea51ja"),p(_,"transform","translate(0,-10)"),p(O,"d","M0,0 0,200"),p(O,"marker-end","url(#head)"),p(O,"stroke","black"),p(S,"y","200"),p(S,"class","svelte-ea51ja"),p(N,"y","0"),p(N,"class","svelte-ea51ja"),p(x,"y","100"),p(x,"class","svelte-ea51ja"),p(b,"class","y svelte-ea51ja"),p(b,"transform","translate(-10,0)"),p(A,"points",o[7]),p(A,"class","svelte-ea51ja"),p(F,"r","5"),p(F,"fill","red"),p(F,"cx",o[5]),p(F,"cy",o[6]),Z(F,"hidden",o[0]<1),p(t,"width","200"),p(t,"height","200"),p(t,"class","svelte-ea51ja"),p(B,"d","M-50,0 250,0"),p(B,"stroke","#ddd"),p(B,"stroke-width","2"),p(I,"d","M0,0 200,0"),p(I,"stroke","black"),p(I,"stroke-width","3"),p(P,"r","5"),p(P,"fill","black"),p(P,"cx",o[5]),p(P,"cy","0"),p(K,"height","5"),p(K,"width","200"),yt(K,"margin","1em 0"),p(K,"class","svelte-ea51ja"),Z(K,"hidden",o[0]<1),p(ue,"class","square svelte-ea51ja"),yt(ue,"transform","translateX("+(o[0]===9||o[0]===8?o[4]:o[0]===10?1-o[4]:0)*250+"px)"),Z(ue,"hidden",o[0]<8),p(n,"class","left svelte-ea51ja"),p(he,"class","code"),p(Ie,"class","code"),Z(Ie,"hidden",o[0]<4),p($e,"class","code"),Z($e,"hidden",o[0]<5),p(De,"class","code"),Z(De,"hidden",o[0]<6),p(Ee,"class","code"),Z(Ee,"hidden",o[0]<7),p(Oe,"class","code svelte-ea51ja"),Z(Oe,"none",o[0]!==8),p(Te,"class","code svelte-ea51ja"),Z(Te,"none",o[0]!==9),p(Ve,"class","code svelte-ea51ja"),Z(Ve,"none",o[0]!==10),p(U,"class","code svelte-ea51ja"),Z(U,"none",o[0]!==11),p(qe,"class","code svelte-ea51ja"),Z(qe,"none",o[0]!==12),p(z,"class","right svelte-ea51ja"),Z(z,"hidden",o[0]<3),p(e,"class","container svelte-ea51ja")},m(j,R){E(j,e,R),i(e,n),i(n,a);for(let ae=0;ae<ye.length;ae+=1)ye[ae].m(a,null);jt(a,o[1]),i(n,l),i(n,t),i(t,s),i(s,r),i(r,d),i(t,u),i(t,_),i(_,$),i($,k),i(_,g),i(g,C),i(_,q),i(q,D),i(t,O),i(t,b),i(b,S),i(S,L),i(b,N),i(N,Y),i(b,x),i(x,M),i(t,A),i(t,F),i(n,G),i(n,K),i(K,B),i(K,I),i(K,P),i(n,Q),i(n,ue),i(ue,fe),i(e,ve),i(e,z),i(z,he),i(z,ze),i(z,be),i(z,je),i(z,Ie),i(z,Ze),i(z,$e),i(z,Qe),i(z,De),i(z,xe),i(z,Ee),i(z,et),i(z,Ue),i(z,tt),i(z,Oe),i(z,nt),i(z,Te),i(z,Be),i(z,Ve),i(z,st),i(z,U),i(z,_e),i(z,qe),ct||(at=[Le(a,"change",o[9]),ge(Se=we.call(null,he,o[1].fn.toString())),ge(we.call(null,Ie,"let start = Date.now();")),ge(Pe=we.call(null,$e,`let t = Date.now() - start; // ${nn(o[2])}`)),ge(Xe=we.call(null,De,`t = t / duration; // ${o[3].toFixed(3)}`)),ge(Ge=we.call(null,Ee,`t = ${o[1].fn.name}(t); // ${o[4].toFixed(3)}`)),ge(He=we.call(null,Oe,`node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(o[4]*250).toFixed(1)}px)`)),ge(we.call(null,Te,"css: (t, u) => `translateX(${t * 250}px)`")),ge(we.call(null,Ve,"css: (t, u) => `translateX(${u * 250}px)`")),ge(we.call(null,U,"tick: (t, u) => node.textContent = t")),ge(we.call(null,qe,`const string = 'Hello World';
tick: (t, u) => {
  node.textContent = string.slice(0, Math.round(string.length * t));
}`))],ct=!0)},p(j,[R]){if(R&256){Me=j[8];let ae;for(ae=0;ae<Me.length;ae+=1){const Re=en(j,Me,ae);ye[ae]?ye[ae].p(Re,R):(ye[ae]=tn(Re),ye[ae].c(),ye[ae].m(a,null))}for(;ae<ye.length;ae+=1)ye[ae].d(1);ye.length=Me.length}R&258&&jt(a,j[1]),R&1&&Z(a,"hidden",j[0]<2),R&128&&p(A,"points",j[7]),R&32&&p(F,"cx",j[5]),R&64&&p(F,"cy",j[6]),R&1&&Z(F,"hidden",j[0]<1),R&32&&p(P,"cx",j[5]),R&1&&Z(K,"hidden",j[0]<1),R&17&&de!==(de=(j[0]===11?j[4].toFixed(3):j[0]===12?"Hello World".slice(0,Math.round(11*j[4])):"")+"")&&Ot(fe,de),R&17&&yt(ue,"transform","translateX("+(j[0]===9||j[0]===8?j[4]:j[0]===10?1-j[4]:0)*250+"px)"),R&1&&Z(ue,"hidden",j[0]<8),Se&&Fe(Se.update)&&R&2&&Se.update.call(null,j[1].fn.toString()),R&1&&Z(Ie,"hidden",j[0]<4),Pe&&Fe(Pe.update)&&R&4&&Pe.update.call(null,`let t = Date.now() - start; // ${nn(j[2])}`),R&1&&Z($e,"hidden",j[0]<5),Xe&&Fe(Xe.update)&&R&8&&Xe.update.call(null,`t = t / duration; // ${j[3].toFixed(3)}`),R&1&&Z(De,"hidden",j[0]<6),Ge&&Fe(Ge.update)&&R&18&&Ge.update.call(null,`t = ${j[1].fn.name}(t); // ${j[4].toFixed(3)}`),R&1&&Z(Ee,"hidden",j[0]<7),He&&Fe(He.update)&&R&16&&He.update.call(null,`node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(j[4]*250).toFixed(1)}px)`),R&1&&Z(Oe,"none",j[0]!==8),R&1&&Z(Te,"none",j[0]!==9),R&1&&Z(Ve,"none",j[0]!==10),R&1&&Z(U,"none",j[0]!==11),R&1&&Z(qe,"none",j[0]!==12),R&1&&Z(z,"hidden",j[0]<3)},i:Ne,o:Ne,d(j){j&&c(e),bn(ye,j),ct=!1,gt(at)}}}function zs(o){return o}function Ps(o){let e="";for(let n=0;n<1;n+=.005)e+=`${o(n)*200},${n*200} `;return e}function nn(o){return o-o%5}function Gs(o,e,n){let a,l,t=[{name:"linear",fn:zs},{name:"bounceInOut",fn:Tn},{name:"bounceIn",fn:Vn},{name:"bounceOut",fn:bt},{name:"cubicInOut",fn:Cn},{name:"cubicIn",fn:Ln},{name:"cubicOut",fn:Sn},{name:"quadInOut",fn:En},{name:"quadIn",fn:jn},{name:"quadOut",fn:Xn},{name:"quartInOut",fn:Hn},{name:"quartIn",fn:qn},{name:"quartOut",fn:Mn}],s=t[0],r=Date.now(),d,u=0,_=0,{i:$=3}=e,k=0,g=0,C;function q(){const O=Date.now();n(2,d=(O-r)%a),n(3,u=d/a),n(4,_=s.fn(u)),n(6,g=u*200),n(5,k=s.fn(u)*200),C=requestAnimationFrame(q)}C=requestAnimationFrame(q),On(()=>{cancelAnimationFrame(C)});function D(){s=An(this),n(1,s),n(8,t)}return o.$$set=O=>{"i"in O&&n(0,$=O.i)},o.$$.update=()=>{o.$$.dirty&1&&(a=$<5?2e3:8e3),o.$$.dirty&2&&n(7,l=Ps(s.fn))},[$,s,d,u,_,k,g,l,t,D]}class Rs extends le{constructor(e){super();oe(this,e,Gs,Ns,re,{i:0})}}function Ws(o){let e,n;return e=new Rs({props:{i:o[0]}}),{c(){ee(e.$$.fragment)},l(a){te(e.$$.fragment,a)},m(a,l){ne(e,a,l),n=!0},p(a,l){const t={};l&1&&(t.i=a[0]),e.$set(t)},i(a){n||(J(e.$$.fragment,a),n=!0)},o(a){W(e.$$.fragment,a),n=!1},d(a){se(e,a)}}}function Ys(o){let e,n;const a=[o[1],sn];let l={$$slots:{default:[Ws]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&2?ce(a,[s&2&&X(t[1]),s&0&&X(sn)]):{};s&17&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const sn={description:"..."},an=12;function Ks(o,e,n){let a=0;function l(){return a<an&&n(0,a++,a)<an}function t(){return a>0&&n(0,a--,a)>0}return o.$$set=s=>{n(1,e=w(w({},e),H(s)))},e=H(e),[a,e,l,t]}class Zs extends le{constructor(e){super();oe(this,e,Ks,Ys,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}function Qs(o){let e,n,a,l,t,s,r,d=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=v("h2"),n=m("The "),a=v("code"),l=m("transition:"),t=m(" contract"),s=T(),r=v("div"),this.h()},l(u){e=h(u,"H2",{});var _=f(e);n=y(_,"The "),a=h(_,"CODE",{class:!0});var $=f(a);l=y($,"transition:"),$.forEach(c),t=y(_," contract"),_.forEach(c),s=V(u),r=h(u,"DIV",{class:!0});var k=f(r);k.forEach(c),this.h()},h(){p(a,"class","inline"),p(r,"class","code-section")},m(u,_){E(u,e,_),i(e,n),i(e,a),i(a,l),i(e,t),E(u,s,_),E(u,r,_),r.innerHTML=d},p:Ne,d(u){u&&c(e),u&&c(s),u&&c(r)}}}function ea(o){let e,n;const a=[o[0],ln];let l={$$slots:{default:[Qs]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(ln)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const ln={description:"The `transition:` contract..."};function ta(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class na extends le{constructor(e){super();oe(this,e,ta,ea,re,{})}}function sa(o){let e,n;return{c(){e=v("iframe"),this.h()},l(a){e=h(a,"IFRAME",{title:!0,src:!0,class:!0}),f(e).forEach(c),this.h()},h(){p(e,"title","Svelte REPL"),$t(e.src,n="https://svelte.dev/repl/c88da2fde68a415cbd43aa738bfcefab?version=3.29.0")||p(e,"src",n),p(e,"class","svelte-cxmxle")},m(a,l){E(a,e,l)},d(a){a&&c(e)}}}function aa(o){let e,n;const a=[o[0],on];let l={$$slots:{default:[sa]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(on)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const on={description:"..."};function la(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class oa extends le{constructor(e){super();oe(this,e,la,aa,re,{})}}function ra(o){let e,n,a,l,t,s,r,d,u,_,$,k,g,C;return{c(){e=v("div"),n=v("h1"),a=m("\u{1F680} 3\uFE0F\u20E3  Compile "),l=v("code"),t=m("transition:"),s=m(" in your Head"),r=T(),d=v("div"),u=v("div"),_=m("\u{1F4DA} Compile Svelte in your head"),$=T(),k=v("div"),g=v("a"),C=m("https://lihautan.com/compile-svelte-in-your-head"),this.h()},l(q){e=h(q,"DIV",{class:!0});var D=f(e);n=h(D,"H1",{class:!0});var O=f(n);a=y(O,"\u{1F680} 3\uFE0F\u20E3  Compile "),l=h(O,"CODE",{class:!0});var b=f(l);t=y(b,"transition:"),b.forEach(c),s=y(O," in your Head"),O.forEach(c),r=V(D),d=h(D,"DIV",{});var S=f(d);u=h(S,"DIV",{});var L=f(u);_=y(L,"\u{1F4DA} Compile Svelte in your head"),L.forEach(c),$=V(S),k=h(S,"DIV",{});var N=f(k);g=h(N,"A",{href:!0});var Y=f(g);C=y(Y,"https://lihautan.com/compile-svelte-in-your-head"),Y.forEach(c),N.forEach(c),S.forEach(c),D.forEach(c),this.h()},h(){p(l,"class","inline"),p(n,"class","svelte-1q4kbmd"),p(g,"href","https://lihautan.com/compile-svelte-in-your-head"),p(e,"class","container svelte-1q4kbmd")},m(q,D){E(q,e,D),i(e,n),i(n,a),i(n,l),i(l,t),i(n,s),i(e,r),i(e,d),i(d,u),i(u,_),i(d,$),i(d,k),i(k,g),i(g,C)},d(q){q&&c(e)}}}function ia(o){let e,n;const a=[o[0],rn];let l={$$slots:{default:[ra]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(rn)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const rn={description:"\u{1F680} 3\uFE0F\u20E3  Compile `transition:` in your Head..."};function ca(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class ua extends le{constructor(e){super();oe(this,e,ca,ia,re,{})}}function pa(o){let e,n='<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">&lt;</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;TEST&lt;/</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;</span></span></code></pre>';return{c(){e=v("div"),this.h()},l(a){e=h(a,"DIV",{class:!0});var l=f(e);l.forEach(c),this.h()},h(){p(e,"class","code-section")},m(a,l){E(a,e,l),e.innerHTML=n},d(a){a&&c(e)}}}function da(o){let e,n='<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">&lt;</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">class</span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-token-string-expression)">&quot;transparent&quot;</span><span style="color: var(--shiki-color-text)">&gt;TEST&lt;/</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;</span></span></code></pre>';return{c(){e=v("div"),this.h()},l(a){e=h(a,"DIV",{class:!0});var l=f(e);l.forEach(c),this.h()},h(){p(e,"class","code-section")},m(a,l){E(a,e,l),e.innerHTML=n},d(a){a&&c(e)}}}function fa(o){let e,n,a,l,t=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">opacity</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">1</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">transition</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">opacity 1</span><span style="color: var(--shiki-token-keyword)">s</span><span style="color: var(--shiki-token-constant)"> ease 0.5</span><span style="color: var(--shiki-token-keyword)">s</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span>
<span class="line"><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-token-function)">.transparent</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">opacity</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">0</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`,s,r,d,u,_,$,k,g=o[0]?"Remove":"Add",C,q,D,O,b,S;function L(x,M){return x[0]?da:pa}let N=L(o),Y=N(o);return{c(){e=v("h1"),n=m("CSS Transition"),a=T(),l=v("div"),s=T(),r=v("hr"),d=T(),u=v("div"),_=m("TEST"),$=T(),k=v("button"),C=m(g),q=m(" class"),D=T(),Y.c(),O=Et(),this.h()},l(x){e=h(x,"H1",{class:!0});var M=f(e);n=y(M,"CSS Transition"),M.forEach(c),a=V(x),l=h(x,"DIV",{class:!0});var A=f(l);A.forEach(c),s=V(x),r=h(x,"HR",{}),d=V(x),u=h(x,"DIV",{id:!0,class:!0});var F=f(u);_=y(F,"TEST"),F.forEach(c),$=V(x),k=h(x,"BUTTON",{});var G=f(k);C=y(G,g),q=y(G," class"),G.forEach(c),D=V(x),Y.l(x),O=Et(),this.h()},h(){p(e,"class","svelte-1nbgh8f"),p(l,"class","code-section"),p(u,"id","demo"),p(u,"class","svelte-1nbgh8f"),Z(u,"transparent",o[0])},m(x,M){E(x,e,M),i(e,n),E(x,a,M),E(x,l,M),l.innerHTML=t,E(x,s,M),E(x,r,M),E(x,d,M),E(x,u,M),i(u,_),E(x,$,M),E(x,k,M),i(k,C),i(k,q),E(x,D,M),Y.m(x,M),E(x,O,M),b||(S=Le(k,"click",o[1]),b=!0)},p(x,M){M&1&&Z(u,"transparent",x[0]),M&1&&g!==(g=x[0]?"Remove":"Add")&&Ot(C,g),N!==(N=L(x))&&(Y.d(1),Y=N(x),Y&&(Y.c(),Y.m(O.parentNode,O)))},d(x){x&&c(e),x&&c(a),x&&c(l),x&&c(s),x&&c(r),x&&c(d),x&&c(u),x&&c($),x&&c(k),x&&c(D),Y.d(x),x&&c(O),b=!1,S()}}}function va(o){let e,n;const a=[o[2],cn];let l={$$slots:{default:[fa]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&4?ce(a,[s&4&&X(t[2]),s&0&&X(cn)]):{};s&9&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const cn={description:"CSS Transition..."};function ha(o,e,n){let a=!1;function l(){n(0,a=!a)}return o.$$set=t=>{n(2,e=w(w({},e),H(t)))},e=H(e),[a,l,e]}class _a extends le{constructor(e){super();oe(this,e,ha,va,re,{})}}var ka=`<style>
{{rule}}
  div {
    animation: slide {{duration}}s linear;
  }
</style>
<div>TEXT</div>`,ma=`  @keyframes slide {
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
  }`,ya=`  @keyframes slide {
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
  }`,ga=`  @keyframes slide {
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
  }`;function xa(o){let e,n,a,l,t,s,r,d,u,_,$,k,g,C,q,D,O,b,S,L,N,Y,x,M,A,F,G,K;return{c(){e=v("h1"),n=m("CSS Animations"),a=T(),l=v("div"),t=v("div"),r=T(),d=v("div"),u=v("label"),_=v("input"),$=m("Linear"),k=T(),g=v("label"),C=v("input"),q=m("2 Animations"),D=T(),O=v("label"),b=v("input"),S=m("Cubic Easing"),L=T(),N=v("label"),Y=m("Duration: "),x=v("input"),M=T(),A=v("div"),F=m("TEXT"),this.h()},l(B){e=h(B,"H1",{class:!0});var I=f(e);n=y(I,"CSS Animations"),I.forEach(c),a=V(B),l=h(B,"DIV",{class:!0});var P=f(l);t=h(P,"DIV",{class:!0}),f(t).forEach(c),r=V(P),d=h(P,"DIV",{class:!0});var Q=f(d);u=h(Q,"LABEL",{});var ue=f(u);_=h(ue,"INPUT",{type:!0}),$=y(ue,"Linear"),ue.forEach(c),k=V(Q),g=h(Q,"LABEL",{});var de=f(g);C=h(de,"INPUT",{type:!0}),q=y(de,"2 Animations"),de.forEach(c),D=V(Q),O=h(Q,"LABEL",{});var fe=f(O);b=h(fe,"INPUT",{type:!0}),S=y(fe,"Cubic Easing"),fe.forEach(c),L=V(Q),N=h(Q,"LABEL",{});var ve=f(N);Y=y(ve,"Duration: "),x=h(ve,"INPUT",{type:!0,min:!0,max:!0,step:!0}),ve.forEach(c),M=V(Q),A=h(Q,"DIV",{style:!0});var z=f(A);F=y(z,"TEXT"),z.forEach(c),Q.forEach(c),P.forEach(c),this.h()},h(){p(e,"class","svelte-3ssdsl"),p(t,"class","code"),p(_,"type","radio"),_.__value="anim1",_.value=_.__value,o[5][0].push(_),p(C,"type","radio"),C.__value="anim2",C.value=C.__value,o[5][0].push(C),p(b,"type","radio"),b.__value="anim3",b.value=b.__value,o[5][0].push(b),p(x,"type","range"),p(x,"min","100"),p(x,"max","5000"),p(x,"step","50"),yt(A,"animation",o[0]+" "+o[1]+"ms linear infinite both"),p(d,"class","demo svelte-3ssdsl"),p(l,"class","container svelte-3ssdsl")},m(B,I){E(B,e,I),i(e,n),E(B,a,I),E(B,l,I),i(l,t),i(l,r),i(l,d),i(d,u),i(u,_),_.checked=_.__value===o[0],i(u,$),i(d,k),i(d,g),i(g,C),C.checked=C.__value===o[0],i(g,q),i(d,D),i(d,O),i(O,b),b.checked=b.__value===o[0],i(O,S),i(d,L),i(d,N),i(N,Y),i(N,x),wt(x,o[1]),i(d,M),i(d,A),i(A,F),G||(K=[ge(s=Jn.call(null,t,{code:o[2],lang:Xt.languages.html})),Le(_,"change",o[4]),Le(C,"change",o[6]),Le(b,"change",o[7]),Le(x,"change",o[8]),Le(x,"input",o[8])],G=!0)},p(B,I){s&&Fe(s.update)&&I&4&&s.update.call(null,{code:B[2],lang:Xt.languages.html}),I&1&&(_.checked=_.__value===B[0]),I&1&&(C.checked=C.__value===B[0]),I&1&&(b.checked=b.__value===B[0]),I&2&&wt(x,B[1]),I&3&&yt(A,"animation",B[0]+" "+B[1]+"ms linear infinite both")},d(B){B&&c(e),B&&c(a),B&&c(l),o[5][0].splice(o[5][0].indexOf(_),1),o[5][0].splice(o[5][0].indexOf(C),1),o[5][0].splice(o[5][0].indexOf(b),1),G=!1,gt(K)}}}function $a(o){let e,n;const a=[o[3],un];let l={$$slots:{default:[xa]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&8?ce(a,[s&8&&X(t[3]),s&0&&X(un)]):{};s&1031&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const un={description:"CSS Animations..."};function Ea(o,e,n){let a;const l={anim1:ma,anim2:ya,anim3:ga};let t="anim1",s=3e3;const r=[[]];function d(){t=this.__value,n(0,t)}function u(){t=this.__value,n(0,t)}function _(){t=this.__value,n(0,t)}function $(){s=wn(this.value),n(1,s)}return o.$$set=k=>{n(3,e=w(w({},e),H(k)))},o.$$.update=()=>{o.$$.dirty&3&&n(2,a=ka.replace("{{rule}}",l[t]).replace("{{duration}}",(s/1e3).toFixed(2)))},e=H(e),[t,s,a,e,d,r,u,_,$]}class ba extends le{constructor(e){super();oe(this,e,Ea,$a,re,{})}}var wa=`const string = 'Hello World';
const duration = {{duration}}

let start = Date.now();

function loop() {
  const now = Date.now();
  // time ranges from [0, 1]
  const time = (now - start) / duration;

  div.textContent = string.slice(0, Math.round(time * string.length));

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);`;function Da(o){let e,n,a,l,t,s,r,d,u,_,$;return{c(){e=v("h1"),n=m("JS Animations"),a=T(),l=v("div"),s=T(),r=v("input"),d=T(),u=v("div"),this.h()},l(k){e=h(k,"H1",{class:!0});var g=f(e);n=y(g,"JS Animations"),g.forEach(c),a=V(k),l=h(k,"DIV",{class:!0}),f(l).forEach(c),s=V(k),r=h(k,"INPUT",{type:!0,min:!0,max:!0,step:!0}),d=V(k),u=h(k,"DIV",{}),f(u).forEach(c),this.h()},h(){p(e,"class","svelte-9k5trb"),p(l,"class","code"),p(r,"type","range"),p(r,"min","100"),p(r,"max","10000"),p(r,"step","50")},m(k,g){E(k,e,g),i(e,n),E(k,a,g),E(k,l,g),E(k,s,g),E(k,r,g),wt(r,o[0]),E(k,d,g),E(k,u,g),o[5](u),_||($=[ge(t=we.call(null,l,o[2])),Le(r,"change",o[4]),Le(r,"input",o[4])],_=!0)},p(k,g){t&&Fe(t.update)&&g&4&&t.update.call(null,k[2]),g&1&&wt(r,k[0])},d(k){k&&c(e),k&&c(a),k&&c(l),k&&c(s),k&&c(r),k&&c(d),k&&c(u),o[5](null),_=!1,gt($)}}}function Ia(o){let e,n;const a=[o[3],pn];let l={$$slots:{default:[Da]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&8?ce(a,[s&8&&X(t[3]),s&0&&X(pn)]):{};s&135&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const pn={description:"JS Animations..."},xt="Hello World";function Oa(o,e,n){let a,l=3e3,t,s=Date.now();Fn(()=>{let u;function _(){const k=(Date.now()-s)/l,g=Math.round(k*xt.length)%xt.length;n(1,t.textContent=xt.slice(0,g===0?xt.length:g),t),u=requestAnimationFrame(_)}return u=requestAnimationFrame(_),()=>cancelAnimationFrame(u)});function r(){l=wn(this.value),n(0,l)}function d(u){Dn[u?"unshift":"push"](()=>{t=u,n(1,t)})}return o.$$set=u=>{n(3,e=w(w({},e),H(u)))},o.$$.update=()=>{o.$$.dirty&1&&n(2,a=wa.replace("{{duration}}",`${l}; // ${(l/1e3).toFixed(2)}s`))},e=H(e),[l,t,a,e,r,d]}class Ta extends le{constructor(e){super();oe(this,e,Oa,Ia,re,{})}}function Va(o){let e,n,a,l;return{c(){e=v("h1"),n=v("code"),a=m("transition:"),l=m(" in Vanilla JS"),this.h()},l(t){e=h(t,"H1",{});var s=f(e);n=h(s,"CODE",{class:!0});var r=f(n);a=y(r,"transition:"),r.forEach(c),l=y(s," in Vanilla JS"),s.forEach(c),this.h()},h(){p(n,"class","inline")},m(t,s){E(t,e,s),i(e,n),i(n,a),i(e,l)},d(t){t&&c(e)}}}function Ca(o){let e,n;const a=[o[0],dn];let l={$$slots:{default:[Va]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(dn)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const dn={description:"`transition:` in Vanilla JS..."};function La(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class Sa extends le{constructor(e){super();oe(this,e,La,Ca,re,{})}}function ja(o){let e,n,a,l;return{c(){e=v("h1"),n=v("code"),a=m("transition:"),l=m(" in compiled JS"),this.h()},l(t){e=h(t,"H1",{});var s=f(e);n=h(s,"CODE",{class:!0});var r=f(n);a=y(r,"transition:"),r.forEach(c),l=y(s," in compiled JS"),s.forEach(c),this.h()},h(){p(n,"class","inline")},m(t,s){E(t,e,s),i(e,n),i(n,a),i(e,l)},d(t){t&&c(e)}}}function Xa(o){let e,n;const a=[o[0],fn];let l={$$slots:{default:[ja]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(fn)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const fn={description:"`transition:` in compiled JS..."};function Ha(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class qa extends le{constructor(e){super();oe(this,e,Ha,Xa,re,{})}}var Ma=`function create_fragment(ctx) {
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
`;function Fa(o){let e,n,a,l,t;return{c(){e=v("div"),n=v("div"),this.h()},l(s){e=h(s,"DIV",{class:!0});var r=f(e);n=h(r,"DIV",{class:!0}),f(n).forEach(c),r.forEach(c),this.h()},h(){p(n,"class","code"),p(e,"class","container svelte-slvxkp")},m(s,r){E(s,e,r),i(e,n),l||(t=ge(a=we.call(null,n,o[0])),l=!0)},p(s,r){a&&Fe(a.update)&&r&1&&a.update.call(null,s[0])},d(s){s&&c(e),l=!1,t()}}}function Ua(o){let e,n;const a=[o[1],vn];let l={$$slots:{default:[Fa]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&2?ce(a,[s&2&&X(t[1]),s&0&&X(vn)]):{};s&33&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const vn={description:"..."};function Ba(o,e,n){let a,l=0;function t(){return l<1&&n(4,l++,l)<1}function s(){return l>0&&n(4,l--,l)>0}return o.$$set=r=>{n(1,e=w(w({},e),H(r)))},o.$$.update=()=>{o.$$.dirty&16&&n(0,a=[Ma,Aa][l])},e=H(e),[a,e,t,s,l]}class Ja extends le{constructor(e){super();oe(this,e,Ba,Ua,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}var Ye=`{#each array as item}
  <div transition:fade={{ delay: 10 }} />
{/each}`,Na=`{#each array as item}
  <div in:fade={{ delay: 10 }} />
{/each}`,za=`{#each array as item}
  <div out:fade={{ delay: 10 }} />
{/each}`,Pa=`// <div transition:fade />
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
`,Ga=`// <div transition:fade />
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
`,Ra=`// <div transition:fade />
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
}`,Wa=`// <div transition:fade />
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
}`,Ya=`// <div transition:fade />
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
}`,Ka=`// <div transition:fade />
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
`,Za=`// <div transition:fade />
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
`,Qa=`// <div transition:fade />
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
`,el=`// <div transition:fade />
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
`,tl=`// <div transition:fade />
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
`;function nl(o){let e,n,a,l,t,s,r,d,u,_,$;return{c(){e=v("div"),n=v("div"),l=T(),t=v("div"),r=T(),d=v("div"),this.h()},l(k){e=h(k,"DIV",{class:!0});var g=f(e);n=h(g,"DIV",{class:!0}),f(n).forEach(c),l=V(g),t=h(g,"DIV",{class:!0}),f(t).forEach(c),g.forEach(c),r=V(k),d=h(k,"DIV",{class:!0}),f(d).forEach(c),this.h()},h(){p(n,"class","code svelte-oi1ldz"),p(t,"class","code svelte-oi1ldz"),p(e,"class","container svelte-oi1ldz"),p(d,"class",u="box box-"+o[0]+" svelte-oi1ldz"),Z(d,"hidden",o[0]<1||o[0]===2||o[0]===5)},m(k,g){E(k,e,g),i(e,n),i(e,l),i(e,t),E(k,r,g),E(k,d,g),_||($=[ge(a=In.call(null,n,o[1])),ge(s=we.call(null,t,o[2]))],_=!0)},p(k,g){a&&Fe(a.update)&&g&2&&a.update.call(null,k[1]),s&&Fe(s.update)&&g&4&&s.update.call(null,k[2]),g&1&&u!==(u="box box-"+k[0]+" svelte-oi1ldz")&&p(d,"class",u),g&1&&Z(d,"hidden",k[0]<1||k[0]===2||k[0]===5)},d(k){k&&c(e),k&&c(r),k&&c(d),_=!1,gt($)}}}function sl(o){let e,n;const a=[o[3],hn];let l={$$slots:{default:[nl]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&8?ce(a,[s&8&&X(t[3]),s&0&&X(hn)]):{};s&519&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const hn={description:"..."};function al(o,e,n){let a,l,t=0;const s=[Pa,Ga,Ra,Wa,Ya,Ka,Za,Qa,el,tl],r=[Ye,Ye,Ye,Ye,Ye,Ye,Ye,Ye,Na,za],d=s.length-1;function u(){return t<d&&n(0,t++,t)<d}function _(){return t>0&&n(0,t--,t)>0}return o.$$set=$=>{n(3,e=w(w({},e),H($)))},o.$$.update=()=>{o.$$.dirty&1&&n(2,a=s[t]),o.$$.dirty&1&&n(1,l=r[t])},e=H(e),[t,l,a,e,u,_]}class ll extends le{constructor(e){super();oe(this,e,al,sl,re,{next:4,prev:5})}get next(){return this.$$.ctx[4]}get prev(){return this.$$.ctx[5]}}var ol=`export function create_in_transition(node, fn, params) {
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
}`;function rl(o){let e,n,a,l,t,s,r;return{c(){e=v("div"),n=v("div"),a=T(),l=v("div"),this.h()},l(d){e=h(d,"DIV",{class:!0});var u=f(e);n=h(u,"DIV",{class:!0}),f(n).forEach(c),a=V(u),l=h(u,"DIV",{class:!0}),f(l).forEach(c),u.forEach(c),this.h()},h(){p(n,"class","code"),p(l,"class",t="box box-"+o[0]+" svelte-18x8sxj"),Z(l,"hidden",!1),p(e,"class","container svelte-18x8sxj")},m(d,u){E(d,e,u),i(e,n),i(e,a),i(e,l),o[6](e),s||(r=ge(we.call(null,n,o[2])),s=!0)},p(d,u){u&1&&t!==(t="box box-"+d[0]+" svelte-18x8sxj")&&p(l,"class",t),u&1&&Z(l,"hidden",!1)},d(d){d&&c(e),o[6](null),s=!1,r()}}}function il(o){let e,n;const a=[o[3],_n];let l={$$slots:{default:[rl]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&8?ce(a,[s&8&&X(t[3]),s&0&&X(_n)]):{};s&515&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const _n={description:"..."};function cl(o,e,n){let a=0,l;const t=ol,s=[0,0,1920,1920,2064,2064,544,326,208,720,444,444,444],r=s.length-1;function d(){return a<r&&n(0,a++,a)<r}function u(){return a>0&&n(0,a--,a)>0}function _($){Dn[$?"unshift":"push"](()=>{l=$,n(1,l)})}return o.$$set=$=>{n(3,e=w(w({},e),H($)))},o.$$.update=()=>{o.$$.dirty&3&&l&&s[a]!==void 0&&l.scrollTo({top:s[a],behavior:"smooth"})},e=H(e),[a,l,t,e,d,u,_]}class ul extends le{constructor(e){super();oe(this,e,cl,il,re,{next:4,prev:5})}get next(){return this.$$.ctx[4]}get prev(){return this.$$.ctx[5]}}function pl(o){let e,n,a,l,t,s,r,d,u,_,$,k,g,C,q,D,O,b,S,L,N,Y,x,M,A,F,G,K,B,I,P,Q,ue,de,fe,ve,z,he,Se,ze,be,je,Ie,Ze,$e,Pe,Qe,De,Xe,xe,Ee,Ge,et,Ue,tt,Oe,He,nt,Te,Be,Ve,st;return{c(){e=v("h1"),n=m("Source code reference"),a=T(),l=v("h2"),t=v("a"),s=m("src/runtime/internal/transitions.ts"),r=T(),d=v("ul"),u=v("li"),_=v("code"),$=m("transition_in"),k=m(", "),g=v("code"),C=m("transition_out"),q=T(),D=v("li"),O=v("code"),b=m("create_in_transition"),S=m(", "),L=v("code"),N=m("create_out_transition"),Y=m(", "),x=v("code"),M=m("create_bidirectional_transition"),A=T(),F=v("h2"),G=v("a"),K=m("src/runtime/internal/style_manager.ts"),B=T(),I=v("ul"),P=v("li"),Q=v("code"),ue=m("create_rule"),de=m(", "),fe=v("code"),ve=m("delete_rule"),z=m(", "),he=v("code"),Se=m("clear_rules"),ze=T(),be=v("h2"),je=v("a"),Ie=m("src/runtime/transition/index.ts"),Ze=m(" ("),$e=v("code"),Pe=m("svelte/transition"),Qe=m(")"),De=T(),Xe=v("ul"),xe=v("li"),Ee=v("code"),Ge=m("fade"),et=m(", "),Ue=v("code"),tt=m("fly"),Oe=m(", "),He=v("code"),nt=m("slide"),Te=m(", "),Be=v("code"),Ve=m("crossfade"),st=m(", ..."),this.h()},l(U){e=h(U,"H1",{class:!0});var _e=f(e);n=y(_e,"Source code reference"),_e.forEach(c),a=V(U),l=h(U,"H2",{class:!0});var qe=f(l);t=h(qe,"A",{href:!0,rel:!0});var ct=f(t);s=y(ct,"src/runtime/internal/transitions.ts"),ct.forEach(c),qe.forEach(c),r=V(U),d=h(U,"UL",{});var at=f(d);u=h(at,"LI",{});var Me=f(u);_=h(Me,"CODE",{class:!0});var ye=f(_);$=y(ye,"transition_in"),ye.forEach(c),k=y(Me,", "),g=h(Me,"CODE",{class:!0});var j=f(g);C=y(j,"transition_out"),j.forEach(c),Me.forEach(c),q=V(at),D=h(at,"LI",{});var R=f(D);O=h(R,"CODE",{class:!0});var ae=f(O);b=y(ae,"create_in_transition"),ae.forEach(c),S=y(R,", "),L=h(R,"CODE",{class:!0});var Re=f(L);N=y(Re,"create_out_transition"),Re.forEach(c),Y=y(R,", "),x=h(R,"CODE",{class:!0});var Ae=f(x);M=y(Ae,"create_bidirectional_transition"),Ae.forEach(c),R.forEach(c),at.forEach(c),A=V(U),F=h(U,"H2",{class:!0});var ft=f(F);G=h(ft,"A",{href:!0,rel:!0});var vt=f(G);K=y(vt,"src/runtime/internal/style_manager.ts"),vt.forEach(c),ft.forEach(c),B=V(U),I=h(U,"UL",{});var lt=f(I);P=h(lt,"LI",{});var Je=f(P);Q=h(Je,"CODE",{class:!0});var ht=f(Q);ue=y(ht,"create_rule"),ht.forEach(c),de=y(Je,", "),fe=h(Je,"CODE",{class:!0});var _t=f(fe);ve=y(_t,"delete_rule"),_t.forEach(c),z=y(Je,", "),he=h(Je,"CODE",{class:!0});var ot=f(he);Se=y(ot,"clear_rules"),ot.forEach(c),Je.forEach(c),lt.forEach(c),ze=V(U),be=h(U,"H2",{class:!0});var We=f(be);je=h(We,"A",{href:!0,rel:!0});var kt=f(je);Ie=y(kt,"src/runtime/transition/index.ts"),kt.forEach(c),Ze=y(We," ("),$e=h(We,"CODE",{class:!0});var mt=f($e);Pe=y(mt,"svelte/transition"),mt.forEach(c),Qe=y(We,")"),We.forEach(c),De=V(U),Xe=h(U,"UL",{});var rt=f(Xe);xe=h(rt,"LI",{});var Ce=f(xe);Ee=h(Ce,"CODE",{class:!0});var ie=f(Ee);Ge=y(ie,"fade"),ie.forEach(c),et=y(Ce,", "),Ue=h(Ce,"CODE",{class:!0});var ut=f(Ue);tt=y(ut,"fly"),ut.forEach(c),Oe=y(Ce,", "),He=h(Ce,"CODE",{class:!0});var Tt=f(He);nt=y(Tt,"slide"),Tt.forEach(c),Te=y(Ce,", "),Be=h(Ce,"CODE",{class:!0});var Vt=f(Be);Ve=y(Vt,"crossfade"),Vt.forEach(c),st=y(Ce,", ..."),Ce.forEach(c),rt.forEach(c),this.h()},h(){p(e,"class","svelte-1khujlx"),p(t,"href","https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/transitions.ts"),p(t,"rel","nofollow"),p(l,"class","svelte-1khujlx"),p(_,"class","inline"),p(g,"class","inline"),p(O,"class","inline"),p(L,"class","inline"),p(x,"class","inline"),p(G,"href","https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/style_manager.ts"),p(G,"rel","nofollow"),p(F,"class","svelte-1khujlx"),p(Q,"class","inline"),p(fe,"class","inline"),p(he,"class","inline"),p(je,"href","https://github.com/sveltejs/svelte/blob/master/src/runtime/transition/index.ts"),p(je,"rel","nofollow"),p($e,"class","inline"),p(be,"class","svelte-1khujlx"),p(Ee,"class","inline"),p(Ue,"class","inline"),p(He,"class","inline"),p(Be,"class","inline")},m(U,_e){E(U,e,_e),i(e,n),E(U,a,_e),E(U,l,_e),i(l,t),i(t,s),E(U,r,_e),E(U,d,_e),i(d,u),i(u,_),i(_,$),i(u,k),i(u,g),i(g,C),i(d,q),i(d,D),i(D,O),i(O,b),i(D,S),i(D,L),i(L,N),i(D,Y),i(D,x),i(x,M),E(U,A,_e),E(U,F,_e),i(F,G),i(G,K),E(U,B,_e),E(U,I,_e),i(I,P),i(P,Q),i(Q,ue),i(P,de),i(P,fe),i(fe,ve),i(P,z),i(P,he),i(he,Se),E(U,ze,_e),E(U,be,_e),i(be,je),i(je,Ie),i(be,Ze),i(be,$e),i($e,Pe),i(be,Qe),E(U,De,_e),E(U,Xe,_e),i(Xe,xe),i(xe,Ee),i(Ee,Ge),i(xe,et),i(xe,Ue),i(Ue,tt),i(xe,Oe),i(xe,He),i(He,nt),i(xe,Te),i(xe,Be),i(Be,Ve),i(xe,st)},d(U){U&&c(e),U&&c(a),U&&c(l),U&&c(r),U&&c(d),U&&c(A),U&&c(F),U&&c(B),U&&c(I),U&&c(ze),U&&c(be),U&&c(De),U&&c(Xe)}}}function dl(o){let e,n;const a=[o[0],kn];let l={$$slots:{default:[pl]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(kn)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const kn={description:"Source code referencesrc/runtime/internal/transitions.ts`transition_in`, `transition_out``create_in_transition`, `create_out_transition`, `create_bidirectional_transition`src/runtime/internal/style_manager.ts..."};function fl(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class vl extends le{constructor(e){super();oe(this,e,fl,dl,re,{})}}function hl(o){let e,n,a,l,t,s,r,d,u,_,$,k,g,C,q,D,O;return{c(){e=v("div"),n=v("div"),a=m("\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),l=v("code"),t=m("transition:"),s=T(),r=v("div"),d=m("\u{1F697}  Level 2\uFE0F\u20E3  - The "),u=v("code"),_=m("transition:"),$=m(" contract"),k=T(),g=v("div"),C=m("\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),q=v("code"),D=m("transition:"),O=m(" in your Head"),this.h()},l(b){e=h(b,"DIV",{class:!0});var S=f(e);n=h(S,"DIV",{class:!0});var L=f(n);a=y(L,"\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),l=h(L,"CODE",{});var N=f(l);t=y(N,"transition:"),N.forEach(c),L.forEach(c),s=V(S),r=h(S,"DIV",{class:!0});var Y=f(r);d=y(Y,"\u{1F697}  Level 2\uFE0F\u20E3  - The "),u=h(Y,"CODE",{});var x=f(u);_=y(x,"transition:"),x.forEach(c),$=y(Y," contract"),Y.forEach(c),k=V(S),g=h(S,"DIV",{class:!0});var M=f(g);C=y(M,"\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),q=h(M,"CODE",{});var A=f(q);D=y(A,"transition:"),A.forEach(c),O=y(M," in your Head"),M.forEach(c),S.forEach(c),this.h()},h(){p(n,"class","svelte-rvhzm1"),p(r,"class","svelte-rvhzm1"),p(g,"class","svelte-rvhzm1"),p(e,"class","container svelte-rvhzm1")},m(b,S){E(b,e,S),i(e,n),i(n,a),i(n,l),i(l,t),i(e,s),i(e,r),i(r,d),i(r,u),i(u,_),i(r,$),i(e,k),i(e,g),i(g,C),i(g,q),i(q,D),i(g,O)},d(b){b&&c(e)}}}function _l(o){let e,n;const a=[o[0],mn];let l={$$slots:{default:[hl]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(mn)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const mn={description:"..."};function kl(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class ml extends le{constructor(e){super();oe(this,e,kl,_l,re,{})}}function yl(o){let e,n,a,l,t,s,r;return{c(){e=v("div"),n=v("div"),a=v("h1"),l=m("Thank you"),t=T(),s=v("p"),r=m("@lihautan"),this.h()},l(d){e=h(d,"DIV",{class:!0});var u=f(e);n=h(u,"DIV",{});var _=f(n);a=h(_,"H1",{});var $=f(a);l=y($,"Thank you"),$.forEach(c),t=V(_),s=h(_,"P",{});var k=f(s);r=y(k,"@lihautan"),k.forEach(c),_.forEach(c),u.forEach(c),this.h()},h(){p(e,"class","container svelte-1296l67")},m(d,u){E(d,e,u),i(e,n),i(n,a),i(a,l),i(n,t),i(n,s),i(s,r)},d(d){d&&c(e)}}}function gl(o){let e,n;const a=[o[0],yn];let l={$$slots:{default:[yl]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new pe({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&1?ce(a,[s&1&&X(t[0]),s&0&&X(yn)]):{};s&2&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const yn={description:"Thank you@lihautan..."};function xl(o,e,n){return o.$$set=a=>{n(0,e=w(w({},e),H(a)))},e=H(e),[e]}class $l extends le{constructor(e){super();oe(this,e,xl,gl,re,{})}}function El(o){let e,n;return e=new Bn({props:{slides:o[0]}}),{c(){ee(e.$$.fragment)},l(a){te(e.$$.fragment,a)},m(a,l){ne(e,a,l),n=!0},p:Ne,i(a){n||(J(e.$$.fragment,a),n=!0)},o(a){W(e.$$.fragment,a),n=!1},d(a){se(e,a)}}}function bl(o){let e,n;const a=[o[1],gn];let l={$$slots:{default:[El]},$$scope:{ctx:o}};for(let t=0;t<a.length;t+=1)l=w(l,a[t]);return e=new Un({props:l}),{c(){ee(e.$$.fragment)},l(t){te(e.$$.fragment,t)},m(t,s){ne(e,t,s),n=!0},p(t,[s]){const r=s&2?ce(a,[s&2&&X(t[1]),s&0&&X(gn)]):{};s&4&&(r.$$scope={dirty:s,ctx:t}),e.$set(r)},i(t){n||(J(e.$$.fragment,t),n=!0)},o(t){W(e.$$.fragment,t),n=!1},d(t){se(e,t)}}}const gn={layout:"slide",description:"..."};function wl(o,e,n){const a=[Rn,Zn,ls,cs,ys,Es,Is,Cs,Xs,As,Js,Zs,na,oa,ua,_a,ba,Ta,Sa,qa,Ja,ll,ul,vl,ml,$l];return o.$$set=l=>{n(1,e=w(w({},e),H(l)))},e=H(e),[a,e]}class Sl extends le{constructor(e){super();oe(this,e,wl,bl,re,{})}}export{Sl as default,gn as metadata};
