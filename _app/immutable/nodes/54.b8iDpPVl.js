import{s as L,d,e as S,f as v,n as $}from"../chunks/scheduler.85ImRbsk.js";import{S as y,i as T,m as H,n as M,o as C,t as z,a as A,p as F,e as m,s as h,c as f,q as p,h as x,j as u,g as _}from"../chunks/index.JMRAb4ib.js";import{g as J,a as w}from"../chunks/code-snippet.p32Anx_S.js";import{B as P}from"../chunks/BlogLayout.TadBQAnB.js";import{t as q}from"../chunks/twitter-card-image.6izpPI6I.js";function I(l){let e,i='TIL - arrow function has no <code class="inline">arguments</code>,',s,o,t='<a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#No_binding_of_arguments" rel="nofollow">https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#No_binding_of_arguments</a>',a,r,g='You can only use <code class="inline">...args</code> spread if you want.';return{c(){e=m("p"),e.innerHTML=i,s=h(),o=m("p"),o.innerHTML=t,a=h(),r=m("p"),r.innerHTML=g},l(n){e=f(n,"P",{"data-svelte-h":!0}),p(e)!=="svelte-11rzq4x"&&(e.innerHTML=i),s=x(n),o=f(n,"P",{"data-svelte-h":!0}),p(o)!=="svelte-n840hb"&&(o.innerHTML=t),a=x(n),r=f(n,"P",{"data-svelte-h":!0}),p(r)!=="svelte-11782p1"&&(r.innerHTML=g)},m(n,c){u(n,e,c),u(n,s,c),u(n,o,c),u(n,a,c),u(n,r,c)},p:$,d(n){n&&(_(e),_(s),_(o),_(a),_(r))}}}function N(l){let e,i;const s=[l[0],b];let o={$$slots:{default:[I]},$$scope:{ctx:l}};for(let t=0;t<s.length;t+=1)o=d(o,s[t]);return e=new P({props:o}),{c(){H(e.$$.fragment)},l(t){M(e.$$.fragment,t)},m(t,a){C(e,t,a),i=!0},p(t,[a]){const r=a&1?J(s,[a&1&&w(t[0]),a&0&&w(b)]):{};a&2&&(r.$$scope={dirty:a,ctx:t}),e.$set(r)},i(t){i||(z(e.$$.fragment,t),i=!0)},o(t){A(e.$$.fragment,t),i=!1},d(t){F(e,t)}}}const b={title:"Annonymous Function has no arguments",tags:["JavaScript"],description:"TIL - arrow function has no `arguments`, https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions#No_binding_of_argumentsYou can only use `...args` spread if you want...."};function R(l,e,i){return S("blog",{image:q}),l.$$set=s=>{i(0,e=d(d({},e),v(s)))},e=v(e),[e]}class k extends y{constructor(e){super(),T(this,e,R,N,L,{})}}export{k as component};
