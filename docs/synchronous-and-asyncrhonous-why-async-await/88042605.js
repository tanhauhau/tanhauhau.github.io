function t(){}function e(t,e){for(const n in e)t[n]=e[n];return t}function n(t){return t()}function o(){return Object.create(null)}function a(t){t.forEach(n)}function s(t){return"function"==typeof t}function r(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function c(t,n,o,a){return t[1]&&a?e(o.ctx.slice(),t[1](a(n))):o.ctx}function i(t,e,n,o,a,s,r){const i=function(t,e,n,o){if(t[2]&&o){const a=t[2](o(n));if(void 0===e.dirty)return a;if("object"==typeof a){const t=[],n=Math.max(e.dirty.length,a.length);for(let o=0;o<n;o+=1)t[o]=e.dirty[o]|a[o];return t}return e.dirty|a}return e.dirty}(e,o,a,s);if(i){const a=c(e,n,o,r);t.p(a,i)}}function l(t,e){t.appendChild(e)}function u(t,e,n){t.insertBefore(e,n||null)}function h(t){t.parentNode.removeChild(t)}function f(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}function d(t){return document.createElement(t)}function m(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function p(t){return document.createTextNode(t)}function g(){return p(" ")}function v(){return p("")}function y(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function $(t){return Array.from(t.childNodes)}function b(t,e,n,o){for(let o=0;o<t.length;o+=1){const a=t[o];if(a.nodeName===e){let e=0;const s=[];for(;e<a.attributes.length;){const t=a.attributes[e++];n[t.name]||s.push(t.name)}for(let t=0;t<s.length;t++)a.removeAttribute(s[t]);return t.splice(o,1)[0]}}return o?m(e):d(e)}function w(t,e){for(let n=0;n<t.length;n+=1){const o=t[n];if(3===o.nodeType)return o.data=""+e,t.splice(n,1)[0]}return p(e)}function E(t){return w(t," ")}function A(t,e){e=""+e,t.wholeText!==e&&(t.data=e)}function x(t,e){t.value=null==e?"":e}class T{constructor(t=null){this.a=t,this.e=this.n=null}m(t,e,n=null){this.e||(this.e=d(e.nodeName),this.t=e,this.h(t)),this.i(n)}h(t){this.e.innerHTML=t,this.n=Array.from(this.e.childNodes)}i(t){for(let e=0;e<this.n.length;e+=1)u(this.t,this.n[e],t)}p(t){this.d(),this.h(t),this.i(this.a)}d(){this.n.forEach(h)}}let L;function N(t){L=t}function M(t){(function(){if(!L)throw new Error("Function called outside component initialization");return L})().$$.on_mount.push(t)}const I=[],_=[],k=[],S=[],j=Promise.resolve();let B=!1;function H(t){k.push(t)}let F=!1;const O=new Set;function P(){if(!F){F=!0;do{for(let t=0;t<I.length;t+=1){const e=I[t];N(e),q(e.$$)}for(I.length=0;_.length;)_.pop()();for(let t=0;t<k.length;t+=1){const e=k[t];O.has(e)||(O.add(e),e())}k.length=0}while(I.length);for(;S.length;)S.pop()();B=!1,F=!1,O.clear()}}function q(t){if(null!==t.fragment){t.update(),a(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(H)}}const C=new Set;function z(t,e){t&&t.i&&(C.delete(t),t.i(e))}function J(t,e,n,o){if(t&&t.o){if(C.has(t))return;C.add(t),(void 0).c.push(()=>{C.delete(t),o&&(n&&t.d(1),o())}),t.o(e)}}function R(t){t&&t.c()}function U(t,e){t&&t.l(e)}function V(t,e,o){const{fragment:r,on_mount:c,on_destroy:i,after_update:l}=t.$$;r&&r.m(e,o),H(()=>{const e=c.map(n).filter(s);i?i.push(...e):a(e),t.$$.on_mount=[]}),l.forEach(H)}function D(t,e){const n=t.$$;null!==n.fragment&&(a(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function G(t,e){-1===t.$$.dirty[0]&&(I.push(t),B||(B=!0,j.then(P)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function W(e,n,s,r,c,i,l=[-1]){const u=L;N(e);const f=n.props||{},d=e.$$={fragment:null,ctx:null,props:i,update:t,not_equal:c,bound:o(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(u?u.$$.context:[]),callbacks:o(),dirty:l};let m=!1;if(d.ctx=s?s(e,f,(t,n,...o)=>{const a=o.length?o[0]:n;return d.ctx&&c(d.ctx[t],d.ctx[t]=a)&&(d.bound[t]&&d.bound[t](a),m&&G(e,t)),n}):[],d.update(),m=!0,a(d.before_update),d.fragment=!!r&&r(d.ctx),n.target){if(n.hydrate){const t=$(n.target);d.fragment&&d.fragment.l(t),t.forEach(h)}else d.fragment&&d.fragment.c();n.intro&&z(e.$$.fragment),V(e,n.target,n.anchor),P()}N(u)}class Y{$destroy(){D(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(){}}function K(e){let n,o,a,s,r,c,i,f,v,A,x,T,L,N,M,I,_,k,S,j,B,H,F,O,P,q,C,z,J,R,U,V,D,G,W;return{c(){n=d("header"),o=d("nav"),a=d("ul"),s=d("li"),r=d("a"),c=p("Tan Li Hau"),i=g(),f=d("li"),v=d("a"),A=p("About"),x=g(),T=d("li"),L=d("a"),N=p("Writings"),M=g(),I=d("li"),_=d("a"),k=p("Talks"),S=g(),j=d("li"),B=d("a"),H=p("Notes"),F=g(),O=d("li"),P=d("a"),q=p("Newsletter"),C=g(),z=d("li"),J=d("a"),R=m("svg"),U=m("path"),V=g(),D=d("a"),G=m("svg"),W=m("path"),this.h()},l(t){n=b(t,"HEADER",{class:!0});var e=$(n);o=b(e,"NAV",{});var l=$(o);a=b(l,"UL",{class:!0});var u=$(a);s=b(u,"LI",{class:!0});var d=$(s);r=b(d,"A",{href:!0,class:!0});var m=$(r);c=w(m,"Tan Li Hau"),m.forEach(h),d.forEach(h),i=E(u),f=b(u,"LI",{class:!0});var p=$(f);v=b(p,"A",{href:!0,class:!0});var g=$(v);A=w(g,"About"),g.forEach(h),p.forEach(h),x=E(u),T=b(u,"LI",{class:!0});var y=$(T);L=b(y,"A",{href:!0,class:!0});var Y=$(L);N=w(Y,"Writings"),Y.forEach(h),y.forEach(h),M=E(u),I=b(u,"LI",{class:!0});var K=$(I);_=b(K,"A",{href:!0,class:!0});var Q=$(_);k=w(Q,"Talks"),Q.forEach(h),K.forEach(h),S=E(u),j=b(u,"LI",{class:!0});var X=$(j);B=b(X,"A",{href:!0,class:!0});var Z=$(B);H=w(Z,"Notes"),Z.forEach(h),X.forEach(h),F=E(u),O=b(u,"LI",{class:!0});var tt=$(O);P=b(tt,"A",{href:!0,class:!0});var et=$(P);q=w(et,"Newsletter"),et.forEach(h),tt.forEach(h),C=E(u),z=b(u,"LI",{class:!0});var nt=$(z);J=b(nt,"A",{"aria-label":!0,href:!0,class:!0});var ot=$(J);R=b(ot,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var at=$(R);U=b(at,"path",{d:!0},1),$(U).forEach(h),at.forEach(h),ot.forEach(h),V=E(nt),D=b(nt,"A",{"aria-label":!0,href:!0,class:!0});var st=$(D);G=b(st,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var rt=$(G);W=b(rt,"path",{d:!0},1),$(W).forEach(h),rt.forEach(h),st.forEach(h),nt.forEach(h),u.forEach(h),l.forEach(h),e.forEach(h),this.h()},h(){y(r,"href","/"),y(r,"class","svelte-f3e4uo"),y(s,"class","svelte-f3e4uo"),y(v,"href","/about"),y(v,"class","svelte-f3e4uo"),y(f,"class","svelte-f3e4uo"),y(L,"href","/blogs"),y(L,"class","svelte-f3e4uo"),y(T,"class","svelte-f3e4uo"),y(_,"href","/talks"),y(_,"class","svelte-f3e4uo"),y(I,"class","svelte-f3e4uo"),y(B,"href","/notes"),y(B,"class","svelte-f3e4uo"),y(j,"class","svelte-f3e4uo"),y(P,"href","/newsletter"),y(P,"class","svelte-f3e4uo"),y(O,"class","svelte-f3e4uo"),y(U,"d","M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"),y(R,"viewBox","0 0 24 24"),y(R,"width","1em"),y(R,"height","1em"),y(R,"class","svelte-f3e4uo"),y(J,"aria-label","Twitter account"),y(J,"href","https://twitter.com/lihautan"),y(J,"class","svelte-f3e4uo"),y(W,"d","M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"),y(G,"viewBox","0 0 24 24"),y(G,"width","1em"),y(G,"height","1em"),y(G,"class","svelte-f3e4uo"),y(D,"aria-label","Github account"),y(D,"href","https://github.com/tanhauhau"),y(D,"class","svelte-f3e4uo"),y(z,"class","social svelte-f3e4uo"),y(a,"class","svelte-f3e4uo"),y(n,"class","svelte-f3e4uo")},m(t,e){u(t,n,e),l(n,o),l(o,a),l(a,s),l(s,r),l(r,c),l(a,i),l(a,f),l(f,v),l(v,A),l(a,x),l(a,T),l(T,L),l(L,N),l(a,M),l(a,I),l(I,_),l(_,k),l(a,S),l(a,j),l(j,B),l(B,H),l(a,F),l(a,O),l(O,P),l(P,q),l(a,C),l(a,z),l(z,J),l(J,R),l(R,U),l(z,V),l(z,D),l(D,G),l(G,W)},p:t,i:t,o:t,d(t){t&&h(n)}}}class Q extends Y{constructor(t){super(),W(this,t,null,K,r,{})}}function X(e){let n,o,a,s,r,c,i,f,m,v,A,T,L,N,M,I,_,k,S,j;return{c(){n=d("div"),o=d("h1"),a=p("Subscribe to my newsletter"),s=g(),r=d("h2"),c=p("Get the latest blog posts and project updates delivered right to your inbox"),i=g(),f=d("form"),m=d("div"),v=d("input"),A=g(),T=d("input"),N=g(),M=d("input"),I=g(),_=d("p"),k=p("Powered by Buttondown."),this.h()},l(t){n=b(t,"DIV",{class:!0});var e=$(n);o=b(e,"H1",{});var l=$(o);a=w(l,"Subscribe to my newsletter"),l.forEach(h),s=E(e),r=b(e,"H2",{class:!0});var u=$(r);c=w(u,"Get the latest blog posts and project updates delivered right to your inbox"),u.forEach(h),i=E(e),f=b(e,"FORM",{action:!0,method:!0,target:!0,onsubmit:!0,class:!0});var d=$(f);m=b(d,"DIV",{class:!0});var p=$(m);v=b(p,"INPUT",{type:!0,name:!0,id:!0,"aria-label":!0,placeholder:!0,class:!0}),A=E(p),T=b(p,"INPUT",{type:!0,value:!0,disabled:!0,class:!0}),p.forEach(h),N=E(d),M=b(d,"INPUT",{type:!0,value:!0,name:!0,class:!0}),I=E(d),_=b(d,"P",{class:!0});var g=$(_);k=w(g,"Powered by Buttondown."),g.forEach(h),d.forEach(h),e.forEach(h),this.h()},h(){y(r,"class","svelte-1k1s1co"),y(v,"type","email"),y(v,"name","email"),y(v,"id","bd-email"),y(v,"aria-label","email address"),y(v,"placeholder","youremail@example.com"),y(v,"class","svelte-1k1s1co"),y(T,"type","submit"),T.value="Subscribe",T.disabled=L=!e[0],y(T,"class","svelte-1k1s1co"),y(m,"class","form-item svelte-1k1s1co"),y(M,"type","hidden"),M.value="1",y(M,"name","embed"),y(M,"class","svelte-1k1s1co"),y(_,"class","svelte-1k1s1co"),y(f,"action","https://buttondown.email/api/emails/embed-subscribe/lihautan"),y(f,"method","post"),y(f,"target","popupwindow"),y(f,"onsubmit","window.open('https://buttondown.email/lihautan', 'popupwindow')"),y(f,"class","embeddable-buttondown-form"),y(n,"class","form svelte-1k1s1co")},m(t,h){var d,p,g,y;u(t,n,h),l(n,o),l(o,a),l(n,s),l(n,r),l(r,c),l(n,i),l(n,f),l(f,m),l(m,v),x(v,e[0]),l(m,A),l(m,T),l(f,N),l(f,M),l(f,I),l(f,_),l(_,k),S||(d=v,p="input",g=e[1],d.addEventListener(p,g,y),j=()=>d.removeEventListener(p,g,y),S=!0)},p(t,[e]){1&e&&v.value!==t[0]&&x(v,t[0]),1&e&&L!==(L=!t[0])&&(T.disabled=L)},i:t,o:t,d(t){t&&h(n),S=!1,j()}}}function Z(t,e,n){let o;return[o,function(){o=this.value,n(0,o)}]}class tt extends Y{constructor(t){super(),W(this,t,Z,X,r,{})}}function et(t){return M(()=>(setTimeout(()=>{if(window.innerWidth>1080){const t=document.createElement("script");t.async=!0,t.type="text/javascript",t.src="//cdn.carbonads.com/carbon.js?serve=CE7ITK3E&placement=lihautancom",t.id="_carbonads_js",document.body.appendChild(t)}},5e3),()=>{try{const t=document.getElementById("carbonads");t.parentNode.removeChild(t)}catch(t){}})),[]}class nt extends Y{constructor(t){super(),W(this,t,et,null,r,{})}}function ot(t,e,n){const o=t.slice();return o[6]=e[n],o}function at(t,e,n){const o=t.slice();return o[6]=e[n],o}function st(t){let e,n;return{c(){e=d("meta"),this.h()},l(t){e=b(t,"META",{name:!0,content:!0}),this.h()},h(){y(e,"name","keywords"),y(e,"content",n=t[6])},m(t,n){u(t,e,n)},p(t,o){4&o&&n!==(n=t[6])&&y(e,"content",n)},d(t){t&&h(e)}}}function rt(t){let e,n,o=t[6]+"";return{c(){e=d("span"),n=p(o),this.h()},l(t){e=b(t,"SPAN",{class:!0});var a=$(e);n=w(a,o),a.forEach(h),this.h()},h(){y(e,"class","svelte-9tqnza")},m(t,o){u(t,e,o),l(e,n)},p(t,e){4&e&&o!==(o=t[6]+"")&&A(n,o)},d(t){t&&h(e)}}}function ct(t){let e,n,o,a,s,r,m,x,L,N,M,I,_,k,S,j,B,H,F,O,P,q,C,G,W,Y,K,X,Z,et,ct,it,lt,ut,ht,ft,dt,mt,pt,gt=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Article",author:t[3],copyrightHolder:t[3],copyrightYear:"2020",creator:t[3],publisher:t[3],description:t[1],headline:t[0],name:t[0],inLanguage:"en"})}<\/script>`,vt=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",description:"Breadcrumbs list",name:"Breadcrumbs",itemListElement:[{"@type":"ListItem",item:{"@id":"https://lihautan.com",name:"Homepage"},position:1},{"@type":"ListItem",item:{"@id":"https%3A%2F%2Flihautan.com%2Fsynchronous-and-asyncrhonous-why-async-await",name:t[0]},position:2}]})}<\/script>`;document.title=e=t[0]+" | Tan Li Hau";let yt=t[2],$t=[];for(let e=0;e<yt.length;e+=1)$t[e]=st(at(t,yt,e));C=new Q({});let bt=t[2],wt=[];for(let e=0;e<bt.length;e+=1)wt[e]=rt(ot(t,bt,e));const Et=t[5].default,At=function(t,e,n,o){if(t){const a=c(t,e,n,o);return t[0](a)}}(Et,t,t[4],null);return lt=new tt({}),ht=new nt({}),{c(){n=d("meta"),o=d("meta"),a=d("meta"),s=d("meta"),r=d("meta"),m=d("meta"),x=d("meta"),L=d("meta"),N=d("meta"),M=d("meta"),I=d("meta");for(let t=0;t<$t.length;t+=1)$t[t].c();_=d("meta"),k=d("meta"),j=v(),H=v(),F=g(),O=d("a"),P=p("Skip to content"),q=g(),R(C.$$.fragment),G=g(),W=d("main"),Y=d("h1"),K=p(t[0]),X=g();for(let t=0;t<wt.length;t+=1)wt[t].c();Z=g(),et=d("article"),At&&At.c(),ct=g(),it=d("footer"),R(lt.$$.fragment),ut=g(),R(ht.$$.fragment),ft=g(),mt=v(),this.h()},l(e){const c=function(t,e=document.body){return Array.from(e.querySelectorAll(t))}('[data-svelte="svelte-n0q11s"]',document.head);n=b(c,"META",{name:!0,content:!0}),o=b(c,"META",{name:!0,content:!0}),a=b(c,"META",{name:!0,content:!0}),s=b(c,"META",{name:!0,content:!0}),r=b(c,"META",{name:!0,content:!0}),m=b(c,"META",{name:!0,content:!0}),x=b(c,"META",{name:!0,content:!0}),L=b(c,"META",{name:!0,content:!0}),N=b(c,"META",{name:!0,content:!0}),M=b(c,"META",{name:!0,content:!0}),I=b(c,"META",{name:!0,content:!0});for(let t=0;t<$t.length;t+=1)$t[t].l(c);_=b(c,"META",{itemprop:!0,content:!0}),k=b(c,"META",{itemprop:!0,content:!0}),j=v(),H=v(),c.forEach(h),F=E(e),O=b(e,"A",{href:!0,class:!0});var i=$(O);P=w(i,"Skip to content"),i.forEach(h),q=E(e),U(C.$$.fragment,e),G=E(e),W=b(e,"MAIN",{id:!0,class:!0});var l=$(W);Y=b(l,"H1",{});var u=$(Y);K=w(u,t[0]),u.forEach(h),X=E(l);for(let t=0;t<wt.length;t+=1)wt[t].l(l);Z=E(l),et=b(l,"ARTICLE",{});var f=$(et);At&&At.l(f),f.forEach(h),l.forEach(h),ct=E(e),it=b(e,"FOOTER",{class:!0});var d=$(it);U(lt.$$.fragment,d),ut=E(d),U(ht.$$.fragment,d),d.forEach(h),ft=E(e),mt=v(),this.h()},h(){y(n,"name","description"),y(n,"content",t[1]),y(o,"name","image"),y(o,"content",null),y(a,"name","og:image"),y(a,"content",null),y(s,"name","og:title"),y(s,"content",t[0]),y(r,"name","og:description"),y(r,"content",t[1]),y(m,"name","og:type"),y(m,"content","website"),y(x,"name","twitter:card"),y(x,"content","summary_large_image"),y(L,"name","twitter:creator"),y(L,"content","@lihautan"),y(N,"name","twitter:title"),y(N,"content",t[0]),y(M,"name","twitter:description"),y(M,"content",t[1]),y(I,"name","twitter:image"),y(I,"content",null),y(_,"itemprop","url"),y(_,"content","https%3A%2F%2Flihautan.com%2Fsynchronous-and-asyncrhonous-why-async-await"),y(k,"itemprop","image"),y(k,"content",null),S=new T(j),B=new T(H),y(O,"href","#content"),y(O,"class","skip svelte-9tqnza"),y(W,"id","content"),y(W,"class","blog svelte-9tqnza"),y(it,"class","svelte-9tqnza"),dt=new T(mt)},m(t,e){l(document.head,n),l(document.head,o),l(document.head,a),l(document.head,s),l(document.head,r),l(document.head,m),l(document.head,x),l(document.head,L),l(document.head,N),l(document.head,M),l(document.head,I);for(let t=0;t<$t.length;t+=1)$t[t].m(document.head,null);l(document.head,_),l(document.head,k),S.m(gt,document.head),l(document.head,j),B.m(vt,document.head),l(document.head,H),u(t,F,e),u(t,O,e),l(O,P),u(t,q,e),V(C,t,e),u(t,G,e),u(t,W,e),l(W,Y),l(Y,K),l(W,X);for(let t=0;t<wt.length;t+=1)wt[t].m(W,null);l(W,Z),l(W,et),At&&At.m(et,null),u(t,ct,e),u(t,it,e),V(lt,it,null),l(it,ut),V(ht,it,null),u(t,ft,e),dt.m('<script async defer src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>',t,e),u(t,mt,e),pt=!0},p(t,[o]){if((!pt||1&o)&&e!==(e=t[0]+" | Tan Li Hau")&&(document.title=e),(!pt||2&o)&&y(n,"content",t[1]),(!pt||1&o)&&y(s,"content",t[0]),(!pt||2&o)&&y(r,"content",t[1]),(!pt||1&o)&&y(N,"content",t[0]),(!pt||2&o)&&y(M,"content",t[1]),4&o){let e;for(yt=t[2],e=0;e<yt.length;e+=1){const n=at(t,yt,e);$t[e]?$t[e].p(n,o):($t[e]=st(n),$t[e].c(),$t[e].m(_.parentNode,_))}for(;e<$t.length;e+=1)$t[e].d(1);$t.length=yt.length}if((!pt||3&o)&&gt!==(gt=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Article",author:t[3],copyrightHolder:t[3],copyrightYear:"2020",creator:t[3],publisher:t[3],description:t[1],headline:t[0],name:t[0],inLanguage:"en"})}<\/script>`)&&S.p(gt),(!pt||1&o)&&vt!==(vt=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",description:"Breadcrumbs list",name:"Breadcrumbs",itemListElement:[{"@type":"ListItem",item:{"@id":"https://lihautan.com",name:"Homepage"},position:1},{"@type":"ListItem",item:{"@id":"https%3A%2F%2Flihautan.com%2Fsynchronous-and-asyncrhonous-why-async-await",name:t[0]},position:2}]})}<\/script>`)&&B.p(vt),(!pt||1&o)&&A(K,t[0]),4&o){let e;for(bt=t[2],e=0;e<bt.length;e+=1){const n=ot(t,bt,e);wt[e]?wt[e].p(n,o):(wt[e]=rt(n),wt[e].c(),wt[e].m(W,Z))}for(;e<wt.length;e+=1)wt[e].d(1);wt.length=bt.length}At&&At.p&&16&o&&i(At,Et,t,t[4],o,null,null)},i(t){pt||(z(C.$$.fragment,t),z(At,t),z(lt.$$.fragment,t),z(ht.$$.fragment,t),pt=!0)},o(t){J(C.$$.fragment,t),J(At,t),J(lt.$$.fragment,t),J(ht.$$.fragment,t),pt=!1},d(t){h(n),h(o),h(a),h(s),h(r),h(m),h(x),h(L),h(N),h(M),h(I),f($t,t),h(_),h(k),h(j),t&&S.d(),h(H),t&&B.d(),t&&h(F),t&&h(O),t&&h(q),D(C,t),t&&h(G),t&&h(W),f(wt,t),At&&At.d(t),t&&h(ct),t&&h(it),D(lt),D(ht),t&&h(ft),t&&h(mt),t&&dt.d()}}}function it(t,e,n){let{title:o=""}=e,{description:a=""}=e,{tags:s=[]}=e;const r={"@type":"Person",name:"Tan Li Hau"};let{$$slots:c={},$$scope:i}=e;return t.$set=t=>{"title"in t&&n(0,o=t.title),"description"in t&&n(1,a=t.description),"tags"in t&&n(2,s=t.tags),"$$scope"in t&&n(4,i=t.$$scope)},[o,a,s,r,i,c]}class lt extends Y{constructor(t){super(),W(this,t,it,ct,r,{title:0,description:1,tags:2})}}function ut(t){let n,o;const a=[ht];let s={};for(let t=0;t<a.length;t+=1)s=e(s,a[t]);return n=new lt({props:s}),{c(){R(n.$$.fragment)},l(t){U(n.$$.fragment,t)},m(t,e){V(n,t,e),o=!0},p(t,[e]){const o=0&e?function(t,e){const n={},o={},a={$$scope:1};let s=t.length;for(;s--;){const r=t[s],c=e[s];if(c){for(const t in r)t in c||(o[t]=1);for(const t in c)a[t]||(n[t]=c[t],a[t]=1);t[s]=c}else for(const t in r)a[t]=1}for(const t in o)t in n||(n[t]=void 0);return n}(a,[(s=ht,"object"==typeof s&&null!==s?s:{})]):{};var s;1&e&&(o.$$scope={dirty:e,ctx:t}),n.$set(o)},i(t){o||(z(n.$$.fragment,t),o=!0)},o(t){J(n.$$.fragment,t),o=!1},d(t){D(n,t)}}}const ht={title:"Synchronous and Asynchronous: why use async-await?",wip:!0,slug:"synchronous-and-asyncrhonous-why-async-await",type:"blog"};class ft extends Y{constructor(t){super(),W(this,t,null,ut,r,{})}}setTimeout(()=>{new ft({target:document.querySelector("#app"),hydrate:!0})},3e3);
