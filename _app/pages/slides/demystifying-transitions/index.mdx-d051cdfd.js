import{S as le,i as oe,s as re,C as w,w as K,x as ee,y as te,z as ce,A as ae,q as B,o as G,B as ne,R as S,e as v,t as m,c as h,a as d,h as y,d as c,b as p,g as E,F as i,_ as it,$ as Qe,U as Le,a0 as Gt,a1 as Wt,k as V,l as Et,m as T,n as pt,p as ft,a2 as bt,a3 as It,a4 as Yt,a5 as Ct,a6 as Lt,a7 as jt,Q as $t,a8 as Q,a9 as Dt,j as Ot,X as ge,aa as Fe,T as Qt,ab as gt,O as ze,M as ke,N as me,f as yt,ac as Xt,ad as tn,ae as nn,af as sn,ag as an,ah as ln,ai as on,aj as rn,ak as cn,al as un,am as pn,an as fn,ao as dn,ap as Zt,aq as wt,ar as St,v as vn,as as Kt}from"../../../chunks/vendor-6bf294e3.js";import{S as hn,a as _n}from"../../../chunks/Slides-c640f66a.js";import{B as pe}from"../../../chunks/BlogLayout-152f599b.js";import{p as en,a as we,b as kn}from"../../../chunks/prism-b3c0209c.js";/* empty css                                   */import"../../../chunks/stores-e20b7872.js";import"../../../chunks/WebMentions-745413ea.js";function Ht(o){let e,n,s,l;return{c(){e=v("h1"),n=m("\u{1F680} Demystifying Transitions"),this.h()},l(t){e=h(t,"H1",{class:!0});var a=d(e);n=y(a,"\u{1F680} Demystifying Transitions"),a.forEach(c),this.h()},h(){p(e,"class","svelte-kb1uhf")},m(t,a){E(t,e,a),i(e,n),l=!0},p(t,a){},i(t){l||(it(()=>{s||(s=Qe(e,It,{easing:bt,duration:3e3,delay:900},!0)),s.run(1)}),l=!0)},o(t){s||(s=Qe(e,It,{easing:bt,duration:3e3,delay:900},!1)),s.run(0),l=!1},d(t){t&&c(e),t&&s&&s.end()}}}function qt(o){let e,n,s,l,t,a,r;return{c(){e=v("button"),n=m("Click Me"),this.h()},l(f){e=h(f,"BUTTON",{class:!0});var u=d(e);n=y(u,"Click Me"),u.forEach(c),this.h()},h(){p(e,"class","svelte-kb1uhf")},m(f,u){E(f,e,u),i(e,n),t=!0,a||(r=Le(e,"click",o[4]),a=!0)},p(f,u){o=f},i(f){t||(it(()=>{l&&l.end(1),s=Gt(e,It,{easing:Yt}),s.start()}),t=!0)},o(f){s&&s.invalidate(),l=Wt(e,gn,{easing:bt,duration:1200,y:-200}),t=!1},d(f){f&&c(e),f&&l&&l.end(),a=!1,r()}}}function mn(o){let e,n,s,l=o[0]===2&&Ht(),t=o[0]===1&&qt(o);return{c(){l&&l.c(),e=V(),t&&t.c(),n=Et()},l(a){l&&l.l(a),e=T(a),t&&t.l(a),n=Et()},m(a,r){l&&l.m(a,r),E(a,e,r),t&&t.m(a,r),E(a,n,r),s=!0},p(a,r){a[0]===2?l?(l.p(a,r),r&1&&B(l,1)):(l=Ht(),l.c(),B(l,1),l.m(e.parentNode,e)):l&&(pt(),G(l,1,1,()=>{l=null}),ft()),a[0]===1?t?(t.p(a,r),r&1&&B(t,1)):(t=qt(a),t.c(),B(t,1),t.m(n.parentNode,n)):t&&(pt(),G(t,1,1,()=>{t=null}),ft())},i(a){s||(B(l),B(t),s=!0)},o(a){G(l),G(t),s=!1},d(a){l&&l.d(a),a&&c(e),t&&t.d(a),a&&c(n)}}}function yn(o){let e,n;const s=[o[1]];let l={$$slots:{default:[mn]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&2?ce(s,[ae(t[1])]):{};a&33&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function gn(o,e){return{delay:e.delay,duration:e.duration,easing:e.easing,css(n,s){return`transform: translateX(-50%) translateY(${s*e.y}px) scale(${n})`}}}function xn(o,e,n){let s=0;function l(){return s===2?!1:(n(0,s++,s),!0)}function t(){return s===0?!1:(n(0,s--,s),!0)}const a=()=>n(0,s=2);return o.$$set=r=>{n(1,e=w(w({},e),S(r)))},e=S(e),[s,e,l,t,a]}class $n extends le{constructor(e){super();oe(this,e,xn,yn,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}function Mt(o){let e,n,s,l,t,a;return{c(){e=v("div"),n=m("\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),s=v("code"),l=m("transition:"),this.h()},l(r){e=h(r,"DIV",{class:!0});var f=d(e);n=y(f,"\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),s=h(f,"CODE",{});var u=d(s);l=y(u,"transition:"),u.forEach(c),f.forEach(c),this.h()},h(){p(e,"class","actual svelte-1h90ifj")},m(r,f){E(r,e,f),i(e,n),i(e,s),i(s,l),a=!0},i(r){a||(it(()=>{t||(t=Qe(e,Ct,{},!0)),t.run(1)}),a=!0)},o(r){t||(t=Qe(e,Ct,{},!1)),t.run(0),a=!1},d(r){r&&c(e),r&&t&&t.end()}}}function At(o){let e,n,s,l,t,a,r;return{c(){e=v("div"),n=m("\u{1F697}  Level 2\uFE0F\u20E3  - The "),s=v("code"),l=m("transition:"),t=m(" contract"),this.h()},l(f){e=h(f,"DIV",{class:!0});var u=d(e);n=y(u,"\u{1F697}  Level 2\uFE0F\u20E3  - The "),s=h(u,"CODE",{});var _=d(s);l=y(_,"transition:"),_.forEach(c),t=y(u," contract"),u.forEach(c),this.h()},h(){p(e,"class","actual svelte-1h90ifj")},m(f,u){E(f,e,u),i(e,n),i(e,s),i(s,l),i(e,t),r=!0},i(f){r||(it(()=>{a||(a=Qe(e,Lt,{},!0)),a.run(1)}),r=!0)},o(f){a||(a=Qe(e,Lt,{},!1)),a.run(0),r=!1},d(f){f&&c(e),f&&a&&a.end()}}}function Ft(o){let e,n,s,l,t,a,r;return{c(){e=v("div"),n=m("\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),s=v("code"),l=m("transition:"),t=m(" in your Head"),this.h()},l(f){e=h(f,"DIV",{class:!0});var u=d(e);n=y(u,"\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),s=h(u,"CODE",{});var _=d(s);l=y(_,"transition:"),_.forEach(c),t=y(u," in your Head"),u.forEach(c),this.h()},h(){p(e,"class","actual svelte-1h90ifj")},m(f,u){E(f,e,u),i(e,n),i(e,s),i(s,l),i(e,t),r=!0},i(f){r||(it(()=>{a||(a=Qe(e,jt,{y:30},!0)),a.run(1)}),r=!0)},o(f){a||(a=Qe(e,jt,{y:30},!1)),a.run(0),r=!1},d(f){f&&c(e),f&&a&&a.end()}}}function En(o){let e,n,s,l,t,a,r,f,u,_,$,k,g,C,H,D,O,b,j,L,N,W,x,q,M=o[0]>=1&&Mt(),A=o[0]>=2&&At(),P=o[0]>=3&&Ft();return{c(){e=v("div"),n=v("div"),s=v("div"),l=m("\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),t=v("code"),a=m("transition:"),r=V(),M&&M.c(),f=V(),u=v("div"),_=v("div"),$=m("\u{1F697}  Level 2\uFE0F\u20E3  - The "),k=v("code"),g=m("transition:"),C=m(" contract"),H=V(),A&&A.c(),D=V(),O=v("div"),b=v("div"),j=m("\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),L=v("code"),N=m("transition:"),W=m(" in your Head"),x=V(),P&&P.c(),this.h()},l(Y){e=h(Y,"DIV",{class:!0});var U=d(e);n=h(U,"DIV",{class:!0});var I=d(n);s=h(I,"DIV",{class:!0});var J=d(s);l=y(J,"\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),t=h(J,"CODE",{});var Z=d(t);a=y(Z,"transition:"),Z.forEach(c),J.forEach(c),r=T(I),M&&M.l(I),I.forEach(c),f=T(U),u=h(U,"DIV",{class:!0});var ue=d(u);_=h(ue,"DIV",{class:!0});var fe=d(_);$=y(fe,"\u{1F697}  Level 2\uFE0F\u20E3  - The "),k=h(fe,"CODE",{});var de=d(k);g=y(de,"transition:"),de.forEach(c),C=y(fe," contract"),fe.forEach(c),H=T(ue),A&&A.l(ue),ue.forEach(c),D=T(U),O=h(U,"DIV",{class:!0});var ve=d(O);b=h(ve,"DIV",{class:!0});var z=d(b);j=y(z,"\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),L=h(z,"CODE",{});var he=d(L);N=y(he,"transition:"),he.forEach(c),W=y(z," in your Head"),z.forEach(c),x=T(ve),P&&P.l(ve),ve.forEach(c),U.forEach(c),this.h()},h(){p(s,"class","placeholder svelte-1h90ifj"),p(n,"class","svelte-1h90ifj"),p(_,"class","placeholder svelte-1h90ifj"),p(u,"class","svelte-1h90ifj"),p(b,"class","placeholder svelte-1h90ifj"),p(O,"class","svelte-1h90ifj"),p(e,"class","container svelte-1h90ifj")},m(Y,U){E(Y,e,U),i(e,n),i(n,s),i(s,l),i(s,t),i(t,a),i(n,r),M&&M.m(n,null),i(e,f),i(e,u),i(u,_),i(_,$),i(_,k),i(k,g),i(_,C),i(u,H),A&&A.m(u,null),i(e,D),i(e,O),i(O,b),i(b,j),i(b,L),i(L,N),i(b,W),i(O,x),P&&P.m(O,null),q=!0},p(Y,U){Y[0]>=1?M?U&1&&B(M,1):(M=Mt(),M.c(),B(M,1),M.m(n,null)):M&&(pt(),G(M,1,1,()=>{M=null}),ft()),Y[0]>=2?A?U&1&&B(A,1):(A=At(),A.c(),B(A,1),A.m(u,null)):A&&(pt(),G(A,1,1,()=>{A=null}),ft()),Y[0]>=3?P?U&1&&B(P,1):(P=Ft(),P.c(),B(P,1),P.m(O,null)):P&&(pt(),G(P,1,1,()=>{P=null}),ft())},i(Y){q||(B(M),B(A),B(P),q=!0)},o(Y){G(M),G(A),G(P),q=!1},d(Y){Y&&c(e),M&&M.d(),A&&A.d(),P&&P.d()}}}function bn(o){let e,n;const s=[o[1]];let l={$$slots:{default:[En]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&2?ce(s,[ae(t[1])]):{};a&17&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function wn(o,e,n){let s=0;function l(){return s===3?!1:(n(0,s++,s),!0)}function t(){return s===0?!1:(n(0,s--,s),!0)}return o.$$set=a=>{n(1,e=w(w({},e),S(a)))},e=S(e),[s,e,l,t]}class Dn extends le{constructor(e){super();oe(this,e,wn,bn,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}var In="/_app/assets/profile-pic-09f4ed02.png",On="/_app/assets/penang-rojak-cb9bf904.jpg",Vn="/_app/assets/koay-teow-a6e6fdb3.jpg";function Tn(o){let e,n,s,l,t,a,r,f,u,_,$,k,g,C,H,D,O,b,j,L,N,W,x,q,M,A,P,Y,U;return{c(){e=v("img"),s=V(),l=v("p"),t=m("@lihautan"),a=V(),r=v("ul"),f=v("li"),u=m("\u{1F468}\u{1F3FB}\u200D\u{1F4BB} Frontend engineer at Shopee Singapore"),_=V(),$=v("li"),k=m("\u{1F1F2}\u{1F1FE} Grew up in Penang, Malaysia"),g=V(),C=v("li"),H=m("\u{1F6E0} Svelte Maintainer"),D=V(),O=v("div"),b=v("img"),L=V(),N=v("div"),W=m("Image credit: sidechef.com"),x=V(),q=v("div"),M=v("img"),P=V(),Y=v("div"),U=m("Image credit: tripadvisor.com"),this.h()},l(I){e=h(I,"IMG",{src:!0,alt:!0,class:!0}),s=T(I),l=h(I,"P",{class:!0});var J=d(l);t=y(J,"@lihautan"),J.forEach(c),a=T(I),r=h(I,"UL",{class:!0});var Z=d(r);f=h(Z,"LI",{});var ue=d(f);u=y(ue,"\u{1F468}\u{1F3FB}\u200D\u{1F4BB} Frontend engineer at Shopee Singapore"),ue.forEach(c),_=T(Z),$=h(Z,"LI",{});var fe=d($);k=y(fe,"\u{1F1F2}\u{1F1FE} Grew up in Penang, Malaysia"),fe.forEach(c),g=T(Z),C=h(Z,"LI",{});var de=d(C);H=y(de,"\u{1F6E0} Svelte Maintainer"),de.forEach(c),Z.forEach(c),D=T(I),O=h(I,"DIV",{class:!0});var ve=d(O);b=h(ve,"IMG",{src:!0,alt:!0,class:!0}),L=T(ve),N=h(ve,"DIV",{});var z=d(N);W=y(z,"Image credit: sidechef.com"),z.forEach(c),ve.forEach(c),x=T(I),q=h(I,"DIV",{class:!0});var he=d(q);M=h(he,"IMG",{src:!0,alt:!0,class:!0}),P=T(he),Y=h(he,"DIV",{});var je=d(Y);U=y(je,"Image credit: tripadvisor.com"),je.forEach(c),he.forEach(c),this.h()},h(){$t(e.src,n=In)||p(e,"src",n),p(e,"alt","profile"),p(e,"class","svelte-1l0c6ie"),p(l,"class","svelte-1l0c6ie"),p(r,"class","svelte-1l0c6ie"),$t(b.src,j=Vn)||p(b,"src",j),p(b,"alt","char koay teow"),p(b,"class","svelte-1l0c6ie"),p(O,"class","ckt svelte-1l0c6ie"),Q(O,"hidden",o[0]<1||o[0]>=3),$t(M.src,A=On)||p(M,"src",A),p(M,"alt","rojak"),p(M,"class","svelte-1l0c6ie"),p(q,"class","rojak svelte-1l0c6ie"),Q(q,"hidden",o[0]<2||o[0]>=3)},m(I,J){E(I,e,J),E(I,s,J),E(I,l,J),i(l,t),E(I,a,J),E(I,r,J),i(r,f),i(f,u),i(r,_),i(r,$),i($,k),i(r,g),i(r,C),i(C,H),E(I,D,J),E(I,O,J),i(O,b),i(O,L),i(O,N),i(N,W),E(I,x,J),E(I,q,J),i(q,M),i(q,P),i(q,Y),i(Y,U)},p(I,J){J&1&&Q(O,"hidden",I[0]<1||I[0]>=3),J&1&&Q(q,"hidden",I[0]<2||I[0]>=3)},d(I){I&&c(e),I&&c(s),I&&c(l),I&&c(a),I&&c(r),I&&c(D),I&&c(O),I&&c(x),I&&c(q)}}}function Cn(o){let e,n;const s=[o[1]];let l={$$slots:{default:[Tn]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&2?ce(s,[ae(t[1])]):{};a&17&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Ln(o,e,n){let s=0;function l(){return s===3?!1:(n(0,s++,s),!0)}function t(){return s===0?!1:(n(0,s--,s),!0)}return o.$$set=a=>{n(1,e=w(w({},e),S(a)))},e=S(e),[s,e,l,t]}class jn extends le{constructor(e){super();oe(this,e,Ln,Cn,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}function Xn(o){let e,n,s,l,t;return{c(){e=v("div"),n=v("h1"),s=m("\u{1F6B4}\u200D\u2642\uFE0F 1\uFE0F\u20E3  Using "),l=v("code"),t=m("transition:"),this.h()},l(a){e=h(a,"DIV",{class:!0});var r=d(e);n=h(r,"H1",{class:!0});var f=d(n);s=y(f,"\u{1F6B4}\u200D\u2642\uFE0F 1\uFE0F\u20E3  Using "),l=h(f,"CODE",{class:!0});var u=d(l);t=y(u,"transition:"),u.forEach(c),f.forEach(c),r.forEach(c),this.h()},h(){p(l,"class","inline"),p(n,"class","svelte-11o4zfu"),p(e,"class","svelte-11o4zfu")},m(a,r){E(a,e,r),i(e,n),i(n,s),i(n,l),i(l,t)},d(a){a&&c(e)}}}function Sn(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Xn]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Hn(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class qn extends le{constructor(e){super();oe(this,e,Hn,Sn,re,{})}}var Mn=`{#each items as item}
  <div>{item}</div>
{/each}`,An=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div>{item}</div>
{/each}`,Fn=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div in:fade>{item}</div>
{/each}`,Un=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div in:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,Bn=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div out:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`,Nn=`<script>
  import { fade } from 'svelte/transition';  
<\/script>

{#each items as item}
  <div transition:fade={{ duration: 4000, delay: 500 }}>{item}</div>
{/each}`;function Ut(o,e,n){const s=o.slice();return s[12]=e[n],s}function Bt(o){let e,n=o[12]+"",s,l,t,a;return{c(){e=v("div"),s=m(n)},l(r){e=h(r,"DIV",{});var f=d(e);s=y(f,n),f.forEach(c)},m(r,f){E(r,e,f),i(e,s),a=!0},p(r,f){(!a||f&1)&&n!==(n=r[12]+"")&&Ot(s,n)},i(r){a||(it(()=>{t&&t.end(1),l=Gt(e,o[4],{}),l.start()}),a=!0)},o(r){l&&l.invalidate(),t=Wt(e,o[5],{}),a=!1},d(r){r&&c(e),r&&t&&t.end()}}}function zn(o){let e,n,s,l,t,a,r,f,u,_,$,k,g,C,H=o[0],D=[];for(let b=0;b<H.length;b+=1)D[b]=Bt(Ut(o,H,b));const O=b=>G(D[b],1,1,()=>{D[b]=null});return{c(){e=v("div"),n=v("div"),l=V(),t=v("div"),a=v("button"),r=m("Add"),f=V(),u=v("button"),_=m("Remove"),$=V();for(let b=0;b<D.length;b+=1)D[b].c();this.h()},l(b){e=h(b,"DIV",{class:!0});var j=d(e);n=h(j,"DIV",{class:!0}),d(n).forEach(c),l=T(j),t=h(j,"DIV",{});var L=d(t);a=h(L,"BUTTON",{});var N=d(a);r=y(N,"Add"),N.forEach(c),f=T(L),u=h(L,"BUTTON",{});var W=d(u);_=y(W,"Remove"),W.forEach(c),$=T(L);for(let x=0;x<D.length;x+=1)D[x].l(L);L.forEach(c),j.forEach(c),this.h()},h(){p(n,"class","code"),p(e,"class","container svelte-zwzan3")},m(b,j){E(b,e,j),i(e,n),i(e,l),i(e,t),i(t,a),i(a,r),i(t,f),i(t,u),i(u,_),i(t,$);for(let L=0;L<D.length;L+=1)D[L].m(t,null);k=!0,g||(C=[ge(s=en.call(null,n,o[1])),Le(a,"click",o[2]),Le(u,"click",o[3])],g=!0)},p(b,j){if(s&&Fe(s.update)&&j&2&&s.update.call(null,b[1]),j&1){H=b[0];let L;for(L=0;L<H.length;L+=1){const N=Ut(b,H,L);D[L]?(D[L].p(N,j),B(D[L],1)):(D[L]=Bt(N),D[L].c(),B(D[L],1),D[L].m(t,null))}for(pt(),L=H.length;L<D.length;L+=1)O(L);ft()}},i(b){if(!k){for(let j=0;j<H.length;j+=1)B(D[j]);k=!0}},o(b){D=D.filter(Boolean);for(let j=0;j<D.length;j+=1)G(D[j]);k=!1},d(b){b&&c(e),Qt(D,b),g=!1,gt(C)}}}function Jn(o){let e,n;const s=[o[6]];let l={$$slots:{default:[zn]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&64?ce(s,[ae(t[6])]):{};a&32771&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Pn(o,e,n){let s,l=0;const t=[Mn,An,Fn,Un,Bn,Nn],a=t.length-1;function r(){return l<a&&n(9,l++,l)<a}function f(){return l>0&&n(9,l--,l)>0}let u=["a","b"];function _(){n(0,u=[...u,String.fromCharCode(97+u.length)])}function $(){n(0,u=u.slice(0,-1))}function k(C){return function(){return l===2?Dt(C,{}):l===3||l===5?Dt(C,{duration:4e3,delay:500}):{duration:0}}}function g(C){return function(){return l===4||l===5?Dt(C,{duration:4e3,delay:500}):{duration:0}}}return o.$$set=C=>{n(6,e=w(w({},e),S(C)))},o.$$.update=()=>{o.$$.dirty&512&&n(1,s=t[l])},e=S(e),[u,s,_,$,k,g,e,r,f,l]}class Rn extends le{constructor(e){super();oe(this,e,Pn,Jn,re,{next:7,prev:8})}get next(){return this.$$.ctx[7]}get prev(){return this.$$.ctx[8]}}function Gn(o){let e,n,s=`<pre class="prism language-svelte"><code><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript"></div><div class="line">  <span class="token keyword">import</span> <span class="token punctuation">&#123;</span> fly<span class="token punctuation">,</span> slide<span class="token punctuation">,</span> scale<span class="token punctuation">,</span> blur <span class="token punctuation">&#125;</span> <span class="token keyword">from</span> <span class="token string">'svelte/transition'</span><span class="token punctuation">;</span></div><div class="line"></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></div><div class="line"></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>fly=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">x</span><span class="token operator">:</span> <span class="token number">50</span><span class="token punctuation">,</span> <span class="token literal-property property">y</span><span class="token operator">:</span><span class="token number">50</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>slide</span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>scale=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">start</span><span class="token operator">:</span> <span class="token number">0.5</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div><div class="line"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name"><span class="token namespace">transition:</span>blur=</span><span class="token language-javascript"><span class="token punctuation">&#123;</span><span class="token punctuation">&#123;</span><span class="token literal-property property">amount</span><span class="token operator">:</span> <span class="token number">2</span><span class="token punctuation">&#125;</span><span class="token punctuation">&#125;</span></span> <span class="token punctuation">/></span></span></div></code></pre>`;return{c(){e=v("div"),n=v("div"),this.h()},l(l){e=h(l,"DIV",{class:!0});var t=d(e);n=h(t,"DIV",{class:!0});var a=d(n);a.forEach(c),t.forEach(c),this.h()},h(){p(n,"class","code-section"),p(e,"class","container svelte-l83dwf")},m(l,t){E(l,e,t),i(e,n),n.innerHTML=s},p:ze,d(l){l&&c(e)}}}function Wn(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Gn]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Yn(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class Qn extends le{constructor(e){super();oe(this,e,Yn,Wn,re,{})}}function Zn(o){let e,n,s,l,t,a,r,f,u;return{c(){e=v("div"),n=v("ul"),s=v("li"),l=v("a"),t=m("https://svelte.dev/docs#svelte_transition"),a=V(),r=v("li"),f=v("a"),u=m("https://svelte.dev/tutorial/transition"),this.h()},l(_){e=h(_,"DIV",{class:!0});var $=d(e);n=h($,"UL",{class:!0});var k=d(n);s=h(k,"LI",{class:!0});var g=d(s);l=h(g,"A",{href:!0,rel:!0});var C=d(l);t=y(C,"https://svelte.dev/docs#svelte_transition"),C.forEach(c),g.forEach(c),a=T(k),r=h(k,"LI",{class:!0});var H=d(r);f=h(H,"A",{href:!0,rel:!0});var D=d(f);u=y(D,"https://svelte.dev/tutorial/transition"),D.forEach(c),H.forEach(c),k.forEach(c),$.forEach(c),this.h()},h(){p(l,"href","https://svelte.dev/docs#svelte_transition"),p(l,"rel","nofollow"),p(s,"class","svelte-h8tvqg"),p(f,"href","https://svelte.dev/tutorial/transition"),p(f,"rel","nofollow"),p(r,"class","svelte-h8tvqg"),p(n,"class","svelte-h8tvqg"),p(e,"class","svelte-h8tvqg")},m(_,$){E(_,e,$),i(e,n),i(n,s),i(s,l),i(l,t),i(n,a),i(n,r),i(r,f),i(f,u)},d(_){_&&c(e)}}}function Kn(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Zn]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function es(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class ts extends le{constructor(e){super();oe(this,e,es,Kn,re,{})}}function ns(o){let e,n,s,l,t,a;return{c(){e=v("div"),n=v("h1"),s=m("\u{1F697} 2\uFE0F\u20E3  The "),l=v("code"),t=m("transition:"),a=m(" contract"),this.h()},l(r){e=h(r,"DIV",{class:!0});var f=d(e);n=h(f,"H1",{class:!0});var u=d(n);s=y(u,"\u{1F697} 2\uFE0F\u20E3  The "),l=h(u,"CODE",{class:!0});var _=d(l);t=y(_,"transition:"),_.forEach(c),a=y(u," contract"),u.forEach(c),f.forEach(c),this.h()},h(){p(l,"class","inline"),p(n,"class","svelte-11o4zfu"),p(e,"class","svelte-11o4zfu")},m(r,f){E(r,e,f),i(e,n),i(n,s),i(n,l),i(l,t),i(n,a)},d(r){r&&c(e)}}}function ss(o){let e,n;const s=[o[0]];let l={$$slots:{default:[ns]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function as(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class ls extends le{constructor(e){super();oe(this,e,as,ss,re,{})}}function os(o){let e,n,s,l,t,a,r,f=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=v("h2"),n=m("The "),s=v("code"),l=m("transition:"),t=m(" contract"),a=V(),r=v("div"),this.h()},l(u){e=h(u,"H2",{});var _=d(e);n=y(_,"The "),s=h(_,"CODE",{class:!0});var $=d(s);l=y($,"transition:"),$.forEach(c),t=y(_," contract"),_.forEach(c),a=T(u),r=h(u,"DIV",{class:!0});var k=d(r);k.forEach(c),this.h()},h(){p(s,"class","inline"),p(r,"class","code-section")},m(u,_){E(u,e,_),i(e,n),i(e,s),i(s,l),i(e,t),E(u,a,_),E(u,r,_),r.innerHTML=f},p:ze,d(u){u&&c(e),u&&c(a),u&&c(r)}}}function rs(o){let e,n;const s=[o[0]];let l={$$slots:{default:[os]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function is(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class cs extends le{constructor(e){super();oe(this,e,is,rs,re,{})}}function us(o){let e,n,s,l,t,a,r,f=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=v("h2"),n=m("The "),s=v("code"),l=m("transition:"),t=m(" contract"),a=V(),r=v("div"),this.h()},l(u){e=h(u,"H2",{});var _=d(e);n=y(_,"The "),s=h(_,"CODE",{class:!0});var $=d(s);l=y($,"transition:"),$.forEach(c),t=y(_," contract"),_.forEach(c),a=T(u),r=h(u,"DIV",{class:!0});var k=d(r);k.forEach(c),this.h()},h(){p(s,"class","inline"),p(r,"class","code-section")},m(u,_){E(u,e,_),i(e,n),i(e,s),i(s,l),i(e,t),E(u,a,_),E(u,r,_),r.innerHTML=f},p:ze,d(u){u&&c(e),u&&c(a),u&&c(r)}}}function ps(o){let e,n;const s=[o[0]];let l={$$slots:{default:[us]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function fs(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class ds extends le{constructor(e){super();oe(this,e,fs,ps,re,{})}}function vs(o){let e,n,s,l,t,a,r,f=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=v("h2"),n=m("The "),s=v("code"),l=m("transition:"),t=m(" contract"),a=V(),r=v("div"),this.h()},l(u){e=h(u,"H2",{});var _=d(e);n=y(_,"The "),s=h(_,"CODE",{class:!0});var $=d(s);l=y($,"transition:"),$.forEach(c),t=y(_," contract"),_.forEach(c),a=T(u),r=h(u,"DIV",{class:!0});var k=d(r);k.forEach(c),this.h()},h(){p(s,"class","inline"),p(r,"class","code-section")},m(u,_){E(u,e,_),i(e,n),i(e,s),i(s,l),i(e,t),E(u,a,_),E(u,r,_),r.innerHTML=f},p:ze,d(u){u&&c(e),u&&c(a),u&&c(r)}}}function hs(o){let e,n;const s=[o[0]];let l={$$slots:{default:[vs]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function _s(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class ks extends le{constructor(e){super();oe(this,e,_s,hs,re,{})}}function Nt(o,e,n){const s=o.slice();return s[1]=e[n],s}function zt(o){let e,n=o[1].name+"",s,l;return{c(){e=v("option"),s=m(n),this.h()},l(t){e=h(t,"OPTION",{});var a=d(e);s=y(a,n),a.forEach(c),this.h()},h(){e.__value=l=o[1],e.value=e.__value},m(t,a){E(t,e,a),i(e,s)},p:ze,d(t){t&&c(e)}}}function ms(o){let e,n,s,l,t,a,r,f,u,_,$,k,g,C,H,D,O,b,j,L,N,W,x,q,M,A,P,Y,U,I,J,Z,ue,fe=(o[0]===11?o[4].toFixed(3):o[0]===12?"Hello World".slice(0,Math.round(11*o[4])):"")+"",de,ve,z,he,je,Je,be,Xe,Ie,Ze,$e,Pe,Ke,De,Se,xe,Ee,Re,et,Ue,tt,Oe,He,nt,Ve,Be,Te,st,F,_e,qe,ct,at,Me=o[8],ye=[];for(let X=0;X<Me.length;X+=1)ye[X]=zt(Nt(o,Me,X));return{c(){e=v("div"),n=v("div"),s=v("select");for(let X=0;X<ye.length;X+=1)ye[X].c();l=V(),t=ke("svg"),a=ke("defs"),r=ke("marker"),f=ke("path"),u=ke("path"),_=ke("g"),$=ke("text"),k=m("0"),g=ke("text"),C=m("1"),H=ke("text"),D=m("eased time"),O=ke("path"),b=ke("g"),j=ke("text"),L=m("1"),N=ke("text"),W=m("0"),x=ke("text"),q=m("time"),M=ke("polyline"),A=ke("circle"),P=V(),Y=ke("svg"),U=ke("path"),I=ke("path"),J=ke("circle"),Z=V(),ue=v("div"),de=m(fe),ve=V(),z=v("div"),he=v("div"),Je=V(),be=v("br"),Xe=V(),Ie=v("div"),Ze=V(),$e=v("div"),Ke=V(),De=v("div"),xe=V(),Ee=v("div"),et=V(),Ue=v("br"),tt=V(),Oe=v("div"),nt=V(),Ve=v("div"),Be=V(),Te=v("div"),st=V(),F=v("div"),_e=V(),qe=v("div"),this.h()},l(X){e=h(X,"DIV",{class:!0});var R=d(e);n=h(R,"DIV",{class:!0});var se=d(n);s=h(se,"SELECT",{class:!0});var Ge=d(s);for(let ut=0;ut<ye.length;ut+=1)ye[ut].l(Ge);Ge.forEach(c),l=T(se),t=me(se,"svg",{width:!0,height:!0,class:!0});var Ae=d(t);a=me(Ae,"defs",{});var dt=d(a);r=me(dt,"marker",{id:!0,orient:!0,markerWidth:!0,markerHeight:!0,refX:!0,refY:!0});var vt=d(r);f=me(vt,"path",{d:!0,fill:!0}),d(f).forEach(c),vt.forEach(c),dt.forEach(c),u=me(Ae,"path",{d:!0,"marker-end":!0,stroke:!0}),d(u).forEach(c),_=me(Ae,"g",{class:!0,transform:!0});var lt=d(_);$=me(lt,"text",{x:!0,class:!0});var Ne=d($);k=y(Ne,"0"),Ne.forEach(c),g=me(lt,"text",{x:!0,class:!0});var ht=d(g);C=y(ht,"1"),ht.forEach(c),H=me(lt,"text",{x:!0,class:!0});var _t=d(H);D=y(_t,"eased time"),_t.forEach(c),lt.forEach(c),O=me(Ae,"path",{d:!0,"marker-end":!0,stroke:!0}),d(O).forEach(c),b=me(Ae,"g",{class:!0,transform:!0});var ot=d(b);j=me(ot,"text",{y:!0,class:!0});var We=d(j);L=y(We,"1"),We.forEach(c),N=me(ot,"text",{y:!0,class:!0});var kt=d(N);W=y(kt,"0"),kt.forEach(c),x=me(ot,"text",{y:!0,class:!0});var mt=d(x);q=y(mt,"time"),mt.forEach(c),ot.forEach(c),M=me(Ae,"polyline",{points:!0,class:!0}),d(M).forEach(c),A=me(Ae,"circle",{r:!0,fill:!0,cx:!0,cy:!0}),d(A).forEach(c),Ae.forEach(c),P=T(se),Y=me(se,"svg",{height:!0,width:!0,style:!0,class:!0});var rt=d(Y);U=me(rt,"path",{d:!0,stroke:!0,"stroke-width":!0}),d(U).forEach(c),I=me(rt,"path",{d:!0,stroke:!0,"stroke-width":!0}),d(I).forEach(c),J=me(rt,"circle",{r:!0,fill:!0,cx:!0,cy:!0}),d(J).forEach(c),rt.forEach(c),Z=T(se),ue=h(se,"DIV",{class:!0,style:!0});var Ce=d(ue);de=y(Ce,fe),Ce.forEach(c),se.forEach(c),ve=T(R),z=h(R,"DIV",{class:!0});var ie=d(z);he=h(ie,"DIV",{class:!0}),d(he).forEach(c),Je=T(ie),be=h(ie,"BR",{}),Xe=T(ie),Ie=h(ie,"DIV",{class:!0}),d(Ie).forEach(c),Ze=T(ie),$e=h(ie,"DIV",{class:!0}),d($e).forEach(c),Ke=T(ie),De=h(ie,"DIV",{class:!0}),d(De).forEach(c),xe=T(ie),Ee=h(ie,"DIV",{class:!0}),d(Ee).forEach(c),et=T(ie),Ue=h(ie,"BR",{}),tt=T(ie),Oe=h(ie,"DIV",{class:!0}),d(Oe).forEach(c),nt=T(ie),Ve=h(ie,"DIV",{class:!0}),d(Ve).forEach(c),Be=T(ie),Te=h(ie,"DIV",{class:!0}),d(Te).forEach(c),st=T(ie),F=h(ie,"DIV",{class:!0}),d(F).forEach(c),_e=T(ie),qe=h(ie,"DIV",{class:!0}),d(qe).forEach(c),ie.forEach(c),R.forEach(c),this.h()},h(){p(s,"class","svelte-ea51ja"),o[1]===void 0&&it(()=>o[9].call(s)),Q(s,"hidden",o[0]<2),p(f,"d","M0,0 V12 L6,6 Z"),p(f,"fill","black"),p(r,"id","head"),p(r,"orient","auto"),p(r,"markerWidth","6"),p(r,"markerHeight","12"),p(r,"refX","0.1"),p(r,"refY","6"),p(u,"d","M0,0 200,0"),p(u,"marker-end","url(#head)"),p(u,"stroke","black"),p($,"x","0"),p($,"class","svelte-ea51ja"),p(g,"x","200"),p(g,"class","svelte-ea51ja"),p(H,"x","100"),p(H,"class","svelte-ea51ja"),p(_,"class","x svelte-ea51ja"),p(_,"transform","translate(0,-10)"),p(O,"d","M0,0 0,200"),p(O,"marker-end","url(#head)"),p(O,"stroke","black"),p(j,"y","200"),p(j,"class","svelte-ea51ja"),p(N,"y","0"),p(N,"class","svelte-ea51ja"),p(x,"y","100"),p(x,"class","svelte-ea51ja"),p(b,"class","y svelte-ea51ja"),p(b,"transform","translate(-10,0)"),p(M,"points",o[7]),p(M,"class","svelte-ea51ja"),p(A,"r","5"),p(A,"fill","red"),p(A,"cx",o[5]),p(A,"cy",o[6]),Q(A,"hidden",o[0]<1),p(t,"width","200"),p(t,"height","200"),p(t,"class","svelte-ea51ja"),p(U,"d","M-50,0 250,0"),p(U,"stroke","#ddd"),p(U,"stroke-width","2"),p(I,"d","M0,0 200,0"),p(I,"stroke","black"),p(I,"stroke-width","3"),p(J,"r","5"),p(J,"fill","black"),p(J,"cx",o[5]),p(J,"cy","0"),p(Y,"height","5"),p(Y,"width","200"),yt(Y,"margin","1em 0"),p(Y,"class","svelte-ea51ja"),Q(Y,"hidden",o[0]<1),p(ue,"class","square svelte-ea51ja"),yt(ue,"transform","translateX("+(o[0]===9||o[0]===8?o[4]:o[0]===10?1-o[4]:0)*250+"px)"),Q(ue,"hidden",o[0]<8),p(n,"class","left svelte-ea51ja"),p(he,"class","code"),p(Ie,"class","code"),Q(Ie,"hidden",o[0]<4),p($e,"class","code"),Q($e,"hidden",o[0]<5),p(De,"class","code"),Q(De,"hidden",o[0]<6),p(Ee,"class","code"),Q(Ee,"hidden",o[0]<7),p(Oe,"class","code svelte-ea51ja"),Q(Oe,"none",o[0]!==8),p(Ve,"class","code svelte-ea51ja"),Q(Ve,"none",o[0]!==9),p(Te,"class","code svelte-ea51ja"),Q(Te,"none",o[0]!==10),p(F,"class","code svelte-ea51ja"),Q(F,"none",o[0]!==11),p(qe,"class","code svelte-ea51ja"),Q(qe,"none",o[0]!==12),p(z,"class","right svelte-ea51ja"),Q(z,"hidden",o[0]<3),p(e,"class","container svelte-ea51ja")},m(X,R){E(X,e,R),i(e,n),i(n,s);for(let se=0;se<ye.length;se+=1)ye[se].m(s,null);Xt(s,o[1]),i(n,l),i(n,t),i(t,a),i(a,r),i(r,f),i(t,u),i(t,_),i(_,$),i($,k),i(_,g),i(g,C),i(_,H),i(H,D),i(t,O),i(t,b),i(b,j),i(j,L),i(b,N),i(N,W),i(b,x),i(x,q),i(t,M),i(t,A),i(n,P),i(n,Y),i(Y,U),i(Y,I),i(Y,J),i(n,Z),i(n,ue),i(ue,de),i(e,ve),i(e,z),i(z,he),i(z,Je),i(z,be),i(z,Xe),i(z,Ie),i(z,Ze),i(z,$e),i(z,Ke),i(z,De),i(z,xe),i(z,Ee),i(z,et),i(z,Ue),i(z,tt),i(z,Oe),i(z,nt),i(z,Ve),i(z,Be),i(z,Te),i(z,st),i(z,F),i(z,_e),i(z,qe),ct||(at=[Le(s,"change",o[9]),ge(je=we.call(null,he,o[1].fn.toString())),ge(we.call(null,Ie,"let start = Date.now();")),ge(Pe=we.call(null,$e,`let t = Date.now() - start; // ${Jt(o[2])}`)),ge(Se=we.call(null,De,`t = t / duration; // ${o[3].toFixed(3)}`)),ge(Re=we.call(null,Ee,`t = ${o[1].fn.name}(t); // ${o[4].toFixed(3)}`)),ge(He=we.call(null,Oe,`node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(o[4]*250).toFixed(1)}px)`)),ge(we.call(null,Ve,"css: (t, u) => `translateX(${t * 250}px)`")),ge(we.call(null,Te,"css: (t, u) => `translateX(${u * 250}px)`")),ge(we.call(null,F,"tick: (t, u) => node.textContent = t")),ge(we.call(null,qe,`const string = 'Hello World';
tick: (t, u) => {
  node.textContent = string.slice(0, Math.round(string.length * t));
}`))],ct=!0)},p(X,[R]){if(R&256){Me=X[8];let se;for(se=0;se<Me.length;se+=1){const Ge=Nt(X,Me,se);ye[se]?ye[se].p(Ge,R):(ye[se]=zt(Ge),ye[se].c(),ye[se].m(s,null))}for(;se<ye.length;se+=1)ye[se].d(1);ye.length=Me.length}R&258&&Xt(s,X[1]),R&1&&Q(s,"hidden",X[0]<2),R&128&&p(M,"points",X[7]),R&32&&p(A,"cx",X[5]),R&64&&p(A,"cy",X[6]),R&1&&Q(A,"hidden",X[0]<1),R&32&&p(J,"cx",X[5]),R&1&&Q(Y,"hidden",X[0]<1),R&17&&fe!==(fe=(X[0]===11?X[4].toFixed(3):X[0]===12?"Hello World".slice(0,Math.round(11*X[4])):"")+"")&&Ot(de,fe),R&17&&yt(ue,"transform","translateX("+(X[0]===9||X[0]===8?X[4]:X[0]===10?1-X[4]:0)*250+"px)"),R&1&&Q(ue,"hidden",X[0]<8),je&&Fe(je.update)&&R&2&&je.update.call(null,X[1].fn.toString()),R&1&&Q(Ie,"hidden",X[0]<4),Pe&&Fe(Pe.update)&&R&4&&Pe.update.call(null,`let t = Date.now() - start; // ${Jt(X[2])}`),R&1&&Q($e,"hidden",X[0]<5),Se&&Fe(Se.update)&&R&8&&Se.update.call(null,`t = t / duration; // ${X[3].toFixed(3)}`),R&1&&Q(De,"hidden",X[0]<6),Re&&Fe(Re.update)&&R&18&&Re.update.call(null,`t = ${X[1].fn.name}(t); // ${X[4].toFixed(3)}`),R&1&&Q(Ee,"hidden",X[0]<7),He&&Fe(He.update)&&R&16&&He.update.call(null,`node.style.transform = \`translateX(\${t * 250}px)\`; // transformX(${(X[4]*250).toFixed(1)}px)`),R&1&&Q(Oe,"none",X[0]!==8),R&1&&Q(Ve,"none",X[0]!==9),R&1&&Q(Te,"none",X[0]!==10),R&1&&Q(F,"none",X[0]!==11),R&1&&Q(qe,"none",X[0]!==12),R&1&&Q(z,"hidden",X[0]<3)},i:ze,o:ze,d(X){X&&c(e),Qt(ye,X),ct=!1,gt(at)}}}function ys(o){return o}function gs(o){let e="";for(let n=0;n<1;n+=.005)e+=`${o(n)*200},${n*200} `;return e}function Jt(o){return o-o%5}function xs(o,e,n){let s,l,t=[{name:"linear",fn:ys},{name:"bounceInOut",fn:nn},{name:"bounceIn",fn:sn},{name:"bounceOut",fn:bt},{name:"cubicInOut",fn:an},{name:"cubicIn",fn:ln},{name:"cubicOut",fn:on},{name:"quadInOut",fn:Yt},{name:"quadIn",fn:rn},{name:"quadOut",fn:cn},{name:"quartInOut",fn:un},{name:"quartIn",fn:pn},{name:"quartOut",fn}],a=t[0],r=Date.now(),f,u=0,_=0,{i:$=3}=e,k=0,g=0,C;function H(){const O=Date.now();n(2,f=(O-r)%s),n(3,u=f/s),n(4,_=a.fn(u)),n(6,g=u*200),n(5,k=a.fn(u)*200),C=requestAnimationFrame(H)}C=requestAnimationFrame(H),tn(()=>{cancelAnimationFrame(C)});function D(){a=dn(this),n(1,a),n(8,t)}return o.$$set=O=>{"i"in O&&n(0,$=O.i)},o.$$.update=()=>{o.$$.dirty&1&&(s=$<5?2e3:8e3),o.$$.dirty&2&&n(7,l=gs(a.fn))},[$,a,f,u,_,k,g,l,t,D]}class $s extends le{constructor(e){super();oe(this,e,xs,ms,re,{i:0})}}function Es(o){let e,n;return e=new $s({props:{i:o[0]}}),{c(){K(e.$$.fragment)},l(s){ee(e.$$.fragment,s)},m(s,l){te(e,s,l),n=!0},p(s,l){const t={};l&1&&(t.i=s[0]),e.$set(t)},i(s){n||(B(e.$$.fragment,s),n=!0)},o(s){G(e.$$.fragment,s),n=!1},d(s){ne(e,s)}}}function bs(o){let e,n;const s=[o[1]];let l={$$slots:{default:[Es]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&2?ce(s,[ae(t[1])]):{};a&17&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}const Pt=12;function ws(o,e,n){let s=0;function l(){return s<Pt&&n(0,s++,s)<Pt}function t(){return s>0&&n(0,s--,s)>0}return o.$$set=a=>{n(1,e=w(w({},e),S(a)))},e=S(e),[s,e,l,t]}class Ds extends le{constructor(e){super();oe(this,e,ws,bs,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}function Is(o){let e,n,s,l,t,a,r,f=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">function</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">transition</span><span style="color: var(--shiki-color-text)">(node</span><span style="color: var(--shiki-token-punctuation)">,</span><span style="color: var(--shiki-color-text)"> params) &#123;</span></span>
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
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`;return{c(){e=v("h2"),n=m("The "),s=v("code"),l=m("transition:"),t=m(" contract"),a=V(),r=v("div"),this.h()},l(u){e=h(u,"H2",{});var _=d(e);n=y(_,"The "),s=h(_,"CODE",{class:!0});var $=d(s);l=y($,"transition:"),$.forEach(c),t=y(_," contract"),_.forEach(c),a=T(u),r=h(u,"DIV",{class:!0});var k=d(r);k.forEach(c),this.h()},h(){p(s,"class","inline"),p(r,"class","code-section")},m(u,_){E(u,e,_),i(e,n),i(e,s),i(s,l),i(e,t),E(u,a,_),E(u,r,_),r.innerHTML=f},p:ze,d(u){u&&c(e),u&&c(a),u&&c(r)}}}function Os(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Is]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Vs(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class Ts extends le{constructor(e){super();oe(this,e,Vs,Os,re,{})}}function Cs(o){let e,n;return{c(){e=v("iframe"),this.h()},l(s){e=h(s,"IFRAME",{title:!0,src:!0,class:!0}),d(e).forEach(c),this.h()},h(){p(e,"title","Svelte REPL"),$t(e.src,n="https://svelte.dev/repl/c88da2fde68a415cbd43aa738bfcefab?version=3.29.0")||p(e,"src",n),p(e,"class","svelte-cxmxle")},m(s,l){E(s,e,l)},d(s){s&&c(e)}}}function Ls(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Cs]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function js(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class Xs extends le{constructor(e){super();oe(this,e,js,Ls,re,{})}}function Ss(o){let e,n,s,l,t,a,r,f,u,_,$,k,g,C;return{c(){e=v("div"),n=v("h1"),s=m("\u{1F680} 3\uFE0F\u20E3  Compile "),l=v("code"),t=m("transition:"),a=m(" in your Head"),r=V(),f=v("div"),u=v("div"),_=m("\u{1F4DA} Compile Svelte in your head"),$=V(),k=v("div"),g=v("a"),C=m("https://lihautan.com/compile-svelte-in-your-head"),this.h()},l(H){e=h(H,"DIV",{class:!0});var D=d(e);n=h(D,"H1",{class:!0});var O=d(n);s=y(O,"\u{1F680} 3\uFE0F\u20E3  Compile "),l=h(O,"CODE",{class:!0});var b=d(l);t=y(b,"transition:"),b.forEach(c),a=y(O," in your Head"),O.forEach(c),r=T(D),f=h(D,"DIV",{});var j=d(f);u=h(j,"DIV",{});var L=d(u);_=y(L,"\u{1F4DA} Compile Svelte in your head"),L.forEach(c),$=T(j),k=h(j,"DIV",{});var N=d(k);g=h(N,"A",{href:!0});var W=d(g);C=y(W,"https://lihautan.com/compile-svelte-in-your-head"),W.forEach(c),N.forEach(c),j.forEach(c),D.forEach(c),this.h()},h(){p(l,"class","inline"),p(n,"class","svelte-1q4kbmd"),p(g,"href","https://lihautan.com/compile-svelte-in-your-head"),p(e,"class","container svelte-1q4kbmd")},m(H,D){E(H,e,D),i(e,n),i(n,s),i(n,l),i(l,t),i(n,a),i(e,r),i(e,f),i(f,u),i(u,_),i(f,$),i(f,k),i(k,g),i(g,C)},d(H){H&&c(e)}}}function Hs(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Ss]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function qs(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class Ms extends le{constructor(e){super();oe(this,e,qs,Hs,re,{})}}function As(o){let e,n='<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">&lt;</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;TEST&lt;/</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;</span></span></code></pre>';return{c(){e=v("div"),this.h()},l(s){e=h(s,"DIV",{class:!0});var l=d(e);l.forEach(c),this.h()},h(){p(e,"class","code-section")},m(s,l){E(s,e,l),e.innerHTML=n},d(s){s&&c(e)}}}function Fs(o){let e,n='<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-color-text)">&lt;</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-function)">class</span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-token-string-expression)">&quot;transparent&quot;</span><span style="color: var(--shiki-color-text)">&gt;TEST&lt;/</span><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)">&gt;</span></span></code></pre>';return{c(){e=v("div"),this.h()},l(s){e=h(s,"DIV",{class:!0});var l=d(e);l.forEach(c),this.h()},h(){p(e,"class","code-section")},m(s,l){E(s,e,l),e.innerHTML=n},d(s){s&&c(e)}}}function Us(o){let e,n,s,l,t=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">opacity</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">1</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">transition</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">opacity 1</span><span style="color: var(--shiki-token-keyword)">s</span><span style="color: var(--shiki-token-constant)"> ease 0.5</span><span style="color: var(--shiki-token-keyword)">s</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span>
<span class="line"><span style="color: var(--shiki-token-string-expression)">div</span><span style="color: var(--shiki-token-function)">.transparent</span><span style="color: var(--shiki-color-text)"> &#123;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">  </span><span style="color: var(--shiki-token-constant)">opacity</span><span style="color: var(--shiki-token-keyword)">:</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">0</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"><span style="color: var(--shiki-color-text)">&#125;</span></span></code></pre>`,a,r,f,u,_,$,k,g=o[0]?"Remove":"Add",C,H,D,O,b,j;function L(x,q){return x[0]?Fs:As}let N=L(o),W=N(o);return{c(){e=v("h1"),n=m("CSS Transition"),s=V(),l=v("div"),a=V(),r=v("hr"),f=V(),u=v("div"),_=m("TEST"),$=V(),k=v("button"),C=m(g),H=m(" class"),D=V(),W.c(),O=Et(),this.h()},l(x){e=h(x,"H1",{class:!0});var q=d(e);n=y(q,"CSS Transition"),q.forEach(c),s=T(x),l=h(x,"DIV",{class:!0});var M=d(l);M.forEach(c),a=T(x),r=h(x,"HR",{}),f=T(x),u=h(x,"DIV",{id:!0,class:!0});var A=d(u);_=y(A,"TEST"),A.forEach(c),$=T(x),k=h(x,"BUTTON",{});var P=d(k);C=y(P,g),H=y(P," class"),P.forEach(c),D=T(x),W.l(x),O=Et(),this.h()},h(){p(e,"class","svelte-1nbgh8f"),p(l,"class","code-section"),p(u,"id","demo"),p(u,"class","svelte-1nbgh8f"),Q(u,"transparent",o[0])},m(x,q){E(x,e,q),i(e,n),E(x,s,q),E(x,l,q),l.innerHTML=t,E(x,a,q),E(x,r,q),E(x,f,q),E(x,u,q),i(u,_),E(x,$,q),E(x,k,q),i(k,C),i(k,H),E(x,D,q),W.m(x,q),E(x,O,q),b||(j=Le(k,"click",o[1]),b=!0)},p(x,q){q&1&&Q(u,"transparent",x[0]),q&1&&g!==(g=x[0]?"Remove":"Add")&&Ot(C,g),N!==(N=L(x))&&(W.d(1),W=N(x),W&&(W.c(),W.m(O.parentNode,O)))},d(x){x&&c(e),x&&c(s),x&&c(l),x&&c(a),x&&c(r),x&&c(f),x&&c(u),x&&c($),x&&c(k),x&&c(D),W.d(x),x&&c(O),b=!1,j()}}}function Bs(o){let e,n;const s=[o[2]];let l={$$slots:{default:[Us]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&4?ce(s,[ae(t[2])]):{};a&9&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Ns(o,e,n){let s=!1;function l(){n(0,s=!s)}return o.$$set=t=>{n(2,e=w(w({},e),S(t)))},e=S(e),[s,l,e]}class zs extends le{constructor(e){super();oe(this,e,Ns,Bs,re,{})}}var Js=`<style>
{{rule}}
  div {
    animation: slide {{duration}}s linear;
  }
</style>
<div>TEXT</div>`,Ps=`  @keyframes slide {
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
  }`,Rs=`  @keyframes slide {
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
  }`,Gs=`  @keyframes slide {
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
  }`;function Ws(o){let e,n,s,l,t,a,r,f,u,_,$,k,g,C,H,D,O,b,j,L,N,W,x,q,M,A,P,Y;return{c(){e=v("h1"),n=m("CSS Animations"),s=V(),l=v("div"),t=v("div"),r=V(),f=v("div"),u=v("label"),_=v("input"),$=m("Linear"),k=V(),g=v("label"),C=v("input"),H=m("2 Animations"),D=V(),O=v("label"),b=v("input"),j=m("Cubic Easing"),L=V(),N=v("label"),W=m("Duration: "),x=v("input"),q=V(),M=v("div"),A=m("TEXT"),this.h()},l(U){e=h(U,"H1",{class:!0});var I=d(e);n=y(I,"CSS Animations"),I.forEach(c),s=T(U),l=h(U,"DIV",{class:!0});var J=d(l);t=h(J,"DIV",{class:!0}),d(t).forEach(c),r=T(J),f=h(J,"DIV",{class:!0});var Z=d(f);u=h(Z,"LABEL",{});var ue=d(u);_=h(ue,"INPUT",{type:!0}),$=y(ue,"Linear"),ue.forEach(c),k=T(Z),g=h(Z,"LABEL",{});var fe=d(g);C=h(fe,"INPUT",{type:!0}),H=y(fe,"2 Animations"),fe.forEach(c),D=T(Z),O=h(Z,"LABEL",{});var de=d(O);b=h(de,"INPUT",{type:!0}),j=y(de,"Cubic Easing"),de.forEach(c),L=T(Z),N=h(Z,"LABEL",{});var ve=d(N);W=y(ve,"Duration: "),x=h(ve,"INPUT",{type:!0,min:!0,max:!0,step:!0}),ve.forEach(c),q=T(Z),M=h(Z,"DIV",{style:!0});var z=d(M);A=y(z,"TEXT"),z.forEach(c),Z.forEach(c),J.forEach(c),this.h()},h(){p(e,"class","svelte-3ssdsl"),p(t,"class","code"),p(_,"type","radio"),_.__value="anim1",_.value=_.__value,o[5][0].push(_),p(C,"type","radio"),C.__value="anim2",C.value=C.__value,o[5][0].push(C),p(b,"type","radio"),b.__value="anim3",b.value=b.__value,o[5][0].push(b),p(x,"type","range"),p(x,"min","100"),p(x,"max","5000"),p(x,"step","50"),yt(M,"animation",o[0]+" "+o[1]+"ms linear infinite both"),p(f,"class","demo svelte-3ssdsl"),p(l,"class","container svelte-3ssdsl")},m(U,I){E(U,e,I),i(e,n),E(U,s,I),E(U,l,I),i(l,t),i(l,r),i(l,f),i(f,u),i(u,_),_.checked=_.__value===o[0],i(u,$),i(f,k),i(f,g),i(g,C),C.checked=C.__value===o[0],i(g,H),i(f,D),i(f,O),i(O,b),b.checked=b.__value===o[0],i(O,j),i(f,L),i(f,N),i(N,W),i(N,x),wt(x,o[1]),i(f,q),i(f,M),i(M,A),P||(Y=[ge(a=kn.call(null,t,{code:o[2],lang:St.languages.html})),Le(_,"change",o[4]),Le(C,"change",o[6]),Le(b,"change",o[7]),Le(x,"change",o[8]),Le(x,"input",o[8])],P=!0)},p(U,I){a&&Fe(a.update)&&I&4&&a.update.call(null,{code:U[2],lang:St.languages.html}),I&1&&(_.checked=_.__value===U[0]),I&1&&(C.checked=C.__value===U[0]),I&1&&(b.checked=b.__value===U[0]),I&2&&wt(x,U[1]),I&3&&yt(M,"animation",U[0]+" "+U[1]+"ms linear infinite both")},d(U){U&&c(e),U&&c(s),U&&c(l),o[5][0].splice(o[5][0].indexOf(_),1),o[5][0].splice(o[5][0].indexOf(C),1),o[5][0].splice(o[5][0].indexOf(b),1),P=!1,gt(Y)}}}function Ys(o){let e,n;const s=[o[3]];let l={$$slots:{default:[Ws]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&8?ce(s,[ae(t[3])]):{};a&1031&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Qs(o,e,n){let s;const l={anim1:Ps,anim2:Rs,anim3:Gs};let t="anim1",a=3e3;const r=[[]];function f(){t=this.__value,n(0,t)}function u(){t=this.__value,n(0,t)}function _(){t=this.__value,n(0,t)}function $(){a=Zt(this.value),n(1,a)}return o.$$set=k=>{n(3,e=w(w({},e),S(k)))},o.$$.update=()=>{o.$$.dirty&3&&n(2,s=Js.replace("{{rule}}",l[t]).replace("{{duration}}",(a/1e3).toFixed(2)))},e=S(e),[t,a,s,e,f,r,u,_,$]}class Zs extends le{constructor(e){super();oe(this,e,Qs,Ys,re,{})}}var Ks=`const string = 'Hello World';
const duration = {{duration}}

let start = Date.now();

function loop() {
  const now = Date.now();
  // time ranges from [0, 1]
  const time = (now - start) / duration;

  div.textContent = string.slice(0, Math.round(time * string.length));

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);`;function ea(o){let e,n,s,l,t,a,r,f,u,_,$;return{c(){e=v("h1"),n=m("JS Animations"),s=V(),l=v("div"),a=V(),r=v("input"),f=V(),u=v("div"),this.h()},l(k){e=h(k,"H1",{class:!0});var g=d(e);n=y(g,"JS Animations"),g.forEach(c),s=T(k),l=h(k,"DIV",{class:!0}),d(l).forEach(c),a=T(k),r=h(k,"INPUT",{type:!0,min:!0,max:!0,step:!0}),f=T(k),u=h(k,"DIV",{}),d(u).forEach(c),this.h()},h(){p(e,"class","svelte-9k5trb"),p(l,"class","code"),p(r,"type","range"),p(r,"min","100"),p(r,"max","10000"),p(r,"step","50")},m(k,g){E(k,e,g),i(e,n),E(k,s,g),E(k,l,g),E(k,a,g),E(k,r,g),wt(r,o[0]),E(k,f,g),E(k,u,g),o[5](u),_||($=[ge(t=we.call(null,l,o[2])),Le(r,"change",o[4]),Le(r,"input",o[4])],_=!0)},p(k,g){t&&Fe(t.update)&&g&4&&t.update.call(null,k[2]),g&1&&wt(r,k[0])},d(k){k&&c(e),k&&c(s),k&&c(l),k&&c(a),k&&c(r),k&&c(f),k&&c(u),o[5](null),_=!1,gt($)}}}function ta(o){let e,n;const s=[o[3]];let l={$$slots:{default:[ea]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&8?ce(s,[ae(t[3])]):{};a&135&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}const xt="Hello World";function na(o,e,n){let s,l=3e3,t,a=Date.now();vn(()=>{let u;function _(){const k=(Date.now()-a)/l,g=Math.round(k*xt.length)%xt.length;n(1,t.textContent=xt.slice(0,g===0?xt.length:g),t),u=requestAnimationFrame(_)}return u=requestAnimationFrame(_),()=>cancelAnimationFrame(u)});function r(){l=Zt(this.value),n(0,l)}function f(u){Kt[u?"unshift":"push"](()=>{t=u,n(1,t)})}return o.$$set=u=>{n(3,e=w(w({},e),S(u)))},o.$$.update=()=>{o.$$.dirty&1&&n(2,s=Ks.replace("{{duration}}",`${l}; // ${(l/1e3).toFixed(2)}s`))},e=S(e),[l,t,s,e,r,f]}class sa extends le{constructor(e){super();oe(this,e,na,ta,re,{})}}function aa(o){let e,n,s,l;return{c(){e=v("h1"),n=v("code"),s=m("transition:"),l=m(" in Vanilla JS"),this.h()},l(t){e=h(t,"H1",{});var a=d(e);n=h(a,"CODE",{class:!0});var r=d(n);s=y(r,"transition:"),r.forEach(c),l=y(a," in Vanilla JS"),a.forEach(c),this.h()},h(){p(n,"class","inline")},m(t,a){E(t,e,a),i(e,n),i(n,s),i(e,l)},d(t){t&&c(e)}}}function la(o){let e,n;const s=[o[0]];let l={$$slots:{default:[aa]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function oa(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class ra extends le{constructor(e){super();oe(this,e,oa,la,re,{})}}function ia(o){let e,n,s,l;return{c(){e=v("h1"),n=v("code"),s=m("transition:"),l=m(" in compiled JS"),this.h()},l(t){e=h(t,"H1",{});var a=d(e);n=h(a,"CODE",{class:!0});var r=d(n);s=y(r,"transition:"),r.forEach(c),l=y(a," in compiled JS"),a.forEach(c),this.h()},h(){p(n,"class","inline")},m(t,a){E(t,e,a),i(e,n),i(n,s),i(e,l)},d(t){t&&c(e)}}}function ca(o){let e,n;const s=[o[0]];let l={$$slots:{default:[ia]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function ua(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class pa extends le{constructor(e){super();oe(this,e,ua,ca,re,{})}}var fa=`function create_fragment(ctx) {
  return {
    /* create */  c() { /* ... */ },
    /* mount */   m(target, anchor) { /* ... */ },
    /* update */  p(ctx, dirty) { /* ... */ },
    /* destroy */ d(detaching) { /* ... */ }
  };
}
`,da=`function create_fragment(ctx) {
  return {
    /* create */  c() { /* ... */ },
    /* mount */   m(target, anchor) { /* ... */ },
    /* update */  p(ctx, dirty) { /* ... */ },

    /* intro */   i(local) { /* ... */ },
    /* outro */   o(local) { /* ... */ },

    /* destroy */ d(detaching) { /* ... */ }
  };
}
`;function va(o){let e,n,s,l,t;return{c(){e=v("div"),n=v("div"),this.h()},l(a){e=h(a,"DIV",{class:!0});var r=d(e);n=h(r,"DIV",{class:!0}),d(n).forEach(c),r.forEach(c),this.h()},h(){p(n,"class","code"),p(e,"class","container svelte-slvxkp")},m(a,r){E(a,e,r),i(e,n),l||(t=ge(s=we.call(null,n,o[0])),l=!0)},p(a,r){s&&Fe(s.update)&&r&1&&s.update.call(null,a[0])},d(a){a&&c(e),l=!1,t()}}}function ha(o){let e,n;const s=[o[1]];let l={$$slots:{default:[va]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&2?ce(s,[ae(t[1])]):{};a&33&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function _a(o,e,n){let s,l=0;function t(){return l<1&&n(4,l++,l)<1}function a(){return l>0&&n(4,l--,l)>0}return o.$$set=r=>{n(1,e=w(w({},e),S(r)))},o.$$.update=()=>{o.$$.dirty&16&&n(0,s=[fa,da][l])},e=S(e),[s,e,t,a,l]}class ka extends le{constructor(e){super();oe(this,e,_a,ha,re,{next:2,prev:3})}get next(){return this.$$.ctx[2]}get prev(){return this.$$.ctx[3]}}var Ye=`{#each array as item}
  <div transition:fade={{ delay: 10 }} />
{/each}`,ma=`{#each array as item}
  <div in:fade={{ delay: 10 }} />
{/each}`,ya=`{#each array as item}
  <div out:fade={{ delay: 10 }} />
{/each}`,ga=`// <div transition:fade />
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
`,xa=`// <div transition:fade />
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
`,$a=`// <div transition:fade />
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
}`,Ea=`// <div transition:fade />
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
}`,ba=`// <div transition:fade />
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
}`,wa=`// <div transition:fade />
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
`,Da=`// <div transition:fade />
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
`,Ia=`// <div transition:fade />
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
`,Oa=`// <div transition:fade />
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
`,Va=`// <div transition:fade />
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
`;function Ta(o){let e,n,s,l,t,a,r,f,u,_,$;return{c(){e=v("div"),n=v("div"),l=V(),t=v("div"),r=V(),f=v("div"),this.h()},l(k){e=h(k,"DIV",{class:!0});var g=d(e);n=h(g,"DIV",{class:!0}),d(n).forEach(c),l=T(g),t=h(g,"DIV",{class:!0}),d(t).forEach(c),g.forEach(c),r=T(k),f=h(k,"DIV",{class:!0}),d(f).forEach(c),this.h()},h(){p(n,"class","code svelte-oi1ldz"),p(t,"class","code svelte-oi1ldz"),p(e,"class","container svelte-oi1ldz"),p(f,"class",u="box box-"+o[0]+" svelte-oi1ldz"),Q(f,"hidden",o[0]<1||o[0]===2||o[0]===5)},m(k,g){E(k,e,g),i(e,n),i(e,l),i(e,t),E(k,r,g),E(k,f,g),_||($=[ge(s=en.call(null,n,o[1])),ge(a=we.call(null,t,o[2]))],_=!0)},p(k,g){s&&Fe(s.update)&&g&2&&s.update.call(null,k[1]),a&&Fe(a.update)&&g&4&&a.update.call(null,k[2]),g&1&&u!==(u="box box-"+k[0]+" svelte-oi1ldz")&&p(f,"class",u),g&1&&Q(f,"hidden",k[0]<1||k[0]===2||k[0]===5)},d(k){k&&c(e),k&&c(r),k&&c(f),_=!1,gt($)}}}function Ca(o){let e,n;const s=[o[3]];let l={$$slots:{default:[Ta]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&8?ce(s,[ae(t[3])]):{};a&519&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function La(o,e,n){let s,l,t=0;const a=[ga,xa,$a,Ea,ba,wa,Da,Ia,Oa,Va],r=[Ye,Ye,Ye,Ye,Ye,Ye,Ye,Ye,ma,ya],f=a.length-1;function u(){return t<f&&n(0,t++,t)<f}function _(){return t>0&&n(0,t--,t)>0}return o.$$set=$=>{n(3,e=w(w({},e),S($)))},o.$$.update=()=>{o.$$.dirty&1&&n(2,s=a[t]),o.$$.dirty&1&&n(1,l=r[t])},e=S(e),[t,l,s,e,u,_]}class ja extends le{constructor(e){super();oe(this,e,La,Ca,re,{next:4,prev:5})}get next(){return this.$$.ctx[4]}get prev(){return this.$$.ctx[5]}}var Xa=`export function create_in_transition(node, fn, params) {
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
}`;function Sa(o){let e,n,s,l,t,a,r;return{c(){e=v("div"),n=v("div"),s=V(),l=v("div"),this.h()},l(f){e=h(f,"DIV",{class:!0});var u=d(e);n=h(u,"DIV",{class:!0}),d(n).forEach(c),s=T(u),l=h(u,"DIV",{class:!0}),d(l).forEach(c),u.forEach(c),this.h()},h(){p(n,"class","code"),p(l,"class",t="box box-"+o[0]+" svelte-18x8sxj"),Q(l,"hidden",!1),p(e,"class","container svelte-18x8sxj")},m(f,u){E(f,e,u),i(e,n),i(e,s),i(e,l),o[6](e),a||(r=ge(we.call(null,n,o[2])),a=!0)},p(f,u){u&1&&t!==(t="box box-"+f[0]+" svelte-18x8sxj")&&p(l,"class",t),u&1&&Q(l,"hidden",!1)},d(f){f&&c(e),o[6](null),a=!1,r()}}}function Ha(o){let e,n;const s=[o[3]];let l={$$slots:{default:[Sa]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&8?ce(s,[ae(t[3])]):{};a&515&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function qa(o,e,n){let s=0,l;const t=Xa,a=[0,0,1920,1920,2064,2064,544,326,208,720,444,444,444],r=a.length-1;function f(){return s<r&&n(0,s++,s)<r}function u(){return s>0&&n(0,s--,s)>0}function _($){Kt[$?"unshift":"push"](()=>{l=$,n(1,l)})}return o.$$set=$=>{n(3,e=w(w({},e),S($)))},o.$$.update=()=>{o.$$.dirty&3&&l&&a[s]!==void 0&&l.scrollTo({top:a[s],behavior:"smooth"})},e=S(e),[s,l,t,e,f,u,_]}class Ma extends le{constructor(e){super();oe(this,e,qa,Ha,re,{next:4,prev:5})}get next(){return this.$$.ctx[4]}get prev(){return this.$$.ctx[5]}}function Aa(o){let e,n,s,l,t,a,r,f,u,_,$,k,g,C,H,D,O,b,j,L,N,W,x,q,M,A,P,Y,U,I,J,Z,ue,fe,de,ve,z,he,je,Je,be,Xe,Ie,Ze,$e,Pe,Ke,De,Se,xe,Ee,Re,et,Ue,tt,Oe,He,nt,Ve,Be,Te,st;return{c(){e=v("h1"),n=m("Source code reference"),s=V(),l=v("h2"),t=v("a"),a=m("src/runtime/internal/transitions.ts"),r=V(),f=v("ul"),u=v("li"),_=v("code"),$=m("transition_in"),k=m(", "),g=v("code"),C=m("transition_out"),H=V(),D=v("li"),O=v("code"),b=m("create_in_transition"),j=m(", "),L=v("code"),N=m("create_out_transition"),W=m(", "),x=v("code"),q=m("create_bidirectional_transition"),M=V(),A=v("h2"),P=v("a"),Y=m("src/runtime/internal/style_manager.ts"),U=V(),I=v("ul"),J=v("li"),Z=v("code"),ue=m("create_rule"),fe=m(", "),de=v("code"),ve=m("delete_rule"),z=m(", "),he=v("code"),je=m("clear_rules"),Je=V(),be=v("h2"),Xe=v("a"),Ie=m("src/runtime/transition/index.ts"),Ze=m(" ("),$e=v("code"),Pe=m("svelte/transition"),Ke=m(")"),De=V(),Se=v("ul"),xe=v("li"),Ee=v("code"),Re=m("fade"),et=m(", "),Ue=v("code"),tt=m("fly"),Oe=m(", "),He=v("code"),nt=m("slide"),Ve=m(", "),Be=v("code"),Te=m("crossfade"),st=m(", ..."),this.h()},l(F){e=h(F,"H1",{class:!0});var _e=d(e);n=y(_e,"Source code reference"),_e.forEach(c),s=T(F),l=h(F,"H2",{class:!0});var qe=d(l);t=h(qe,"A",{href:!0,rel:!0});var ct=d(t);a=y(ct,"src/runtime/internal/transitions.ts"),ct.forEach(c),qe.forEach(c),r=T(F),f=h(F,"UL",{});var at=d(f);u=h(at,"LI",{});var Me=d(u);_=h(Me,"CODE",{class:!0});var ye=d(_);$=y(ye,"transition_in"),ye.forEach(c),k=y(Me,", "),g=h(Me,"CODE",{class:!0});var X=d(g);C=y(X,"transition_out"),X.forEach(c),Me.forEach(c),H=T(at),D=h(at,"LI",{});var R=d(D);O=h(R,"CODE",{class:!0});var se=d(O);b=y(se,"create_in_transition"),se.forEach(c),j=y(R,", "),L=h(R,"CODE",{class:!0});var Ge=d(L);N=y(Ge,"create_out_transition"),Ge.forEach(c),W=y(R,", "),x=h(R,"CODE",{class:!0});var Ae=d(x);q=y(Ae,"create_bidirectional_transition"),Ae.forEach(c),R.forEach(c),at.forEach(c),M=T(F),A=h(F,"H2",{class:!0});var dt=d(A);P=h(dt,"A",{href:!0,rel:!0});var vt=d(P);Y=y(vt,"src/runtime/internal/style_manager.ts"),vt.forEach(c),dt.forEach(c),U=T(F),I=h(F,"UL",{});var lt=d(I);J=h(lt,"LI",{});var Ne=d(J);Z=h(Ne,"CODE",{class:!0});var ht=d(Z);ue=y(ht,"create_rule"),ht.forEach(c),fe=y(Ne,", "),de=h(Ne,"CODE",{class:!0});var _t=d(de);ve=y(_t,"delete_rule"),_t.forEach(c),z=y(Ne,", "),he=h(Ne,"CODE",{class:!0});var ot=d(he);je=y(ot,"clear_rules"),ot.forEach(c),Ne.forEach(c),lt.forEach(c),Je=T(F),be=h(F,"H2",{class:!0});var We=d(be);Xe=h(We,"A",{href:!0,rel:!0});var kt=d(Xe);Ie=y(kt,"src/runtime/transition/index.ts"),kt.forEach(c),Ze=y(We," ("),$e=h(We,"CODE",{class:!0});var mt=d($e);Pe=y(mt,"svelte/transition"),mt.forEach(c),Ke=y(We,")"),We.forEach(c),De=T(F),Se=h(F,"UL",{});var rt=d(Se);xe=h(rt,"LI",{});var Ce=d(xe);Ee=h(Ce,"CODE",{class:!0});var ie=d(Ee);Re=y(ie,"fade"),ie.forEach(c),et=y(Ce,", "),Ue=h(Ce,"CODE",{class:!0});var ut=d(Ue);tt=y(ut,"fly"),ut.forEach(c),Oe=y(Ce,", "),He=h(Ce,"CODE",{class:!0});var Vt=d(He);nt=y(Vt,"slide"),Vt.forEach(c),Ve=y(Ce,", "),Be=h(Ce,"CODE",{class:!0});var Tt=d(Be);Te=y(Tt,"crossfade"),Tt.forEach(c),st=y(Ce,", ..."),Ce.forEach(c),rt.forEach(c),this.h()},h(){p(e,"class","svelte-1khujlx"),p(t,"href","https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/transitions.ts"),p(t,"rel","nofollow"),p(l,"class","svelte-1khujlx"),p(_,"class","inline"),p(g,"class","inline"),p(O,"class","inline"),p(L,"class","inline"),p(x,"class","inline"),p(P,"href","https://github.com/sveltejs/svelte/blob/master/src/runtime/internal/style_manager.ts"),p(P,"rel","nofollow"),p(A,"class","svelte-1khujlx"),p(Z,"class","inline"),p(de,"class","inline"),p(he,"class","inline"),p(Xe,"href","https://github.com/sveltejs/svelte/blob/master/src/runtime/transition/index.ts"),p(Xe,"rel","nofollow"),p($e,"class","inline"),p(be,"class","svelte-1khujlx"),p(Ee,"class","inline"),p(Ue,"class","inline"),p(He,"class","inline"),p(Be,"class","inline")},m(F,_e){E(F,e,_e),i(e,n),E(F,s,_e),E(F,l,_e),i(l,t),i(t,a),E(F,r,_e),E(F,f,_e),i(f,u),i(u,_),i(_,$),i(u,k),i(u,g),i(g,C),i(f,H),i(f,D),i(D,O),i(O,b),i(D,j),i(D,L),i(L,N),i(D,W),i(D,x),i(x,q),E(F,M,_e),E(F,A,_e),i(A,P),i(P,Y),E(F,U,_e),E(F,I,_e),i(I,J),i(J,Z),i(Z,ue),i(J,fe),i(J,de),i(de,ve),i(J,z),i(J,he),i(he,je),E(F,Je,_e),E(F,be,_e),i(be,Xe),i(Xe,Ie),i(be,Ze),i(be,$e),i($e,Pe),i(be,Ke),E(F,De,_e),E(F,Se,_e),i(Se,xe),i(xe,Ee),i(Ee,Re),i(xe,et),i(xe,Ue),i(Ue,tt),i(xe,Oe),i(xe,He),i(He,nt),i(xe,Ve),i(xe,Be),i(Be,Te),i(xe,st)},d(F){F&&c(e),F&&c(s),F&&c(l),F&&c(r),F&&c(f),F&&c(M),F&&c(A),F&&c(U),F&&c(I),F&&c(Je),F&&c(be),F&&c(De),F&&c(Se)}}}function Fa(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Aa]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Ua(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class Ba extends le{constructor(e){super();oe(this,e,Ua,Fa,re,{})}}function Na(o){let e,n,s,l,t,a,r,f,u,_,$,k,g,C,H,D,O;return{c(){e=v("div"),n=v("div"),s=m("\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),l=v("code"),t=m("transition:"),a=V(),r=v("div"),f=m("\u{1F697}  Level 2\uFE0F\u20E3  - The "),u=v("code"),_=m("transition:"),$=m(" contract"),k=V(),g=v("div"),C=m("\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),H=v("code"),D=m("transition:"),O=m(" in your Head"),this.h()},l(b){e=h(b,"DIV",{class:!0});var j=d(e);n=h(j,"DIV",{class:!0});var L=d(n);s=y(L,"\u{1F6B4}\u200D\u2642\uFE0F  Level 1\uFE0F\u20E3  - Using "),l=h(L,"CODE",{});var N=d(l);t=y(N,"transition:"),N.forEach(c),L.forEach(c),a=T(j),r=h(j,"DIV",{class:!0});var W=d(r);f=y(W,"\u{1F697}  Level 2\uFE0F\u20E3  - The "),u=h(W,"CODE",{});var x=d(u);_=y(x,"transition:"),x.forEach(c),$=y(W," contract"),W.forEach(c),k=T(j),g=h(j,"DIV",{class:!0});var q=d(g);C=y(q,"\u{1F680}  Level 3\uFE0F\u20E3  - Compile "),H=h(q,"CODE",{});var M=d(H);D=y(M,"transition:"),M.forEach(c),O=y(q," in your Head"),q.forEach(c),j.forEach(c),this.h()},h(){p(n,"class","svelte-rvhzm1"),p(r,"class","svelte-rvhzm1"),p(g,"class","svelte-rvhzm1"),p(e,"class","container svelte-rvhzm1")},m(b,j){E(b,e,j),i(e,n),i(n,s),i(n,l),i(l,t),i(e,a),i(e,r),i(r,f),i(r,u),i(u,_),i(r,$),i(e,k),i(e,g),i(g,C),i(g,H),i(H,D),i(g,O)},d(b){b&&c(e)}}}function za(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Na]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Ja(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class Pa extends le{constructor(e){super();oe(this,e,Ja,za,re,{})}}function Ra(o){let e,n,s,l,t,a,r;return{c(){e=v("div"),n=v("div"),s=v("h1"),l=m("Thank you"),t=V(),a=v("p"),r=m("@lihautan"),this.h()},l(f){e=h(f,"DIV",{class:!0});var u=d(e);n=h(u,"DIV",{});var _=d(n);s=h(_,"H1",{});var $=d(s);l=y($,"Thank you"),$.forEach(c),t=T(_),a=h(_,"P",{});var k=d(a);r=y(k,"@lihautan"),k.forEach(c),_.forEach(c),u.forEach(c),this.h()},h(){p(e,"class","container svelte-1296l67")},m(f,u){E(f,e,u),i(e,n),i(n,s),i(s,l),i(n,t),i(n,a),i(a,r)},d(f){f&&c(e)}}}function Ga(o){let e,n;const s=[o[0]];let l={$$slots:{default:[Ra]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new pe({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&1?ce(s,[ae(t[0])]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}function Wa(o,e,n){return o.$$set=s=>{n(0,e=w(w({},e),S(s)))},e=S(e),[e]}class Ya extends le{constructor(e){super();oe(this,e,Wa,Ga,re,{})}}function Qa(o){let e,n;return e=new _n({props:{slides:o[0]}}),{c(){K(e.$$.fragment)},l(s){ee(e.$$.fragment,s)},m(s,l){te(e,s,l),n=!0},p:ze,i(s){n||(B(e.$$.fragment,s),n=!0)},o(s){G(e.$$.fragment,s),n=!1},d(s){ne(e,s)}}}function Za(o){let e,n;const s=[o[1],Rt];let l={$$slots:{default:[Qa]},$$scope:{ctx:o}};for(let t=0;t<s.length;t+=1)l=w(l,s[t]);return e=new hn({props:l}),{c(){K(e.$$.fragment)},l(t){ee(e.$$.fragment,t)},m(t,a){te(e,t,a),n=!0},p(t,[a]){const r=a&2?ce(s,[a&2&&ae(t[1]),a&0&&ae(Rt)]):{};a&4&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){n||(B(e.$$.fragment,t),n=!0)},o(t){G(e.$$.fragment,t),n=!1},d(t){ne(e,t)}}}const Rt={layout:"slide"};function Ka(o,e,n){const s=[$n,Dn,jn,qn,Rn,Qn,ts,ls,cs,ds,ks,Ds,Ts,Xs,Ms,zs,Zs,sa,ra,pa,ka,ja,Ma,Ba,Pa,Ya];return o.$$set=l=>{n(1,e=w(w({},e),S(l)))},e=S(e),[s,e]}class rl extends le{constructor(e){super();oe(this,e,Ka,Za,re,{})}}export{rl as default,Rt as metadata};
