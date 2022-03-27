import{S as ne,i as ue,s as ce,e as c,k as $,F as R,t as ee,c as f,a as n,d as r,m as b,G as S,h as te,X as K,b as e,g as O,H as t,aq as ae,$ as le,I as se,ac as re,j as fe,J as ie,N as de,ap as pe,ar as oe}from"../../../../chunks/vendor-da4388d4.js";function he(i){let s,g,u,T,G,d,h,q,_,m,j,H,v,y,Q,L,N,k,U,M,D,E,V,I,w,p,X,C,z,o,A,W;return{c(){s=c("div"),g=c("div"),u=c("img"),G=$(),d=c("div"),h=c("img"),_=$(),m=c("div"),H=$(),v=c("div"),y=c("img"),L=$(),N=c("div"),U=$(),M=R("svg"),D=R("filter"),E=R("feMorphology"),V=R("filter"),I=R("feMorphology"),w=$(),p=c("div"),X=ee("Radius: "),C=ee(i[0]),z=$(),o=c("input"),this.h()},l(l){s=f(l,"DIV",{class:!0});var a=n(s);g=f(a,"DIV",{class:!0});var Y=n(g);u=f(Y,"IMG",{src:!0,alt:!0,class:!0}),Y.forEach(r),G=b(a),d=f(a,"DIV",{class:!0});var F=n(d);h=f(F,"IMG",{class:!0,src:!0,alt:!0}),_=b(F),m=f(F,"DIV",{}),n(m).forEach(r),F.forEach(r),H=b(a),v=f(a,"DIV",{class:!0});var J=n(v);y=f(J,"IMG",{class:!0,src:!0,alt:!0}),L=b(J),N=f(J,"DIV",{}),n(N).forEach(r),J.forEach(r),U=b(a),M=S(a,"svg",{class:!0});var B=n(M);D=S(B,"filter",{id:!0});var Z=n(D);E=S(Z,"feMorphology",{radius:!0,operator:!0}),n(E).forEach(r),Z.forEach(r),V=S(B,"filter",{id:!0});var x=n(V);I=S(x,"feMorphology",{radius:!0,operator:!0}),n(I).forEach(r),x.forEach(r),B.forEach(r),a.forEach(r),w=b(l),p=f(l,"DIV",{class:!0});var P=n(p);X=te(P,"Radius: "),C=te(P,i[0]),z=b(P),o=f(P,"INPUT",{type:!0,min:!0,max:!0,step:!0,class:!0}),P.forEach(r),this.h()},h(){K(u.src,T="https://lihautan.com/03b36a9f76000493.png")||e(u,"src",T),e(u,"alt",""),e(u,"class","svelte-16gcny3"),e(g,"class","container svelte-16gcny3"),e(h,"class","dilate svelte-16gcny3"),K(h.src,q="https://lihautan.com/03b36a9f76000493.png")||e(h,"src",q),e(h,"alt",""),e(d,"class","container svelte-16gcny3"),e(y,"class","erode svelte-16gcny3"),K(y.src,Q="https://lihautan.com/03b36a9f76000493.png")||e(y,"src",Q),e(y,"alt",""),e(v,"class","container svelte-16gcny3"),e(E,"radius",i[0]),e(E,"operator","dilate"),e(D,"id","dilate"),e(I,"radius",i[0]),e(I,"operator","erode"),e(V,"id","erode"),e(M,"class","svelte-16gcny3"),e(s,"class","row svelte-16gcny3"),e(o,"type","range"),e(o,"min","0"),e(o,"max","20"),e(o,"step","1"),e(o,"class","svelte-16gcny3"),e(p,"class","input svelte-16gcny3")},m(l,a){O(l,s,a),t(s,g),t(g,u),t(s,G),t(s,d),t(d,h),t(d,_),t(d,m),t(s,H),t(s,v),t(v,y),t(v,L),t(v,N),t(s,U),t(s,M),t(M,D),t(D,E),t(M,V),t(V,I),O(l,w,a),O(l,p,a),t(p,X),t(p,C),t(p,z),t(p,o),ae(o,i[0]),A||(W=[le(j=i[1].call(null,m,`
<filter>
	<feMorphology
		operator="dilate"
		radius="${i[0]}" />
</filter>`)),le(k=i[1].call(null,N,`
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
</filter>`),a&1&&e(E,"radius",l[0]),a&1&&e(I,"radius",l[0]),a&1&&fe(C,l[0]),a&1&&ae(o,l[0])},i:ie,o:ie,d(l){l&&r(s),l&&r(w),l&&r(p),A=!1,de(W)}}}function ge(i,s,g){let u=0;function T(d,h){function q(_){d.innerHTML=oe.highlight(_.trim(),oe.languages.html).split(`
`).map(m=>m.replace(/^(\s+)/,(j,H)=>'<span class="tab"></span>'.repeat(H.length))).join("<br />")}return q(h),{update(_){q(_)}}}function G(){u=pe(this.value),g(0,u)}return[u,T,G]}class _e extends ne{constructor(s){super();ue(this,s,ge,he,ce,{})}}export{_e as default};
