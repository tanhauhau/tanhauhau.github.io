function e(){}function t(e,t){for(const n in t)e[n]=t[n];return e}function n(e){return e()}function a(){return Object.create(null)}function o(e){e.forEach(n)}function s(e){return"function"==typeof e}function c(e,t){return e!=e?t==t:e!==t||e&&"object"==typeof e||"function"==typeof e}function i(e,n,a,o){return e[1]&&o?t(a.ctx.slice(),e[1](o(n))):a.ctx}function r(e,t,n,a,o,s,c){const r=function(e,t,n,a){if(e[2]&&a){const o=e[2](a(n));if(void 0===t.dirty)return o;if("object"==typeof o){const e=[],n=Math.max(t.dirty.length,o.length);for(let a=0;a<n;a+=1)e[a]=t.dirty[a]|o[a];return e}return t.dirty|o}return t.dirty}(t,a,o,s);if(r){const o=i(t,n,a,c);e.p(o,r)}}function l(e,t){e.appendChild(t)}function u(e,t,n){e.insertBefore(t,n||null)}function h(e){e.parentNode.removeChild(e)}function p(e,t){for(let n=0;n<e.length;n+=1)e[n]&&e[n].d(t)}function d(e){return document.createElement(e)}function f(e){return document.createElementNS("http://www.w3.org/2000/svg",e)}function m(e){return document.createTextNode(e)}function g(){return m(" ")}function y(){return m("")}function b(e,t,n){null==n?e.removeAttribute(t):e.getAttribute(t)!==n&&e.setAttribute(t,n)}function v(e){return Array.from(e.childNodes)}function E(e,t,n,a){for(let a=0;a<e.length;a+=1){const o=e[a];if(o.nodeName===t){let t=0;const s=[];for(;t<o.attributes.length;){const e=o.attributes[t++];n[e.name]||s.push(e.name)}for(let e=0;e<s.length;e++)o.removeAttribute(s[e]);return e.splice(a,1)[0]}}return a?f(t):d(t)}function w(e,t){for(let n=0;n<e.length;n+=1){const a=e[n];if(3===a.nodeType)return a.data=""+t,e.splice(n,1)[0]}return m(t)}function k(e){return w(e," ")}function $(e,t){t=""+t,e.wholeText!==t&&(e.data=t)}function I(e,t){e.value=null==t?"":t}class A{constructor(e=null){this.a=e,this.e=this.n=null}m(e,t,n=null){this.e||(this.e=d(t.nodeName),this.t=t,this.h(e)),this.i(n)}h(e){this.e.innerHTML=e,this.n=Array.from(this.e.childNodes)}i(e){for(let t=0;t<this.n.length;t+=1)u(this.t,this.n[t],e)}p(e){this.d(),this.h(e),this.i(this.a)}d(){this.n.forEach(h)}}let T;function S(e){T=e}function x(e){(function(){if(!T)throw new Error("Function called outside component initialization");return T})().$$.on_mount.push(e)}const j=[],P=[],C=[],O=[],U=Promise.resolve();let M=!1;function L(e){C.push(e)}let _=!1;const R=new Set;function N(){if(!_){_=!0;do{for(let e=0;e<j.length;e+=1){const t=j[e];S(t),H(t.$$)}for(j.length=0;P.length;)P.pop()();for(let e=0;e<C.length;e+=1){const t=C[e];R.has(t)||(R.add(t),t())}C.length=0}while(j.length);for(;O.length;)O.pop()();M=!1,_=!1,R.clear()}}function H(e){if(null!==e.fragment){e.update(),o(e.before_update);const t=e.dirty;e.dirty=[-1],e.fragment&&e.fragment.p(e.ctx,t),e.after_update.forEach(L)}}const J=new Set;function B(e,t){e&&e.i&&(J.delete(e),e.i(t))}function G(e,t,n,a){if(e&&e.o){if(J.has(e))return;J.add(e),(void 0).c.push(()=>{J.delete(e),a&&(n&&e.d(1),a())}),e.o(t)}}function D(e){e&&e.c()}function F(e,t){e&&e.l(t)}function q(e,t,a){const{fragment:c,on_mount:i,on_destroy:r,after_update:l}=e.$$;c&&c.m(t,a),L(()=>{const t=i.map(n).filter(s);r?r.push(...t):o(t),e.$$.on_mount=[]}),l.forEach(L)}function z(e,t){const n=e.$$;null!==n.fragment&&(o(n.on_destroy),n.fragment&&n.fragment.d(t),n.on_destroy=n.fragment=null,n.ctx=[])}function W(e,t){-1===e.$$.dirty[0]&&(j.push(e),M||(M=!0,U.then(N)),e.$$.dirty.fill(0)),e.$$.dirty[t/31|0]|=1<<t%31}function V(t,n,s,c,i,r,l=[-1]){const u=T;S(t);const p=n.props||{},d=t.$$={fragment:null,ctx:null,props:r,update:e,not_equal:i,bound:a(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(u?u.$$.context:[]),callbacks:a(),dirty:l};let f=!1;if(d.ctx=s?s(t,p,(e,n,...a)=>{const o=a.length?a[0]:n;return d.ctx&&i(d.ctx[e],d.ctx[e]=o)&&(d.bound[e]&&d.bound[e](o),f&&W(t,e)),n}):[],d.update(),f=!0,o(d.before_update),d.fragment=!!c&&c(d.ctx),n.target){if(n.hydrate){const e=v(n.target);d.fragment&&d.fragment.l(e),e.forEach(h)}else d.fragment&&d.fragment.c();n.intro&&B(t.$$.fragment),q(t,n.target,n.anchor),N()}S(u)}class Y{$destroy(){z(this,1),this.$destroy=e}$on(e,t){const n=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return n.push(t),()=>{const e=n.indexOf(t);-1!==e&&n.splice(e,1)}}$set(){}}function K(t){let n,a,o,s,c,i,r,p,y,$,I,A,T,S,x,j,P,C,O,U,M,L,_,R,N,H,J,B,G,D,F,q,z,W,V;return{c(){n=d("header"),a=d("nav"),o=d("ul"),s=d("li"),c=d("a"),i=m("Tan Li Hau"),r=g(),p=d("li"),y=d("a"),$=m("About"),I=g(),A=d("li"),T=d("a"),S=m("Writings"),x=g(),j=d("li"),P=d("a"),C=m("Talks"),O=g(),U=d("li"),M=d("a"),L=m("Notes"),_=g(),R=d("li"),N=d("a"),H=m("Newsletter"),J=g(),B=d("li"),G=d("a"),D=f("svg"),F=f("path"),q=g(),z=d("a"),W=f("svg"),V=f("path"),this.h()},l(e){n=E(e,"HEADER",{class:!0});var t=v(n);a=E(t,"NAV",{});var l=v(a);o=E(l,"UL",{class:!0});var u=v(o);s=E(u,"LI",{class:!0});var d=v(s);c=E(d,"A",{href:!0,class:!0});var f=v(c);i=w(f,"Tan Li Hau"),f.forEach(h),d.forEach(h),r=k(u),p=E(u,"LI",{class:!0});var m=v(p);y=E(m,"A",{href:!0,class:!0});var g=v(y);$=w(g,"About"),g.forEach(h),m.forEach(h),I=k(u),A=E(u,"LI",{class:!0});var b=v(A);T=E(b,"A",{href:!0,class:!0});var Y=v(T);S=w(Y,"Writings"),Y.forEach(h),b.forEach(h),x=k(u),j=E(u,"LI",{class:!0});var K=v(j);P=E(K,"A",{href:!0,class:!0});var Z=v(P);C=w(Z,"Talks"),Z.forEach(h),K.forEach(h),O=k(u),U=E(u,"LI",{class:!0});var Q=v(U);M=E(Q,"A",{href:!0,class:!0});var X=v(M);L=w(X,"Notes"),X.forEach(h),Q.forEach(h),_=k(u),R=E(u,"LI",{class:!0});var ee=v(R);N=E(ee,"A",{href:!0,class:!0});var te=v(N);H=w(te,"Newsletter"),te.forEach(h),ee.forEach(h),J=k(u),B=E(u,"LI",{class:!0});var ne=v(B);G=E(ne,"A",{"aria-label":!0,href:!0,class:!0});var ae=v(G);D=E(ae,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var oe=v(D);F=E(oe,"path",{d:!0},1),v(F).forEach(h),oe.forEach(h),ae.forEach(h),q=k(ne),z=E(ne,"A",{"aria-label":!0,href:!0,class:!0});var se=v(z);W=E(se,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var ce=v(W);V=E(ce,"path",{d:!0},1),v(V).forEach(h),ce.forEach(h),se.forEach(h),ne.forEach(h),u.forEach(h),l.forEach(h),t.forEach(h),this.h()},h(){b(c,"href","/"),b(c,"class","svelte-f3e4uo"),b(s,"class","svelte-f3e4uo"),b(y,"href","/about"),b(y,"class","svelte-f3e4uo"),b(p,"class","svelte-f3e4uo"),b(T,"href","/blogs"),b(T,"class","svelte-f3e4uo"),b(A,"class","svelte-f3e4uo"),b(P,"href","/talks"),b(P,"class","svelte-f3e4uo"),b(j,"class","svelte-f3e4uo"),b(M,"href","/notes"),b(M,"class","svelte-f3e4uo"),b(U,"class","svelte-f3e4uo"),b(N,"href","/newsletter"),b(N,"class","svelte-f3e4uo"),b(R,"class","svelte-f3e4uo"),b(F,"d","M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"),b(D,"viewBox","0 0 24 24"),b(D,"width","1em"),b(D,"height","1em"),b(D,"class","svelte-f3e4uo"),b(G,"aria-label","Twitter account"),b(G,"href","https://twitter.com/lihautan"),b(G,"class","svelte-f3e4uo"),b(V,"d","M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"),b(W,"viewBox","0 0 24 24"),b(W,"width","1em"),b(W,"height","1em"),b(W,"class","svelte-f3e4uo"),b(z,"aria-label","Github account"),b(z,"href","https://github.com/tanhauhau"),b(z,"class","svelte-f3e4uo"),b(B,"class","social svelte-f3e4uo"),b(o,"class","svelte-f3e4uo"),b(n,"class","svelte-f3e4uo")},m(e,t){u(e,n,t),l(n,a),l(a,o),l(o,s),l(s,c),l(c,i),l(o,r),l(o,p),l(p,y),l(y,$),l(o,I),l(o,A),l(A,T),l(T,S),l(o,x),l(o,j),l(j,P),l(P,C),l(o,O),l(o,U),l(U,M),l(M,L),l(o,_),l(o,R),l(R,N),l(N,H),l(o,J),l(o,B),l(B,G),l(G,D),l(D,F),l(B,q),l(B,z),l(z,W),l(W,V)},p:e,i:e,o:e,d(e){e&&h(n)}}}class Z extends Y{constructor(e){super(),V(this,e,null,K,c,{})}}function Q(t){let n,a,o,s,c,i,r,p,f,y,$,A,T,S,x,j,P,C,O,U;return{c(){n=d("div"),a=d("h1"),o=m("Subscribe to my newsletter"),s=g(),c=d("h2"),i=m("Get the latest blog posts and project updates delivered right to your inbox"),r=g(),p=d("form"),f=d("div"),y=d("input"),$=g(),A=d("input"),S=g(),x=d("input"),j=g(),P=d("p"),C=m("Powered by Buttondown."),this.h()},l(e){n=E(e,"DIV",{class:!0});var t=v(n);a=E(t,"H1",{});var l=v(a);o=w(l,"Subscribe to my newsletter"),l.forEach(h),s=k(t),c=E(t,"H2",{class:!0});var u=v(c);i=w(u,"Get the latest blog posts and project updates delivered right to your inbox"),u.forEach(h),r=k(t),p=E(t,"FORM",{action:!0,method:!0,target:!0,onsubmit:!0,class:!0});var d=v(p);f=E(d,"DIV",{class:!0});var m=v(f);y=E(m,"INPUT",{type:!0,name:!0,id:!0,"aria-label":!0,placeholder:!0,class:!0}),$=k(m),A=E(m,"INPUT",{type:!0,value:!0,disabled:!0,class:!0}),m.forEach(h),S=k(d),x=E(d,"INPUT",{type:!0,value:!0,name:!0,class:!0}),j=k(d),P=E(d,"P",{class:!0});var g=v(P);C=w(g,"Powered by Buttondown."),g.forEach(h),d.forEach(h),t.forEach(h),this.h()},h(){b(c,"class","svelte-1k1s1co"),b(y,"type","email"),b(y,"name","email"),b(y,"id","bd-email"),b(y,"aria-label","email address"),b(y,"placeholder","youremail@example.com"),b(y,"class","svelte-1k1s1co"),b(A,"type","submit"),A.value="Subscribe",A.disabled=T=!t[0],b(A,"class","svelte-1k1s1co"),b(f,"class","form-item svelte-1k1s1co"),b(x,"type","hidden"),x.value="1",b(x,"name","embed"),b(x,"class","svelte-1k1s1co"),b(P,"class","svelte-1k1s1co"),b(p,"action","https://buttondown.email/api/emails/embed-subscribe/lihautan"),b(p,"method","post"),b(p,"target","popupwindow"),b(p,"onsubmit","window.open('https://buttondown.email/lihautan', 'popupwindow')"),b(p,"class","embeddable-buttondown-form"),b(n,"class","form svelte-1k1s1co")},m(e,h){var d,m,g,b;u(e,n,h),l(n,a),l(a,o),l(n,s),l(n,c),l(c,i),l(n,r),l(n,p),l(p,f),l(f,y),I(y,t[0]),l(f,$),l(f,A),l(p,S),l(p,x),l(p,j),l(p,P),l(P,C),O||(d=y,m="input",g=t[1],d.addEventListener(m,g,b),U=()=>d.removeEventListener(m,g,b),O=!0)},p(e,[t]){1&t&&y.value!==e[0]&&I(y,e[0]),1&t&&T!==(T=!e[0])&&(A.disabled=T)},i:e,o:e,d(e){e&&h(n),O=!1,U()}}}function X(e,t,n){let a;return[a,function(){a=this.value,n(0,a)}]}class ee extends Y{constructor(e){super(),V(this,e,X,Q,c,{})}}function te(e){return x(()=>(setTimeout(()=>{if(window.innerWidth>1080){const e=document.createElement("script");e.async=!0,e.type="text/javascript",e.src="//cdn.carbonads.com/carbon.js?serve=CE7ITK3E&placement=lihautancom",e.id="_carbonads_js",document.body.appendChild(e)}},5e3),()=>{try{const e=document.getElementById("carbonads");e.parentNode.removeChild(e)}catch(e){}})),[]}class ne extends Y{constructor(e){super(),V(this,e,te,null,c,{})}}function ae(e,t,n){const a=e.slice();return a[6]=t[n],a}function oe(e,t,n){const a=e.slice();return a[6]=t[n],a}function se(e){let t,n;return{c(){t=d("meta"),this.h()},l(e){t=E(e,"META",{name:!0,content:!0}),this.h()},h(){b(t,"name","keywords"),b(t,"content",n=e[6])},m(e,n){u(e,t,n)},p(e,a){4&a&&n!==(n=e[6])&&b(t,"content",n)},d(e){e&&h(t)}}}function ce(e){let t,n,a=e[6]+"";return{c(){t=d("span"),n=m(a),this.h()},l(e){t=E(e,"SPAN",{class:!0});var o=v(t);n=w(o,a),o.forEach(h),this.h()},h(){b(t,"class","svelte-9tqnza")},m(e,a){u(e,t,a),l(t,n)},p(e,t){4&t&&a!==(a=e[6]+"")&&$(n,a)},d(e){e&&h(t)}}}function ie(e){let t,n,a,o,s,c,f,I,T,S,x,j,P,C,O,U,M,L,_,R,N,H,J,W,V,Y,K,Q,X,te,ie,re,le,ue,he,pe,de,fe,me,ge=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Article",author:e[3],copyrightHolder:e[3],copyrightYear:"2020",creator:e[3],publisher:e[3],description:e[1],headline:e[0],name:e[0],inLanguage:"en"})}<\/script>`,ye=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",description:"Breadcrumbs list",name:"Breadcrumbs",itemListElement:[{"@type":"ListItem",item:{"@id":"https://lihautan.com",name:"Homepage"},position:1},{"@type":"ListItem",item:{"@id":"https%3A%2F%2Flihautan.com%2Fuglify-ascii-only",name:e[0]},position:2}]})}<\/script>`;document.title=t=e[0]+" | Tan Li Hau";let be=e[2],ve=[];for(let t=0;t<be.length;t+=1)ve[t]=se(oe(e,be,t));J=new Z({});let Ee=e[2],we=[];for(let t=0;t<Ee.length;t+=1)we[t]=ce(ae(e,Ee,t));const ke=e[5].default,$e=function(e,t,n,a){if(e){const o=i(e,t,n,a);return e[0](o)}}(ke,e,e[4],null);return le=new ee({}),he=new ne({}),{c(){n=d("meta"),a=d("meta"),o=d("meta"),s=d("meta"),c=d("meta"),f=d("meta"),I=d("meta"),T=d("meta"),S=d("meta"),x=d("meta"),j=d("meta");for(let e=0;e<ve.length;e+=1)ve[e].c();P=d("meta"),C=d("meta"),U=y(),L=y(),_=g(),R=d("a"),N=m("Skip to content"),H=g(),D(J.$$.fragment),W=g(),V=d("main"),Y=d("h1"),K=m(e[0]),Q=g();for(let e=0;e<we.length;e+=1)we[e].c();X=g(),te=d("article"),$e&&$e.c(),ie=g(),re=d("footer"),D(le.$$.fragment),ue=g(),D(he.$$.fragment),pe=g(),fe=y(),this.h()},l(t){const i=function(e,t=document.body){return Array.from(t.querySelectorAll(e))}('[data-svelte="svelte-n0q11s"]',document.head);n=E(i,"META",{name:!0,content:!0}),a=E(i,"META",{name:!0,content:!0}),o=E(i,"META",{name:!0,content:!0}),s=E(i,"META",{name:!0,content:!0}),c=E(i,"META",{name:!0,content:!0}),f=E(i,"META",{name:!0,content:!0}),I=E(i,"META",{name:!0,content:!0}),T=E(i,"META",{name:!0,content:!0}),S=E(i,"META",{name:!0,content:!0}),x=E(i,"META",{name:!0,content:!0}),j=E(i,"META",{name:!0,content:!0});for(let e=0;e<ve.length;e+=1)ve[e].l(i);P=E(i,"META",{itemprop:!0,content:!0}),C=E(i,"META",{itemprop:!0,content:!0}),U=y(),L=y(),i.forEach(h),_=k(t),R=E(t,"A",{href:!0,class:!0});var r=v(R);N=w(r,"Skip to content"),r.forEach(h),H=k(t),F(J.$$.fragment,t),W=k(t),V=E(t,"MAIN",{id:!0,class:!0});var l=v(V);Y=E(l,"H1",{});var u=v(Y);K=w(u,e[0]),u.forEach(h),Q=k(l);for(let e=0;e<we.length;e+=1)we[e].l(l);X=k(l),te=E(l,"ARTICLE",{});var p=v(te);$e&&$e.l(p),p.forEach(h),l.forEach(h),ie=k(t),re=E(t,"FOOTER",{class:!0});var d=v(re);F(le.$$.fragment,d),ue=k(d),F(he.$$.fragment,d),d.forEach(h),pe=k(t),fe=y(),this.h()},h(){b(n,"name","description"),b(n,"content",e[1]),b(a,"name","image"),b(a,"content",null),b(o,"name","og:image"),b(o,"content",null),b(s,"name","og:title"),b(s,"content",e[0]),b(c,"name","og:description"),b(c,"content",e[1]),b(f,"name","og:type"),b(f,"content","website"),b(I,"name","twitter:card"),b(I,"content","summary_large_image"),b(T,"name","twitter:creator"),b(T,"content","@lihautan"),b(S,"name","twitter:title"),b(S,"content",e[0]),b(x,"name","twitter:description"),b(x,"content",e[1]),b(j,"name","twitter:image"),b(j,"content",null),b(P,"itemprop","url"),b(P,"content","https%3A%2F%2Flihautan.com%2Fuglify-ascii-only"),b(C,"itemprop","image"),b(C,"content",null),O=new A(U),M=new A(L),b(R,"href","#content"),b(R,"class","skip svelte-9tqnza"),b(V,"id","content"),b(V,"class","blog svelte-9tqnza"),b(re,"class","svelte-9tqnza"),de=new A(fe)},m(e,t){l(document.head,n),l(document.head,a),l(document.head,o),l(document.head,s),l(document.head,c),l(document.head,f),l(document.head,I),l(document.head,T),l(document.head,S),l(document.head,x),l(document.head,j);for(let e=0;e<ve.length;e+=1)ve[e].m(document.head,null);l(document.head,P),l(document.head,C),O.m(ge,document.head),l(document.head,U),M.m(ye,document.head),l(document.head,L),u(e,_,t),u(e,R,t),l(R,N),u(e,H,t),q(J,e,t),u(e,W,t),u(e,V,t),l(V,Y),l(Y,K),l(V,Q);for(let e=0;e<we.length;e+=1)we[e].m(V,null);l(V,X),l(V,te),$e&&$e.m(te,null),u(e,ie,t),u(e,re,t),q(le,re,null),l(re,ue),q(he,re,null),u(e,pe,t),de.m('<script async defer src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>',e,t),u(e,fe,t),me=!0},p(e,[a]){if((!me||1&a)&&t!==(t=e[0]+" | Tan Li Hau")&&(document.title=t),(!me||2&a)&&b(n,"content",e[1]),(!me||1&a)&&b(s,"content",e[0]),(!me||2&a)&&b(c,"content",e[1]),(!me||1&a)&&b(S,"content",e[0]),(!me||2&a)&&b(x,"content",e[1]),4&a){let t;for(be=e[2],t=0;t<be.length;t+=1){const n=oe(e,be,t);ve[t]?ve[t].p(n,a):(ve[t]=se(n),ve[t].c(),ve[t].m(P.parentNode,P))}for(;t<ve.length;t+=1)ve[t].d(1);ve.length=be.length}if((!me||3&a)&&ge!==(ge=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Article",author:e[3],copyrightHolder:e[3],copyrightYear:"2020",creator:e[3],publisher:e[3],description:e[1],headline:e[0],name:e[0],inLanguage:"en"})}<\/script>`)&&O.p(ge),(!me||1&a)&&ye!==(ye=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",description:"Breadcrumbs list",name:"Breadcrumbs",itemListElement:[{"@type":"ListItem",item:{"@id":"https://lihautan.com",name:"Homepage"},position:1},{"@type":"ListItem",item:{"@id":"https%3A%2F%2Flihautan.com%2Fuglify-ascii-only",name:e[0]},position:2}]})}<\/script>`)&&M.p(ye),(!me||1&a)&&$(K,e[0]),4&a){let t;for(Ee=e[2],t=0;t<Ee.length;t+=1){const n=ae(e,Ee,t);we[t]?we[t].p(n,a):(we[t]=ce(n),we[t].c(),we[t].m(V,X))}for(;t<we.length;t+=1)we[t].d(1);we.length=Ee.length}$e&&$e.p&&16&a&&r($e,ke,e,e[4],a,null,null)},i(e){me||(B(J.$$.fragment,e),B($e,e),B(le.$$.fragment,e),B(he.$$.fragment,e),me=!0)},o(e){G(J.$$.fragment,e),G($e,e),G(le.$$.fragment,e),G(he.$$.fragment,e),me=!1},d(e){h(n),h(a),h(o),h(s),h(c),h(f),h(I),h(T),h(S),h(x),h(j),p(ve,e),h(P),h(C),h(U),e&&O.d(),h(L),e&&M.d(),e&&h(_),e&&h(R),e&&h(H),z(J,e),e&&h(W),e&&h(V),p(we,e),$e&&$e.d(e),e&&h(ie),e&&h(re),z(le),z(he),e&&h(pe),e&&h(fe),e&&de.d()}}}function re(e,t,n){let{title:a=""}=t,{description:o=""}=t,{tags:s=[]}=t;const c={"@type":"Person",name:"Tan Li Hau"};let{$$slots:i={},$$scope:r}=t;return e.$set=e=>{"title"in e&&n(0,a=e.title),"description"in e&&n(1,o=e.description),"tags"in e&&n(2,s=e.tags),"$$scope"in e&&n(4,r=e.$$scope)},[a,o,s,c,r,i]}class le extends Y{constructor(e){super(),V(this,e,re,ie,c,{title:0,description:1,tags:2})}}function ue(t){let n,a,o,s,c,i,r,p,f,y,$,I,A,T,S,x,j,P,C,O,U,M,L,_,R,N,H,J,B,G,D,F,q,z,W,V,Y,K,Z,Q,X,ee,te,ne,ae,oe,se,ce,ie,re,le,ue,he,pe,de,fe,me,ge,ye,be,ve,Ee,we,ke,$e,Ie,Ae,Te,Se,xe,je,Pe,Ce,Oe,Ue,Me,Le,_e,Re,Ne,He,Je,Be,Ge,De,Fe,qe,ze,We,Ve,Ye,Ke,Ze,Qe,Xe,et,tt,nt,at,ot,st,ct,it,rt,lt,ut,ht,pt,dt,ft,mt,gt,yt,bt,vt,Et,wt,kt,$t,It,At,Tt,St,xt,jt,Pt,Ct,Ot,Ut,Mt,Lt,_t,Rt,Nt,Ht,Jt,Bt,Gt,Dt,Ft,qt,zt,Wt,Vt,Yt,Kt,Zt,Qt,Xt,en,tn,nn,an,on,sn,cn,rn,ln,un,hn,pn,dn,fn;return{c(){n=d("section"),a=d("ul"),o=d("li"),s=d("a"),c=m("TIL: UglifyJs ascii_only option, use it when you want to escape Unicode characters."),i=g(),r=d("p"),p=m("The background story"),f=g(),y=d("p"),$=m("I was working on a chrome extension, and trying to add some emojis 😍😀😎 into the extension, however I realised the 😍😀😎 are not rendered correctly!"),I=g(),A=d("p"),T=d("picture"),S=d("source"),x=d("source"),j=d("img"),C=g(),O=d("p"),U=m("And so I inspect the source code loaded into the chrome extension, it wasn’t loaded correctly as well!"),M=g(),L=d("p"),_=d("picture"),R=d("source"),N=d("source"),H=d("img"),B=g(),G=d("p"),D=m("And so I think, probably the encoding issue was caused by the webpack compilation, but, my compiled code looks exactly fine!"),F=g(),q=d("p"),z=d("picture"),W=d("source"),V=d("source"),Y=d("img"),Z=g(),Q=d("p"),X=m("So, most likely is a decoding issue when the emoji code get loaded into chrome extension. So I manually changed the emoji in the compiled code to "),ee=d("code"),te=m("\\ud83d\\ude0d"),ne=m(" (unicode for 😍). Guess what? The emoji is showing correctly in the chrome extension!"),ae=g(),oe=d("p"),se=d("picture"),ce=d("source"),ie=d("source"),re=d("img"),ue=g(),he=d("p"),pe=m("So I changed my source code to manually type in the unicode, and compiled it using webpack. To my surprise, the unicode was compiled back into the emoji (😍) it represents!"),de=g(),fe=d("p"),me=m("I googled around and I found "),ge=d("a"),ye=m("this fix for babel-generator"),be=m(":"),ve=g(),Ee=d("p"),we=d("picture"),ke=d("source"),$e=d("source"),Ie=d("img"),Te=g(),Se=d("p"),xe=m("I checked my babel version, and it had included this fix. So what went wrong?"),je=g(),Pe=d("hr"),Ce=g(),Oe=d("p"),Ue=m("My colleague reminded me that during webpack compilation, there are 2 phases, the "),Me=d("strong"),Le=m("transpilation"),_e=m(" (via babel) and the "),Re=d("strong"),Ne=m("minification"),He=m(" (via uglify plugin)."),Je=g(),Be=d("p"),Ge=m("So I disabled the optimisation in webpack config, and noticed that my compiled code contains the original unicode string ("),De=d("code"),Fe=m("\\ud83d\\ude0d"),qe=m("), instead of the emoji (😍) string. So the unicode string was converted to emoji string during minification!"),ze=g(),We=d("p"),Ve=m("So I went to my favourite "),Ye=d("a"),Ke=m("Online JavaScript Minifier"),Ze=m(" (by "),Qe=d("a"),Xe=m("skalman"),et=m(") to try it out."),tt=g(),nt=d("p"),at=d("picture"),ot=d("source"),st=d("source"),ct=d("img"),rt=g(),lt=d("p"),ut=m("After some googling, I "),ht=d("a"),pt=m("found this issue"),dt=m(" which described my scenario perfectly."),ft=g(),mt=d("p"),gt=d("picture"),yt=d("source"),bt=d("source"),vt=d("img"),wt=g(),kt=d("p"),$t=m("Turned out there is a "),It=d("code"),At=m("ascii_only"),Tt=m(" for "),St=d("a"),xt=m("output options"),jt=m(", and it is default to "),Pt=d("code"),Ct=m("false"),Ot=m(". So I set "),Ut=d("code"),Mt=m("ascii_only"),Lt=m(" to "),_t=d("code"),Rt=m("true"),Nt=m(", ran webpack, and checked my compiled code, it contained the unicode string ("),Ht=d("code"),Jt=m("\\ud83d\\ude0d"),Bt=m(")! And even when I wrote emoji string (😍) in my source code, it got compiled to unicode as well."),Gt=g(),Dt=d("pre"),Ft=g(),qt=d("hr"),zt=g(),Wt=d("section"),Vt=d("h2"),Yt=d("a"),Kt=m("TIL: UglifyJs ascii_only option, use it when you want to escape Unicode characters."),Zt=g(),Qt=d("hr"),Xt=g(),en=d("p"),tn=m("Why is there a "),nn=d("code"),an=m("ascii_only"),on=m(" option?"),sn=g(),cn=d("p"),rn=m("My guess is that it takes less space for a unicode character (16–17bit) than the escaped ascii characters (6 "),ln=d("em"),un=m("8 bit — 12"),hn=m(" bit), that’s why using unicode character is the default option ("),pn=d("code"),dn=m("ascii_only=false"),fn=m(")."),this.h()},l(e){n=E(e,"SECTION",{});var t=v(n);a=E(t,"UL",{class:!0,id:!0,role:!0,"aria-label":!0});var l=v(a);o=E(l,"LI",{});var u=v(o);s=E(u,"A",{href:!0});var d=v(s);c=w(d,"TIL: UglifyJs ascii_only option, use it when you want to escape Unicode characters."),d.forEach(h),u.forEach(h),l.forEach(h),t.forEach(h),i=k(e),r=E(e,"P",{});var m=v(r);p=w(m,"The background story"),m.forEach(h),f=k(e),y=E(e,"P",{});var g=v(y);$=w(g,"I was working on a chrome extension, and trying to add some emojis 😍😀😎 into the extension, however I realised the 😍😀😎 are not rendered correctly!"),g.forEach(h),I=k(e),A=E(e,"P",{});var b=v(A);T=E(b,"PICTURE",{});var P=v(T);S=E(P,"SOURCE",{type:!0,srcset:!0}),x=E(P,"SOURCE",{type:!0,srcset:!0}),j=E(P,"IMG",{alt:!0,src:!0}),P.forEach(h),b.forEach(h),C=k(e),O=E(e,"P",{});var J=v(O);U=w(J,"And so I inspect the source code loaded into the chrome extension, it wasn’t loaded correctly as well!"),J.forEach(h),M=k(e),L=E(e,"P",{});var K=v(L);_=E(K,"PICTURE",{});var le=v(_);R=E(le,"SOURCE",{type:!0,srcset:!0}),N=E(le,"SOURCE",{type:!0,srcset:!0}),H=E(le,"IMG",{alt:!0,src:!0}),le.forEach(h),K.forEach(h),B=k(e),G=E(e,"P",{});var Ae=v(G);D=w(Ae,"And so I think, probably the encoding issue was caused by the webpack compilation, but, my compiled code looks exactly fine!"),Ae.forEach(h),F=k(e),q=E(e,"P",{});var it=v(q);z=E(it,"PICTURE",{});var Et=v(z);W=E(Et,"SOURCE",{type:!0,srcset:!0}),V=E(Et,"SOURCE",{type:!0,srcset:!0}),Y=E(Et,"IMG",{alt:!0,src:!0}),Et.forEach(h),it.forEach(h),Z=k(e),Q=E(e,"P",{});var mn=v(Q);X=w(mn,"So, most likely is a decoding issue when the emoji code get loaded into chrome extension. So I manually changed the emoji in the compiled code to "),ee=E(mn,"CODE",{});var gn=v(ee);te=w(gn,"\\ud83d\\ude0d"),gn.forEach(h),ne=w(mn," (unicode for 😍). Guess what? The emoji is showing correctly in the chrome extension!"),mn.forEach(h),ae=k(e),oe=E(e,"P",{});var yn=v(oe);se=E(yn,"PICTURE",{});var bn=v(se);ce=E(bn,"SOURCE",{type:!0,srcset:!0}),ie=E(bn,"SOURCE",{type:!0,srcset:!0}),re=E(bn,"IMG",{alt:!0,src:!0}),bn.forEach(h),yn.forEach(h),ue=k(e),he=E(e,"P",{});var vn=v(he);pe=w(vn,"So I changed my source code to manually type in the unicode, and compiled it using webpack. To my surprise, the unicode was compiled back into the emoji (😍) it represents!"),vn.forEach(h),de=k(e),fe=E(e,"P",{});var En=v(fe);me=w(En,"I googled around and I found "),ge=E(En,"A",{href:!0,rel:!0});var wn=v(ge);ye=w(wn,"this fix for babel-generator"),wn.forEach(h),be=w(En,":"),En.forEach(h),ve=k(e),Ee=E(e,"P",{});var kn=v(Ee);we=E(kn,"PICTURE",{});var $n=v(we);ke=E($n,"SOURCE",{type:!0,srcset:!0}),$e=E($n,"SOURCE",{type:!0,srcset:!0}),Ie=E($n,"IMG",{alt:!0,src:!0}),$n.forEach(h),kn.forEach(h),Te=k(e),Se=E(e,"P",{});var In=v(Se);xe=w(In,"I checked my babel version, and it had included this fix. So what went wrong?"),In.forEach(h),je=k(e),Pe=E(e,"HR",{}),Ce=k(e),Oe=E(e,"P",{});var An=v(Oe);Ue=w(An,"My colleague reminded me that during webpack compilation, there are 2 phases, the "),Me=E(An,"STRONG",{});var Tn=v(Me);Le=w(Tn,"transpilation"),Tn.forEach(h),_e=w(An," (via babel) and the "),Re=E(An,"STRONG",{});var Sn=v(Re);Ne=w(Sn,"minification"),Sn.forEach(h),He=w(An," (via uglify plugin)."),An.forEach(h),Je=k(e),Be=E(e,"P",{});var xn=v(Be);Ge=w(xn,"So I disabled the optimisation in webpack config, and noticed that my compiled code contains the original unicode string ("),De=E(xn,"CODE",{});var jn=v(De);Fe=w(jn,"\\ud83d\\ude0d"),jn.forEach(h),qe=w(xn,"), instead of the emoji (😍) string. So the unicode string was converted to emoji string during minification!"),xn.forEach(h),ze=k(e),We=E(e,"P",{});var Pn=v(We);Ve=w(Pn,"So I went to my favourite "),Ye=E(Pn,"A",{href:!0,rel:!0});var Cn=v(Ye);Ke=w(Cn,"Online JavaScript Minifier"),Cn.forEach(h),Ze=w(Pn," (by "),Qe=E(Pn,"A",{href:!0,rel:!0});var On=v(Qe);Xe=w(On,"skalman"),On.forEach(h),et=w(Pn,") to try it out."),Pn.forEach(h),tt=k(e),nt=E(e,"P",{});var Un=v(nt);at=E(Un,"PICTURE",{});var Mn=v(at);ot=E(Mn,"SOURCE",{type:!0,srcset:!0}),st=E(Mn,"SOURCE",{type:!0,srcset:!0}),ct=E(Mn,"IMG",{alt:!0,src:!0}),Mn.forEach(h),Un.forEach(h),rt=k(e),lt=E(e,"P",{});var Ln=v(lt);ut=w(Ln,"After some googling, I "),ht=E(Ln,"A",{href:!0,rel:!0});var _n=v(ht);pt=w(_n,"found this issue"),_n.forEach(h),dt=w(Ln," which described my scenario perfectly."),Ln.forEach(h),ft=k(e),mt=E(e,"P",{});var Rn=v(mt);gt=E(Rn,"PICTURE",{});var Nn=v(gt);yt=E(Nn,"SOURCE",{type:!0,srcset:!0}),bt=E(Nn,"SOURCE",{type:!0,srcset:!0}),vt=E(Nn,"IMG",{alt:!0,src:!0}),Nn.forEach(h),Rn.forEach(h),wt=k(e),kt=E(e,"P",{});var Hn=v(kt);$t=w(Hn,"Turned out there is a "),It=E(Hn,"CODE",{});var Jn=v(It);At=w(Jn,"ascii_only"),Jn.forEach(h),Tt=w(Hn," for "),St=E(Hn,"A",{href:!0,rel:!0});var Bn=v(St);xt=w(Bn,"output options"),Bn.forEach(h),jt=w(Hn,", and it is default to "),Pt=E(Hn,"CODE",{});var Gn=v(Pt);Ct=w(Gn,"false"),Gn.forEach(h),Ot=w(Hn,". So I set "),Ut=E(Hn,"CODE",{});var Dn=v(Ut);Mt=w(Dn,"ascii_only"),Dn.forEach(h),Lt=w(Hn," to "),_t=E(Hn,"CODE",{});var Fn=v(_t);Rt=w(Fn,"true"),Fn.forEach(h),Nt=w(Hn,", ran webpack, and checked my compiled code, it contained the unicode string ("),Ht=E(Hn,"CODE",{});var qn=v(Ht);Jt=w(qn,"\\ud83d\\ude0d"),qn.forEach(h),Bt=w(Hn,")! And even when I wrote emoji string (😍) in my source code, it got compiled to unicode as well."),Hn.forEach(h),Gt=k(e),Dt=E(e,"PRE",{class:!0}),v(Dt).forEach(h),Ft=k(e),qt=E(e,"HR",{}),zt=k(e),Wt=E(e,"SECTION",{});var zn=v(Wt);Vt=E(zn,"H2",{});var Wn=v(Vt);Yt=E(Wn,"A",{href:!0,id:!0});var Vn=v(Yt);Kt=w(Vn,"TIL: UglifyJs ascii_only option, use it when you want to escape Unicode characters."),Vn.forEach(h),Wn.forEach(h),Zt=k(zn),Qt=E(zn,"HR",{}),Xt=k(zn),en=E(zn,"P",{});var Yn=v(en);tn=w(Yn,"Why is there a "),nn=E(Yn,"CODE",{});var Kn=v(nn);an=w(Kn,"ascii_only"),Kn.forEach(h),on=w(Yn," option?"),Yn.forEach(h),sn=k(zn),cn=E(zn,"P",{});var Zn=v(cn);rn=w(Zn,"My guess is that it takes less space for a unicode character (16–17bit) than the escaped ascii characters (6 "),ln=E(Zn,"EM",{});var Qn=v(ln);un=w(Qn,"8 bit — 12"),Qn.forEach(h),hn=w(Zn," bit), that’s why using unicode character is the default option ("),pn=E(Zn,"CODE",{});var Xn=v(pn);dn=w(Xn,"ascii_only=false"),Xn.forEach(h),fn=w(Zn,")."),Zn.forEach(h),zn.forEach(h),this.h()},h(){b(s,"href","#til-uglifyjs-ascii-only-option-use-it-when-you-want-to-escape-unicode-characters"),b(a,"class","sitemap"),b(a,"id","sitemap"),b(a,"role","navigation"),b(a,"aria-label","Table of Contents"),b(S,"type","image/webp"),b(S,"srcset","adf2abda876019fd.webp"),b(x,"type","image/jpeg"),b(x,"srcset","adf2abda876019fd.png"),b(j,"alt","The 😍😍😀😀isn’t rendered correctly in chrome extension"),j.src!==(P="adf2abda876019fd.png")&&b(j,"src","adf2abda876019fd.png"),b(R,"type","image/webp"),b(R,"srcset","7afb27b2027d0eb4.webp"),b(N,"type","image/jpeg"),b(N,"srcset","7afb27b2027d0eb4.png"),b(H,"alt","problem with the source too"),H.src!==(J="7afb27b2027d0eb4.png")&&b(H,"src","7afb27b2027d0eb4.png"),b(W,"type","image/webp"),b(W,"srcset","aeb3ba002a361331.webp"),b(V,"type","image/jpeg"),b(V,"srcset","aeb3ba002a361331.png"),b(Y,"alt","The compiled code seems okay!"),Y.src!==(K="aeb3ba002a361331.png")&&b(Y,"src","aeb3ba002a361331.png"),b(ce,"type","image/webp"),b(ce,"srcset","e40d56e0e272da42.webp"),b(ie,"type","image/jpeg"),b(ie,"srcset","e40d56e0e272da42.png"),b(re,"alt","😍!"),re.src!==(le="e40d56e0e272da42.png")&&b(re,"src","e40d56e0e272da42.png"),b(ge,"href","https://github.com/babel/babel/pull/4478"),b(ge,"rel","nofollow"),b(ke,"type","image/webp"),b(ke,"srcset","cec8624969909357.webp"),b($e,"type","image/jpeg"),b($e,"srcset","cec8624969909357.png"),b(Ie,"alt","babel issue"),Ie.src!==(Ae="cec8624969909357.png")&&b(Ie,"src","cec8624969909357.png"),b(Ye,"href","https://skalman.github.io/UglifyJS-online/"),b(Ye,"rel","nofollow"),b(Qe,"href","https://github.com/skalman"),b(Qe,"rel","nofollow"),b(ot,"type","image/webp"),b(ot,"srcset","4a468cb0933b0473.webp"),b(st,"type","image/jpeg"),b(st,"srcset","4a468cb0933b0473.png"),b(ct,"alt","online javasript minifier"),ct.src!==(it="4a468cb0933b0473.png")&&b(ct,"src","4a468cb0933b0473.png"),b(ht,"href","https://github.com/mishoo/UglifyJS2/issues/490"),b(ht,"rel","nofollow"),b(yt,"type","image/webp"),b(yt,"srcset","5824c5e3e9173f25.webp"),b(bt,"type","image/jpeg"),b(bt,"srcset","5824c5e3e9173f25.png"),b(vt,"alt","why uglifyjs always compress unicode characters to utf8"),vt.src!==(Et="5824c5e3e9173f25.png")&&b(vt,"src","5824c5e3e9173f25.png"),b(St,"href","https://github.com/mishoo/UglifyJS2#output-options"),b(St,"rel","nofollow"),b(Dt,"class","language-js"),b(Yt,"href","#til-uglifyjs-ascii-only-option-use-it-when-you-want-to-escape-unicode-characters"),b(Yt,"id","til-uglifyjs-ascii-only-option-use-it-when-you-want-to-escape-unicode-characters")},m(e,t){u(e,n,t),l(n,a),l(a,o),l(o,s),l(s,c),u(e,i,t),u(e,r,t),l(r,p),u(e,f,t),u(e,y,t),l(y,$),u(e,I,t),u(e,A,t),l(A,T),l(T,S),l(T,x),l(T,j),u(e,C,t),u(e,O,t),l(O,U),u(e,M,t),u(e,L,t),l(L,_),l(_,R),l(_,N),l(_,H),u(e,B,t),u(e,G,t),l(G,D),u(e,F,t),u(e,q,t),l(q,z),l(z,W),l(z,V),l(z,Y),u(e,Z,t),u(e,Q,t),l(Q,X),l(Q,ee),l(ee,te),l(Q,ne),u(e,ae,t),u(e,oe,t),l(oe,se),l(se,ce),l(se,ie),l(se,re),u(e,ue,t),u(e,he,t),l(he,pe),u(e,de,t),u(e,fe,t),l(fe,me),l(fe,ge),l(ge,ye),l(fe,be),u(e,ve,t),u(e,Ee,t),l(Ee,we),l(we,ke),l(we,$e),l(we,Ie),u(e,Te,t),u(e,Se,t),l(Se,xe),u(e,je,t),u(e,Pe,t),u(e,Ce,t),u(e,Oe,t),l(Oe,Ue),l(Oe,Me),l(Me,Le),l(Oe,_e),l(Oe,Re),l(Re,Ne),l(Oe,He),u(e,Je,t),u(e,Be,t),l(Be,Ge),l(Be,De),l(De,Fe),l(Be,qe),u(e,ze,t),u(e,We,t),l(We,Ve),l(We,Ye),l(Ye,Ke),l(We,Ze),l(We,Qe),l(Qe,Xe),l(We,et),u(e,tt,t),u(e,nt,t),l(nt,at),l(at,ot),l(at,st),l(at,ct),u(e,rt,t),u(e,lt,t),l(lt,ut),l(lt,ht),l(ht,pt),l(lt,dt),u(e,ft,t),u(e,mt,t),l(mt,gt),l(gt,yt),l(gt,bt),l(gt,vt),u(e,wt,t),u(e,kt,t),l(kt,$t),l(kt,It),l(It,At),l(kt,Tt),l(kt,St),l(St,xt),l(kt,jt),l(kt,Pt),l(Pt,Ct),l(kt,Ot),l(kt,Ut),l(Ut,Mt),l(kt,Lt),l(kt,_t),l(_t,Rt),l(kt,Nt),l(kt,Ht),l(Ht,Jt),l(kt,Bt),u(e,Gt,t),u(e,Dt,t),Dt.innerHTML='<code class="language-js"><span class="token keyword">const</span> UglifyJsPlugin <span class="token operator">=</span> <span class="token function">require</span><span class="token punctuation">(</span><span class="token string">\'uglifyjs-webpack-plugin\'</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n\nmodule<span class="token punctuation">.</span>exports <span class="token operator">=</span> <span class="token punctuation">&#123;</span>\n  <span class="token comment">//...</span>\n  optimization<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>\n    minimizer<span class="token punctuation">:</span> <span class="token keyword">new</span> <span class="token class-name">UglifyJsPlugin</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>\n      uglifyOptions<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>\n        <span class="token comment">// highlight-start</span>\n        output<span class="token punctuation">:</span> <span class="token punctuation">&#123;</span>\n          <span class="token comment">// true for &#96;ascii_only&#96;</span>\n          ascii_only<span class="token punctuation">:</span> <span class="token boolean">true</span>\n        <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>\n        <span class="token comment">// highlight-end</span>\n      <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>\n    <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">,</span>\n  <span class="token punctuation">&#125;</span><span class="token punctuation">,</span>\n<span class="token punctuation">&#125;</span></code>',u(e,Ft,t),u(e,qt,t),u(e,zt,t),u(e,Wt,t),l(Wt,Vt),l(Vt,Yt),l(Yt,Kt),l(Wt,Zt),l(Wt,Qt),l(Wt,Xt),l(Wt,en),l(en,tn),l(en,nn),l(nn,an),l(en,on),l(Wt,sn),l(Wt,cn),l(cn,rn),l(cn,ln),l(ln,un),l(cn,hn),l(cn,pn),l(pn,dn),l(cn,fn)},p:e,d(e){e&&h(n),e&&h(i),e&&h(r),e&&h(f),e&&h(y),e&&h(I),e&&h(A),e&&h(C),e&&h(O),e&&h(M),e&&h(L),e&&h(B),e&&h(G),e&&h(F),e&&h(q),e&&h(Z),e&&h(Q),e&&h(ae),e&&h(oe),e&&h(ue),e&&h(he),e&&h(de),e&&h(fe),e&&h(ve),e&&h(Ee),e&&h(Te),e&&h(Se),e&&h(je),e&&h(Pe),e&&h(Ce),e&&h(Oe),e&&h(Je),e&&h(Be),e&&h(ze),e&&h(We),e&&h(tt),e&&h(nt),e&&h(rt),e&&h(lt),e&&h(ft),e&&h(mt),e&&h(wt),e&&h(kt),e&&h(Gt),e&&h(Dt),e&&h(Ft),e&&h(qt),e&&h(zt),e&&h(Wt)}}}function he(e){let n,a;const o=[pe];let s={$$slots:{default:[ue]},$$scope:{ctx:e}};for(let e=0;e<o.length;e+=1)s=t(s,o[e]);return n=new le({props:s}),{c(){D(n.$$.fragment)},l(e){F(n.$$.fragment,e)},m(e,t){q(n,e,t),a=!0},p(e,[t]){const a=0&t?function(e,t){const n={},a={},o={$$scope:1};let s=e.length;for(;s--;){const c=e[s],i=t[s];if(i){for(const e in c)e in i||(a[e]=1);for(const e in i)o[e]||(n[e]=i[e],o[e]=1);e[s]=i}else for(const e in c)o[e]=1}for(const e in a)e in n||(n[e]=void 0);return n}(o,[(s=pe,"object"==typeof s&&null!==s?s:{})]):{};var s;1&t&&(a.$$scope={dirty:t,ctx:e}),n.$set(a)},i(e){a||(B(n.$$.fragment,e),a=!0)},o(e){G(n.$$.fragment,e),a=!1},d(e){z(n,e)}}}const pe={title:"The `ascii_only` option in uglify-js",date:"2018-10-27T08:00:00Z",description:"that get my emoji showing in my chrome extension",slug:"uglify-ascii-only",type:"blog"};class de extends Y{constructor(e){super(),V(this,e,null,he,c,{})}}setTimeout(()=>{new de({target:document.querySelector("#app"),hydrate:!0})},3e3);
