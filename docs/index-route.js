function t(){}function e(t){return t()}function a(){return Object.create(null)}function n(t){t.forEach(e)}function r(t){return"function"==typeof t}function s(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function c(t,e){t.appendChild(e)}function o(t,e,a){t.insertBefore(e,a||null)}function l(t){t.parentNode.removeChild(t)}function h(t){return document.createElement(t)}function i(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function f(t){return document.createTextNode(t)}function u(){return f(" ")}function p(t,e,a){null==a?t.removeAttribute(e):t.getAttribute(e)!==a&&t.setAttribute(e,a)}function g(t){return Array.from(t.childNodes)}function d(t,e,a,n){for(let n=0;n<t.length;n+=1){const r=t[n];if(r.nodeName===e){let e=0;const s=[];for(;e<r.attributes.length;){const t=r.attributes[e++];a[t.name]||s.push(t.name)}for(let t=0;t<s.length;t++)r.removeAttribute(s[t]);return t.splice(n,1)[0]}}return n?i(e):h(e)}function v(t,e){for(let a=0;a<t.length;a+=1){const n=t[a];if(3===n.nodeType)return n.data=""+e,t.splice(a,1)[0]}return f(e)}function m(t){return v(t," ")}let $;function x(t){$=t}const b=[],E=[],w=[],y=[],A=Promise.resolve();let _=!1;function L(t){w.push(t)}let I=!1;const N=new Set;function S(){if(!I){I=!0;do{for(let t=0;t<b.length;t+=1){const e=b[t];x(e),k(e.$$)}for(b.length=0;E.length;)E.pop()();for(let t=0;t<w.length;t+=1){const e=w[t];N.has(e)||(N.add(e),e())}w.length=0}while(b.length);for(;y.length;)y.pop()();_=!1,I=!1,N.clear()}}function k(t){if(null!==t.fragment){t.update(),n(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(L)}}const T=new Set;function B(t,e){t&&t.i&&(T.delete(t),t.i(e))}function H(t,a,s){const{fragment:c,on_mount:o,on_destroy:l,after_update:h}=t.$$;c&&c.m(a,s),L(()=>{const a=o.map(e).filter(r);l?l.push(...a):n(a),t.$$.on_mount=[]}),h.forEach(L)}function M(t,e){const a=t.$$;null!==a.fragment&&(n(a.on_destroy),a.fragment&&a.fragment.d(e),a.on_destroy=a.fragment=null,a.ctx=[])}function z(t,e){-1===t.$$.dirty[0]&&(b.push(t),_||(_=!0,A.then(S)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function C(e,r,s,c,o,h,i=[-1]){const f=$;x(e);const u=r.props||{},p=e.$$={fragment:null,ctx:null,props:h,update:t,not_equal:o,bound:a(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(f?f.$$.context:[]),callbacks:a(),dirty:i};let d=!1;if(p.ctx=s?s(e,u,(t,a,...n)=>{const r=n.length?n[0]:a;return p.ctx&&o(p.ctx[t],p.ctx[t]=r)&&(p.bound[t]&&p.bound[t](r),d&&z(e,t)),a}):[],p.update(),d=!0,n(p.before_update),p.fragment=!!c&&c(p.ctx),r.target){if(r.hydrate){const t=g(r.target);p.fragment&&p.fragment.l(t),t.forEach(l)}else p.fragment&&p.fragment.c();r.intro&&B(e.$$.fragment),H(e,r.target,r.anchor),S()}x(f)}class D{$destroy(){M(this,1),this.$destroy=t}$on(t,e){const a=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return a.push(e),()=>{const t=a.indexOf(e);-1!==t&&a.splice(t,1)}}$set(){}}function j(e){let a,n,r,s,$,x,b,E,w,y,A,_,L,I,N,S,k,T,B,H,M,z,C,D,j,q,F,G,O;return{c(){a=h("ul"),n=h("li"),r=h("a"),s=f("About"),$=u(),x=h("li"),b=h("a"),E=f("Writings"),w=u(),y=h("li"),A=h("a"),_=f("Talks"),L=u(),I=h("li"),N=h("a"),S=f("Notes"),k=u(),T=h("li"),B=h("a"),H=f("Newsletter"),M=u(),z=h("li"),C=h("a"),D=i("svg"),j=i("path"),q=u(),F=h("a"),G=i("svg"),O=i("path"),this.h()},l(t){a=d(t,"UL",{class:!0});var e=g(a);n=d(e,"LI",{class:!0});var c=g(n);r=d(c,"A",{href:!0,class:!0});var o=g(r);s=v(o,"About"),o.forEach(l),c.forEach(l),$=m(e),x=d(e,"LI",{class:!0});var h=g(x);b=d(h,"A",{href:!0,class:!0});var i=g(b);E=v(i,"Writings"),i.forEach(l),h.forEach(l),w=m(e),y=d(e,"LI",{class:!0});var f=g(y);A=d(f,"A",{href:!0,class:!0});var u=g(A);_=v(u,"Talks"),u.forEach(l),f.forEach(l),L=m(e),I=d(e,"LI",{class:!0});var p=g(I);N=d(p,"A",{href:!0,class:!0});var V=g(N);S=v(V,"Notes"),V.forEach(l),p.forEach(l),k=m(e),T=d(e,"LI",{class:!0});var W=g(T);B=d(W,"A",{href:!0,class:!0});var P=g(B);H=v(P,"Newsletter"),P.forEach(l),W.forEach(l),M=m(e),z=d(e,"LI",{class:!0});var U=g(z);C=d(U,"A",{"aria-label":!0,href:!0,class:!0});var J=g(C);D=d(J,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var K=g(D);j=d(K,"path",{d:!0},1),g(j).forEach(l),K.forEach(l),J.forEach(l),q=m(U),F=d(U,"A",{"aria-label":!0,href:!0,class:!0});var Q=g(F);G=d(Q,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var R=g(G);O=d(R,"path",{d:!0},1),g(O).forEach(l),R.forEach(l),Q.forEach(l),U.forEach(l),e.forEach(l),this.h()},h(){p(r,"href","/about"),p(r,"class","svelte-ch8xpg"),p(n,"class","svelte-ch8xpg"),p(b,"href","/blogs"),p(b,"class","svelte-ch8xpg"),p(x,"class","svelte-ch8xpg"),p(A,"href","/talks"),p(A,"class","svelte-ch8xpg"),p(y,"class","svelte-ch8xpg"),p(N,"href","/notes"),p(N,"class","svelte-ch8xpg"),p(I,"class","svelte-ch8xpg"),p(B,"href","/newsletter"),p(B,"class","svelte-ch8xpg"),p(T,"class","svelte-ch8xpg"),p(j,"d","M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n  10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n  4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"),p(D,"viewBox","0 0 24 24"),p(D,"width","1em"),p(D,"height","1em"),p(D,"class","svelte-ch8xpg"),p(C,"aria-label","Twitter account"),p(C,"href","https://twitter.com/lihautan"),p(C,"class","svelte-ch8xpg"),p(O,"d","M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n  0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n  5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n  5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n  3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"),p(G,"viewBox","0 0 24 24"),p(G,"width","1em"),p(G,"height","1em"),p(G,"class","svelte-ch8xpg"),p(F,"aria-label","Github account"),p(F,"href","https://github.com/tanhauhau"),p(F,"class","svelte-ch8xpg"),p(z,"class","social svelte-ch8xpg"),p(a,"class","svelte-ch8xpg")},m(t,e){o(t,a,e),c(a,n),c(n,r),c(r,s),c(a,$),c(a,x),c(x,b),c(b,E),c(a,w),c(a,y),c(y,A),c(A,_),c(a,L),c(a,I),c(I,N),c(N,S),c(a,k),c(a,T),c(T,B),c(B,H),c(a,M),c(a,z),c(z,C),c(C,D),c(D,j),c(z,q),c(z,F),c(F,G),c(G,O)},p:t,i:t,o:t,d(t){t&&l(a)}}}class q extends D{constructor(t){super(),C(this,t,null,j,s,{})}}function F(e){let a,n,r,s,i,$,x,b,E,w,y,A,_,L,I;return L=new q({}),{c(){var t;a=h("main"),n=h("div"),r=h("img"),i=u(),$=h("h1"),x=f("Tan Li Hau"),b=u(),E=h("h2"),w=f("Frontend Developer at "),y=h("a"),A=f("Shopee\n      Singapore"),_=u(),(t=L.$$.fragment)&&t.c(),this.h()},l(t){a=d(t,"MAIN",{class:!0});var e=g(a);n=d(e,"DIV",{});var s=g(n);r=d(s,"IMG",{src:!0,alt:!0,class:!0}),s.forEach(l),i=m(e),$=d(e,"H1",{});var c=g($);x=v(c,"Tan Li Hau"),c.forEach(l),b=m(e),E=d(e,"H2",{class:!0});var o=g(E);w=v(o,"Frontend Developer at "),y=d(o,"A",{href:!0,"aria-label":!0});var h,f,u=g(y);A=v(u,"Shopee\n      Singapore"),u.forEach(l),o.forEach(l),_=m(e),h=L.$$.fragment,f=e,h&&h.l(f),e.forEach(l),this.h()},h(){r.src!==(s="03b36a9f76000493.png")&&p(r,"src","03b36a9f76000493.png"),p(r,"alt","Tan Li Hau"),p(r,"class","svelte-ozpish"),p(y,"href","https://www.linkedin.com/company/shopee/"),p(y,"aria-label","Shopee LinkedIn page"),p(E,"class","svelte-ozpish"),p(a,"class","svelte-ozpish")},m(t,e){o(t,a,e),c(a,n),c(n,r),c(a,i),c(a,$),c($,x),c(a,b),c(a,E),c(E,w),c(E,y),c(y,A),c(a,_),H(L,a,null),I=!0},p:t,i(t){I||(B(L.$$.fragment,t),I=!0)},o(t){!function(t,e,a,n){if(t&&t.o){if(T.has(t))return;T.add(t),(void 0).c.push(()=>{T.delete(t),n&&(a&&t.d(1),n())}),t.o(e)}}(L.$$.fragment,t),I=!1},d(t){t&&l(a),M(L)}}}new class extends D{constructor(t){super(),C(this,t,null,F,s,{})}}({target:document.querySelector("#app"),hydrate:!0});
