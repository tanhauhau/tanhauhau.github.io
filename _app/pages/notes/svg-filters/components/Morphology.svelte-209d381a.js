import{S as ne,i as ue,s as ce,e as c,k as b,M as S,t as ee,c as f,a as n,d as r,m as V,N as T,h as te,Q as J,b as e,g as K,F as t,aq as ae,U as le,V as se,aa as re,j as fe,O as ie,ab as de,ap as pe,ar as oe}from"../../../../chunks/vendor-ea160616.js";function he(i){let s,g,u,U,q,d,h,G,_,m,j,N,v,y,W,L,P,k,O,M,$,E,D,I,w,p,Q,C,z,o,A,X;return{c(){s=c("div"),g=c("div"),u=c("img"),q=b(),d=c("div"),h=c("img"),_=b(),m=c("div"),N=b(),v=c("div"),y=c("img"),L=b(),P=c("div"),O=b(),M=S("svg"),$=S("filter"),E=S("feMorphology"),D=S("filter"),I=S("feMorphology"),w=b(),p=c("div"),Q=ee("Radius: "),C=ee(i[0]),z=b(),o=c("input"),this.h()},l(l){s=f(l,"DIV",{class:!0});var a=n(s);g=f(a,"DIV",{class:!0});var Y=n(g);u=f(Y,"IMG",{src:!0,alt:!0,class:!0}),Y.forEach(r),q=V(a),d=f(a,"DIV",{class:!0});var F=n(d);h=f(F,"IMG",{class:!0,src:!0,alt:!0}),_=V(F),m=f(F,"DIV",{}),n(m).forEach(r),F.forEach(r),N=V(a),v=f(a,"DIV",{class:!0});var H=n(v);y=f(H,"IMG",{class:!0,src:!0,alt:!0}),L=V(H),P=f(H,"DIV",{}),n(P).forEach(r),H.forEach(r),O=V(a),M=T(a,"svg",{class:!0});var B=n(M);$=T(B,"filter",{id:!0});var Z=n($);E=T(Z,"feMorphology",{radius:!0,operator:!0}),n(E).forEach(r),Z.forEach(r),D=T(B,"filter",{id:!0});var x=n(D);I=T(x,"feMorphology",{radius:!0,operator:!0}),n(I).forEach(r),x.forEach(r),B.forEach(r),a.forEach(r),w=V(l),p=f(l,"DIV",{class:!0});var R=n(p);Q=te(R,"Radius: "),C=te(R,i[0]),z=V(R),o=f(R,"INPUT",{type:!0,min:!0,max:!0,step:!0,class:!0}),R.forEach(r),this.h()},h(){J(u.src,U="https://lihautan.com/03b36a9f76000493.png")||e(u,"src",U),e(u,"alt",""),e(u,"class","svelte-16gcny3"),e(g,"class","container svelte-16gcny3"),e(h,"class","dilate svelte-16gcny3"),J(h.src,G="https://lihautan.com/03b36a9f76000493.png")||e(h,"src",G),e(h,"alt",""),e(d,"class","container svelte-16gcny3"),e(y,"class","erode svelte-16gcny3"),J(y.src,W="https://lihautan.com/03b36a9f76000493.png")||e(y,"src",W),e(y,"alt",""),e(v,"class","container svelte-16gcny3"),e(E,"radius",i[0]),e(E,"operator","dilate"),e($,"id","dilate"),e(I,"radius",i[0]),e(I,"operator","erode"),e(D,"id","erode"),e(M,"class","svelte-16gcny3"),e(s,"class","row svelte-16gcny3"),e(o,"type","range"),e(o,"min","0"),e(o,"max","20"),e(o,"step","1"),e(o,"class","svelte-16gcny3"),e(p,"class","input svelte-16gcny3")},m(l,a){K(l,s,a),t(s,g),t(g,u),t(s,q),t(s,d),t(d,h),t(d,_),t(d,m),t(s,N),t(s,v),t(v,y),t(v,L),t(v,P),t(s,O),t(s,M),t(M,$),t($,E),t(M,D),t(D,I),K(l,w,a),K(l,p,a),t(p,Q),t(p,C),t(p,z),t(p,o),ae(o,i[0]),A||(X=[le(j=i[1].call(null,m,`
<filter>
	<feMorphology
		operator="dilate"
		radius="${i[0]}" />
</filter>`)),le(k=i[1].call(null,P,`
<filter>
	<feMorphology
		operator="erode"
		radius="${i[0]}" />
</filter>`)),se(o,"change",i[2]),se(o,"input",i[2])],A=!0)},p(l,[a]){j&&re(j.update)&&a&1&&j.update.call(null,`
<filter>
	<feMorphology
		operator="dilate"
		radius="${l[0]}" />
</filter>`),k&&re(k.update)&&a&1&&k.update.call(null,`
<filter>
	<feMorphology
		operator="erode"
		radius="${l[0]}" />
</filter>`),a&1&&e(E,"radius",l[0]),a&1&&e(I,"radius",l[0]),a&1&&fe(C,l[0]),a&1&&ae(o,l[0])},i:ie,o:ie,d(l){l&&r(s),l&&r(w),l&&r(p),A=!1,de(X)}}}function ge(i,s,g){let u=0;function U(d,h){function G(_){d.innerHTML=oe.highlight(_.trim(),oe.languages.html).split(`
`).map(m=>m.replace(/^(\s+)/,(j,N)=>'<span class="tab"></span>'.repeat(N.length))).join("<br />")}return G(h),{update(_){G(_)}}}function q(){u=pe(this.value),g(0,u)}return[u,U,q]}class _e extends ne{constructor(s){super();ue(this,s,ge,he,ce,{})}}export{_e as default};
