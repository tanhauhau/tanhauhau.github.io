import{S as ae,i as oe,s as ne,C as U,w as re,x as le,y as ie,z as ce,A as Y,q as pe,o as he,B as ue,r as de,R as Z,e as l,t as h,k as D,c as i,a as c,h as u,d as n,m as O,b as f,g,F as o,O as fe}from"../../chunks/vendor-569a3c5c.js";import{B as me}from"../../chunks/BlogLayout-17b76cb2.js";import{_ as ke}from"../../chunks/twitter-card-image-a57df29d.js";import"../../chunks/stores-ee936cd4.js";import"../../chunks/WebMentions-968cc380.js";/* empty css                                */function _e(q){let e,d,r,_,s,a,w,E,B,I,z,P,R,b,S,F,C,v,te=`<pre class="shiki" style="background-color: var(--shiki-color-background)"><code><span class="line"><span style="color: var(--shiki-token-keyword)">const</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-constant)">sentence</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-keyword)">=</span><span style="color: var(--shiki-color-text)"> </span><span style="color: var(--shiki-token-string-expression)">&#96;a &quot;witch&quot; and her &quot;broom&quot; is one&#96;</span><span style="color: var(--shiki-color-text)">;</span></span>
<span class="line"></span>
<span class="line"><span style="color: var(--shiki-token-constant)">sentence</span><span style="color: var(--shiki-token-function)">.match</span><span style="color: var(--shiki-color-text)">(</span><span style="color: var(--shiki-token-string-expression)">/&quot;.</span><span style="color: var(--shiki-token-keyword)">+</span><span style="color: var(--shiki-token-string-expression)">&quot;/</span><span style="color: var(--shiki-color-text)">); </span><span style="color: var(--shiki-token-comment)">// &#96;&quot;witch&quot; and her &quot;broom&quot;&#96;</span></span>
<span class="line"><span style="color: var(--shiki-token-comment)">// lazy</span></span>
<span class="line"><span style="color: var(--shiki-token-constant)">sentence</span><span style="color: var(--shiki-token-function)">.match</span><span style="color: var(--shiki-color-text)">(</span><span style="color: var(--shiki-token-string-expression)">/&quot;.</span><span style="color: var(--shiki-token-keyword)">+?</span><span style="color: var(--shiki-token-string-expression)">&quot;/</span><span style="color: var(--shiki-color-text)">); </span><span style="color: var(--shiki-token-comment)">// &#96;&quot;witch&quot;&#96;</span></span></code></pre>`,A,m,L,y,H,M,$,x,T;return{c(){e=l("p"),d=h("Lazy quantifier in regex "),r=l("code"),_=h("?"),s=D(),a=l("p"),w=h("Add "),E=l("code"),B=h("?"),I=h(" at the behind "),z=l("code"),P=h("*"),R=h(" or "),b=l("code"),S=h("+"),F=h(" to make them less greedy."),C=D(),v=l("div"),A=D(),m=l("ul"),L=l("li"),y=l("a"),H=h("https://twitter.com/lihautan/status/1177476277277560832"),M=D(),$=l("li"),x=l("a"),T=h("https://javascript.info/regexp-greedy-and-lazy"),this.h()},l(t){e=i(t,"P",{});var p=c(e);d=u(p,"Lazy quantifier in regex "),r=i(p,"CODE",{class:!0});var V=c(r);_=u(V,"?"),V.forEach(n),p.forEach(n),s=O(t),a=i(t,"P",{});var k=c(a);w=u(k,"Add "),E=i(k,"CODE",{class:!0});var G=c(E);B=u(G,"?"),G.forEach(n),I=u(k," at the behind "),z=i(k,"CODE",{class:!0});var J=c(z);P=u(J,"*"),J.forEach(n),R=u(k," or "),b=i(k,"CODE",{class:!0});var K=c(b);S=u(K,"+"),K.forEach(n),F=u(k," to make them less greedy."),k.forEach(n),C=O(t),v=i(t,"DIV",{class:!0});var se=c(v);se.forEach(n),A=O(t),m=i(t,"UL",{});var j=c(m);L=i(j,"LI",{});var N=c(L);y=i(N,"A",{href:!0,rel:!0});var Q=c(y);H=u(Q,"https://twitter.com/lihautan/status/1177476277277560832"),Q.forEach(n),N.forEach(n),M=O(j),$=i(j,"LI",{});var W=c($);x=i(W,"A",{href:!0,rel:!0});var X=c(x);T=u(X,"https://javascript.info/regexp-greedy-and-lazy"),X.forEach(n),W.forEach(n),j.forEach(n),this.h()},h(){f(r,"class","inline"),f(E,"class","inline"),f(z,"class","inline"),f(b,"class","inline"),f(v,"class","code-section"),f(y,"href","https://twitter.com/lihautan/status/1177476277277560832"),f(y,"rel","nofollow"),f(x,"href","https://javascript.info/regexp-greedy-and-lazy"),f(x,"rel","nofollow")},m(t,p){g(t,e,p),o(e,d),o(e,r),o(r,_),g(t,s,p),g(t,a,p),o(a,w),o(a,E),o(E,B),o(a,I),o(a,z),o(z,P),o(a,R),o(a,b),o(b,S),o(a,F),g(t,C,p),g(t,v,p),v.innerHTML=te,g(t,A,p),g(t,m,p),o(m,L),o(L,y),o(y,H),o(m,M),o(m,$),o($,x),o(x,T)},p:fe,d(t){t&&n(e),t&&n(s),t&&n(a),t&&n(C),t&&n(v),t&&n(A),t&&n(m)}}}function ve(q){let e,d;const r=[q[0],ee];let _={$$slots:{default:[_e]},$$scope:{ctx:q}};for(let s=0;s<r.length;s+=1)_=U(_,r[s]);return e=new me({props:_}),{c(){re(e.$$.fragment)},l(s){le(e.$$.fragment,s)},m(s,a){ie(e,s,a),d=!0},p(s,[a]){const w=a&1?ce(r,[a&1&&Y(s[0]),a&0&&Y(ee)]):{};a&2&&(w.$$scope={dirty:a,ctx:s}),e.$set(w)},i(s){d||(pe(e.$$.fragment,s),d=!0)},o(s){he(e.$$.fragment,s),d=!1},d(s){ue(e,s)}}}const ee={title:"Lazy quantifier in regex",tags:["regex"],description:"Lazy quantifier in regex `?`Add `?` at the behind `*` or `+` to make them less greedy.https://twitter.com/lihautan/status/1177476277277560832https://javascript.info/regexp-greedy-and-lazy..."};function ye(q,e,d){return de("blog",{image:ke}),q.$$set=r=>{d(0,e=U(U({},e),Z(r)))},e=Z(e),[e]}class be extends ae{constructor(e){super();oe(this,e,ye,ve,ne,{})}}export{be as default,ee as metadata};
