function t(){}function e(t,e){for(const n in e)t[n]=e[n];return t}function n(t){return t()}function o(){return Object.create(null)}function a(t){t.forEach(n)}function r(t){return"function"==typeof t}function s(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function c(t,n,o,a){return t[1]&&a?e(o.ctx.slice(),t[1](a(n))):o.ctx}function i(t,e,n,o,a,r,s){const i=function(t,e,n,o){if(t[2]&&o){const a=t[2](o(n));if(void 0===e.dirty)return a;if("object"==typeof a){const t=[],n=Math.max(e.dirty.length,a.length);for(let o=0;o<n;o+=1)t[o]=e.dirty[o]|a[o];return t}return e.dirty|a}return e.dirty}(e,o,a,r);if(i){const a=c(e,n,o,s);t.p(a,i)}}function l(t,e){t.appendChild(e)}function u(t,e,n){t.insertBefore(e,n||null)}function h(t){t.parentNode.removeChild(t)}function d(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}function f(t){return document.createElement(t)}function m(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function p(t){return document.createTextNode(t)}function g(){return p(" ")}function v(){return p("")}function b(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function y(t){return Array.from(t.childNodes)}function $(t,e,n,o){for(let o=0;o<t.length;o+=1){const a=t[o];if(a.nodeName===e){let e=0;const r=[];for(;e<a.attributes.length;){const t=a.attributes[e++];n[t.name]||r.push(t.name)}for(let t=0;t<r.length;t++)a.removeAttribute(r[t]);return t.splice(o,1)[0]}}return o?m(e):f(e)}function E(t,e){for(let n=0;n<t.length;n+=1){const o=t[n];if(3===o.nodeType)return o.data=""+e,t.splice(n,1)[0]}return p(e)}function w(t){return E(t," ")}function A(t,e){e=""+e,t.wholeText!==e&&(t.data=e)}function x(t,e){t.value=null==e?"":e}class T{constructor(t=null){this.a=t,this.e=this.n=null}m(t,e,n=null){this.e||(this.e=f(e.nodeName),this.t=e,this.h(t)),this.i(n)}h(t){this.e.innerHTML=t,this.n=Array.from(this.e.childNodes)}i(t){for(let e=0;e<this.n.length;e+=1)u(this.t,this.n[e],t)}p(t){this.d(),this.h(t),this.i(this.a)}d(){this.n.forEach(h)}}let L;function k(t){L=t}function I(t){(function(){if(!L)throw new Error("Function called outside component initialization");return L})().$$.on_mount.push(t)}const N=[],M=[],_=[],B=[],P=Promise.resolve();let S=!1;function j(t){_.push(t)}let H=!1;const F=new Set;function O(){if(!H){H=!0;do{for(let t=0;t<N.length;t+=1){const e=N[t];k(e),C(e.$$)}for(N.length=0;M.length;)M.pop()();for(let t=0;t<_.length;t+=1){const e=_[t];F.has(e)||(F.add(e),e())}_.length=0}while(N.length);for(;B.length;)B.pop()();S=!1,H=!1,F.clear()}}function C(t){if(null!==t.fragment){t.update(),a(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(j)}}const q=new Set;function z(t,e){t&&t.i&&(q.delete(t),t.i(e))}function U(t,e,n,o){if(t&&t.o){if(q.has(t))return;q.add(t),(void 0).c.push(()=>{q.delete(t),o&&(n&&t.d(1),o())}),t.o(e)}}function R(t){t&&t.c()}function J(t,e){t&&t.l(e)}function V(t,e,o){const{fragment:s,on_mount:c,on_destroy:i,after_update:l}=t.$$;s&&s.m(e,o),j(()=>{const e=c.map(n).filter(r);i?i.push(...e):a(e),t.$$.on_mount=[]}),l.forEach(j)}function D(t,e){const n=t.$$;null!==n.fragment&&(a(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function G(t,e){-1===t.$$.dirty[0]&&(N.push(t),S||(S=!0,P.then(O)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function W(e,n,r,s,c,i,l=[-1]){const u=L;k(e);const d=n.props||{},f=e.$$={fragment:null,ctx:null,props:i,update:t,not_equal:c,bound:o(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(u?u.$$.context:[]),callbacks:o(),dirty:l};let m=!1;if(f.ctx=r?r(e,d,(t,n,...o)=>{const a=o.length?o[0]:n;return f.ctx&&c(f.ctx[t],f.ctx[t]=a)&&(f.bound[t]&&f.bound[t](a),m&&G(e,t)),n}):[],f.update(),m=!0,a(f.before_update),f.fragment=!!s&&s(f.ctx),n.target){if(n.hydrate){const t=y(n.target);f.fragment&&f.fragment.l(t),t.forEach(h)}else f.fragment&&f.fragment.c();n.intro&&z(e.$$.fragment),V(e,n.target,n.anchor),O()}k(u)}class Y{$destroy(){D(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(){}}function K(e){let n,o,a,r,s,c,i,d,v,A,x,T,L,k,I,N,M,_,B,P,S,j,H,F,O,C,q,z,U,R,J,V,D,G,W;return{c(){n=f("header"),o=f("nav"),a=f("ul"),r=f("li"),s=f("a"),c=p("Tan Li Hau"),i=g(),d=f("li"),v=f("a"),A=p("About"),x=g(),T=f("li"),L=f("a"),k=p("Writings"),I=g(),N=f("li"),M=f("a"),_=p("Talks"),B=g(),P=f("li"),S=f("a"),j=p("Notes"),H=g(),F=f("li"),O=f("a"),C=p("Newsletter"),q=g(),z=f("li"),U=f("a"),R=m("svg"),J=m("path"),V=g(),D=f("a"),G=m("svg"),W=m("path"),this.h()},l(t){n=$(t,"HEADER",{class:!0});var e=y(n);o=$(e,"NAV",{});var l=y(o);a=$(l,"UL",{class:!0});var u=y(a);r=$(u,"LI",{class:!0});var f=y(r);s=$(f,"A",{href:!0,class:!0});var m=y(s);c=E(m,"Tan Li Hau"),m.forEach(h),f.forEach(h),i=w(u),d=$(u,"LI",{class:!0});var p=y(d);v=$(p,"A",{href:!0,class:!0});var g=y(v);A=E(g,"About"),g.forEach(h),p.forEach(h),x=w(u),T=$(u,"LI",{class:!0});var b=y(T);L=$(b,"A",{href:!0,class:!0});var Y=y(L);k=E(Y,"Writings"),Y.forEach(h),b.forEach(h),I=w(u),N=$(u,"LI",{class:!0});var K=y(N);M=$(K,"A",{href:!0,class:!0});var Q=y(M);_=E(Q,"Talks"),Q.forEach(h),K.forEach(h),B=w(u),P=$(u,"LI",{class:!0});var X=y(P);S=$(X,"A",{href:!0,class:!0});var Z=y(S);j=E(Z,"Notes"),Z.forEach(h),X.forEach(h),H=w(u),F=$(u,"LI",{class:!0});var tt=y(F);O=$(tt,"A",{href:!0,class:!0});var et=y(O);C=E(et,"Newsletter"),et.forEach(h),tt.forEach(h),q=w(u),z=$(u,"LI",{class:!0});var nt=y(z);U=$(nt,"A",{"aria-label":!0,href:!0,class:!0});var ot=y(U);R=$(ot,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var at=y(R);J=$(at,"path",{d:!0},1),y(J).forEach(h),at.forEach(h),ot.forEach(h),V=w(nt),D=$(nt,"A",{"aria-label":!0,href:!0,class:!0});var rt=y(D);G=$(rt,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var st=y(G);W=$(st,"path",{d:!0},1),y(W).forEach(h),st.forEach(h),rt.forEach(h),nt.forEach(h),u.forEach(h),l.forEach(h),e.forEach(h),this.h()},h(){b(s,"href","/"),b(s,"class","svelte-f3e4uo"),b(r,"class","svelte-f3e4uo"),b(v,"href","/about"),b(v,"class","svelte-f3e4uo"),b(d,"class","svelte-f3e4uo"),b(L,"href","/blogs"),b(L,"class","svelte-f3e4uo"),b(T,"class","svelte-f3e4uo"),b(M,"href","/talks"),b(M,"class","svelte-f3e4uo"),b(N,"class","svelte-f3e4uo"),b(S,"href","/notes"),b(S,"class","svelte-f3e4uo"),b(P,"class","svelte-f3e4uo"),b(O,"href","/newsletter"),b(O,"class","svelte-f3e4uo"),b(F,"class","svelte-f3e4uo"),b(J,"d","M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"),b(R,"viewBox","0 0 24 24"),b(R,"width","1em"),b(R,"height","1em"),b(R,"class","svelte-f3e4uo"),b(U,"aria-label","Twitter account"),b(U,"href","https://twitter.com/lihautan"),b(U,"class","svelte-f3e4uo"),b(W,"d","M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"),b(G,"viewBox","0 0 24 24"),b(G,"width","1em"),b(G,"height","1em"),b(G,"class","svelte-f3e4uo"),b(D,"aria-label","Github account"),b(D,"href","https://github.com/tanhauhau"),b(D,"class","svelte-f3e4uo"),b(z,"class","social svelte-f3e4uo"),b(a,"class","svelte-f3e4uo"),b(n,"class","svelte-f3e4uo")},m(t,e){u(t,n,e),l(n,o),l(o,a),l(a,r),l(r,s),l(s,c),l(a,i),l(a,d),l(d,v),l(v,A),l(a,x),l(a,T),l(T,L),l(L,k),l(a,I),l(a,N),l(N,M),l(M,_),l(a,B),l(a,P),l(P,S),l(S,j),l(a,H),l(a,F),l(F,O),l(O,C),l(a,q),l(a,z),l(z,U),l(U,R),l(R,J),l(z,V),l(z,D),l(D,G),l(G,W)},p:t,i:t,o:t,d(t){t&&h(n)}}}class Q extends Y{constructor(t){super(),W(this,t,null,K,s,{})}}function X(e){let n,o,a,r,s,c,i,d,m,v,A,T,L,k,I,N,M,_,B,P;return{c(){n=f("div"),o=f("h1"),a=p("Subscribe to my newsletter"),r=g(),s=f("h2"),c=p("Get the latest blog posts and project updates delivered right to your inbox"),i=g(),d=f("form"),m=f("div"),v=f("input"),A=g(),T=f("input"),k=g(),I=f("input"),N=g(),M=f("p"),_=p("Powered by Buttondown."),this.h()},l(t){n=$(t,"DIV",{class:!0});var e=y(n);o=$(e,"H1",{});var l=y(o);a=E(l,"Subscribe to my newsletter"),l.forEach(h),r=w(e),s=$(e,"H2",{class:!0});var u=y(s);c=E(u,"Get the latest blog posts and project updates delivered right to your inbox"),u.forEach(h),i=w(e),d=$(e,"FORM",{action:!0,method:!0,target:!0,onsubmit:!0,class:!0});var f=y(d);m=$(f,"DIV",{class:!0});var p=y(m);v=$(p,"INPUT",{type:!0,name:!0,id:!0,"aria-label":!0,placeholder:!0,class:!0}),A=w(p),T=$(p,"INPUT",{type:!0,value:!0,disabled:!0,class:!0}),p.forEach(h),k=w(f),I=$(f,"INPUT",{type:!0,value:!0,name:!0,class:!0}),N=w(f),M=$(f,"P",{class:!0});var g=y(M);_=E(g,"Powered by Buttondown."),g.forEach(h),f.forEach(h),e.forEach(h),this.h()},h(){b(s,"class","svelte-1k1s1co"),b(v,"type","email"),b(v,"name","email"),b(v,"id","bd-email"),b(v,"aria-label","email address"),b(v,"placeholder","youremail@example.com"),b(v,"class","svelte-1k1s1co"),b(T,"type","submit"),T.value="Subscribe",T.disabled=L=!e[0],b(T,"class","svelte-1k1s1co"),b(m,"class","form-item svelte-1k1s1co"),b(I,"type","hidden"),I.value="1",b(I,"name","embed"),b(I,"class","svelte-1k1s1co"),b(M,"class","svelte-1k1s1co"),b(d,"action","https://buttondown.email/api/emails/embed-subscribe/lihautan"),b(d,"method","post"),b(d,"target","popupwindow"),b(d,"onsubmit","window.open('https://buttondown.email/lihautan', 'popupwindow')"),b(d,"class","embeddable-buttondown-form"),b(n,"class","form svelte-1k1s1co")},m(t,h){var f,p,g,b;u(t,n,h),l(n,o),l(o,a),l(n,r),l(n,s),l(s,c),l(n,i),l(n,d),l(d,m),l(m,v),x(v,e[0]),l(m,A),l(m,T),l(d,k),l(d,I),l(d,N),l(d,M),l(M,_),B||(f=v,p="input",g=e[1],f.addEventListener(p,g,b),P=()=>f.removeEventListener(p,g,b),B=!0)},p(t,[e]){1&e&&v.value!==t[0]&&x(v,t[0]),1&e&&L!==(L=!t[0])&&(T.disabled=L)},i:t,o:t,d(t){t&&h(n),B=!1,P()}}}function Z(t,e,n){let o;return[o,function(){o=this.value,n(0,o)}]}class tt extends Y{constructor(t){super(),W(this,t,Z,X,s,{})}}function et(t){return I(()=>(setTimeout(()=>{if(window.innerWidth>1080){const t=document.createElement("script");t.async=!0,t.type="text/javascript",t.src="//cdn.carbonads.com/carbon.js?serve=CE7ITK3E&placement=lihautancom",t.id="_carbonads_js",document.body.appendChild(t)}},5e3),()=>{try{const t=document.getElementById("carbonads");t.parentNode.removeChild(t)}catch(t){}})),[]}class nt extends Y{constructor(t){super(),W(this,t,et,null,s,{})}}function ot(t,e,n){const o=t.slice();return o[6]=e[n],o}function at(t,e,n){const o=t.slice();return o[6]=e[n],o}function rt(t){let e,n;return{c(){e=f("meta"),this.h()},l(t){e=$(t,"META",{name:!0,content:!0}),this.h()},h(){b(e,"name","keywords"),b(e,"content",n=t[6])},m(t,n){u(t,e,n)},p(t,o){4&o&&n!==(n=t[6])&&b(e,"content",n)},d(t){t&&h(e)}}}function st(t){let e,n,o=t[6]+"";return{c(){e=f("span"),n=p(o),this.h()},l(t){e=$(t,"SPAN",{class:!0});var a=y(e);n=E(a,o),a.forEach(h),this.h()},h(){b(e,"class","svelte-9tqnza")},m(t,o){u(t,e,o),l(e,n)},p(t,e){4&e&&o!==(o=t[6]+"")&&A(n,o)},d(t){t&&h(e)}}}function ct(t){let e,n,o,a,r,s,m,x,L,k,I,N,M,_,B,P,S,j,H,F,O,C,q,G,W,Y,K,X,Z,et,ct,it,lt,ut,ht,dt,ft,mt,pt,gt=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Article",author:t[3],copyrightHolder:t[3],copyrightYear:"2020",creator:t[3],publisher:t[3],description:t[1],headline:t[0],name:t[0],inLanguage:"en"})}<\/script>`,vt=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",description:"Breadcrumbs list",name:"Breadcrumbs",itemListElement:[{"@type":"ListItem",item:{"@id":"https://lihautan.com",name:"Homepage"},position:1},{"@type":"ListItem",item:{"@id":"https%3A%2F%2Flihautan.com%2Fread-the-source-code-of-your-node-modules",name:t[0]},position:2}]})}<\/script>`;document.title=e=t[0]+" | Tan Li Hau";let bt=t[2],yt=[];for(let e=0;e<bt.length;e+=1)yt[e]=rt(at(t,bt,e));q=new Q({});let $t=t[2],Et=[];for(let e=0;e<$t.length;e+=1)Et[e]=st(ot(t,$t,e));const wt=t[5].default,At=function(t,e,n,o){if(t){const a=c(t,e,n,o);return t[0](a)}}(wt,t,t[4],null);return lt=new tt({}),ht=new nt({}),{c(){n=f("meta"),o=f("meta"),a=f("meta"),r=f("meta"),s=f("meta"),m=f("meta"),x=f("meta"),L=f("meta"),k=f("meta"),I=f("meta"),N=f("meta");for(let t=0;t<yt.length;t+=1)yt[t].c();M=f("meta"),_=f("meta"),P=v(),j=v(),H=g(),F=f("a"),O=p("Skip to content"),C=g(),R(q.$$.fragment),G=g(),W=f("main"),Y=f("h1"),K=p(t[0]),X=g();for(let t=0;t<Et.length;t+=1)Et[t].c();Z=g(),et=f("article"),At&&At.c(),ct=g(),it=f("footer"),R(lt.$$.fragment),ut=g(),R(ht.$$.fragment),dt=g(),mt=v(),this.h()},l(e){const c=function(t,e=document.body){return Array.from(e.querySelectorAll(t))}('[data-svelte="svelte-n0q11s"]',document.head);n=$(c,"META",{name:!0,content:!0}),o=$(c,"META",{name:!0,content:!0}),a=$(c,"META",{name:!0,content:!0}),r=$(c,"META",{name:!0,content:!0}),s=$(c,"META",{name:!0,content:!0}),m=$(c,"META",{name:!0,content:!0}),x=$(c,"META",{name:!0,content:!0}),L=$(c,"META",{name:!0,content:!0}),k=$(c,"META",{name:!0,content:!0}),I=$(c,"META",{name:!0,content:!0}),N=$(c,"META",{name:!0,content:!0});for(let t=0;t<yt.length;t+=1)yt[t].l(c);M=$(c,"META",{itemprop:!0,content:!0}),_=$(c,"META",{itemprop:!0,content:!0}),P=v(),j=v(),c.forEach(h),H=w(e),F=$(e,"A",{href:!0,class:!0});var i=y(F);O=E(i,"Skip to content"),i.forEach(h),C=w(e),J(q.$$.fragment,e),G=w(e),W=$(e,"MAIN",{id:!0,class:!0});var l=y(W);Y=$(l,"H1",{});var u=y(Y);K=E(u,t[0]),u.forEach(h),X=w(l);for(let t=0;t<Et.length;t+=1)Et[t].l(l);Z=w(l),et=$(l,"ARTICLE",{});var d=y(et);At&&At.l(d),d.forEach(h),l.forEach(h),ct=w(e),it=$(e,"FOOTER",{class:!0});var f=y(it);J(lt.$$.fragment,f),ut=w(f),J(ht.$$.fragment,f),f.forEach(h),dt=w(e),mt=v(),this.h()},h(){b(n,"name","description"),b(n,"content",t[1]),b(o,"name","image"),b(o,"content",null),b(a,"name","og:image"),b(a,"content",null),b(r,"name","og:title"),b(r,"content",t[0]),b(s,"name","og:description"),b(s,"content",t[1]),b(m,"name","og:type"),b(m,"content","website"),b(x,"name","twitter:card"),b(x,"content","summary_large_image"),b(L,"name","twitter:creator"),b(L,"content","@lihautan"),b(k,"name","twitter:title"),b(k,"content",t[0]),b(I,"name","twitter:description"),b(I,"content",t[1]),b(N,"name","twitter:image"),b(N,"content",null),b(M,"itemprop","url"),b(M,"content","https%3A%2F%2Flihautan.com%2Fread-the-source-code-of-your-node-modules"),b(_,"itemprop","image"),b(_,"content",null),B=new T(P),S=new T(j),b(F,"href","#content"),b(F,"class","skip svelte-9tqnza"),b(W,"id","content"),b(W,"class","blog svelte-9tqnza"),b(it,"class","svelte-9tqnza"),ft=new T(mt)},m(t,e){l(document.head,n),l(document.head,o),l(document.head,a),l(document.head,r),l(document.head,s),l(document.head,m),l(document.head,x),l(document.head,L),l(document.head,k),l(document.head,I),l(document.head,N);for(let t=0;t<yt.length;t+=1)yt[t].m(document.head,null);l(document.head,M),l(document.head,_),B.m(gt,document.head),l(document.head,P),S.m(vt,document.head),l(document.head,j),u(t,H,e),u(t,F,e),l(F,O),u(t,C,e),V(q,t,e),u(t,G,e),u(t,W,e),l(W,Y),l(Y,K),l(W,X);for(let t=0;t<Et.length;t+=1)Et[t].m(W,null);l(W,Z),l(W,et),At&&At.m(et,null),u(t,ct,e),u(t,it,e),V(lt,it,null),l(it,ut),V(ht,it,null),u(t,dt,e),ft.m('<script async defer src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>',t,e),u(t,mt,e),pt=!0},p(t,[o]){if((!pt||1&o)&&e!==(e=t[0]+" | Tan Li Hau")&&(document.title=e),(!pt||2&o)&&b(n,"content",t[1]),(!pt||1&o)&&b(r,"content",t[0]),(!pt||2&o)&&b(s,"content",t[1]),(!pt||1&o)&&b(k,"content",t[0]),(!pt||2&o)&&b(I,"content",t[1]),4&o){let e;for(bt=t[2],e=0;e<bt.length;e+=1){const n=at(t,bt,e);yt[e]?yt[e].p(n,o):(yt[e]=rt(n),yt[e].c(),yt[e].m(M.parentNode,M))}for(;e<yt.length;e+=1)yt[e].d(1);yt.length=bt.length}if((!pt||3&o)&&gt!==(gt=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"Article",author:t[3],copyrightHolder:t[3],copyrightYear:"2020",creator:t[3],publisher:t[3],description:t[1],headline:t[0],name:t[0],inLanguage:"en"})}<\/script>`)&&B.p(gt),(!pt||1&o)&&vt!==(vt=`<script type="application/ld+json">${JSON.stringify({"@context":"https://schema.org","@type":"BreadcrumbList",description:"Breadcrumbs list",name:"Breadcrumbs",itemListElement:[{"@type":"ListItem",item:{"@id":"https://lihautan.com",name:"Homepage"},position:1},{"@type":"ListItem",item:{"@id":"https%3A%2F%2Flihautan.com%2Fread-the-source-code-of-your-node-modules",name:t[0]},position:2}]})}<\/script>`)&&S.p(vt),(!pt||1&o)&&A(K,t[0]),4&o){let e;for($t=t[2],e=0;e<$t.length;e+=1){const n=ot(t,$t,e);Et[e]?Et[e].p(n,o):(Et[e]=st(n),Et[e].c(),Et[e].m(W,Z))}for(;e<Et.length;e+=1)Et[e].d(1);Et.length=$t.length}At&&At.p&&16&o&&i(At,wt,t,t[4],o,null,null)},i(t){pt||(z(q.$$.fragment,t),z(At,t),z(lt.$$.fragment,t),z(ht.$$.fragment,t),pt=!0)},o(t){U(q.$$.fragment,t),U(At,t),U(lt.$$.fragment,t),U(ht.$$.fragment,t),pt=!1},d(t){h(n),h(o),h(a),h(r),h(s),h(m),h(x),h(L),h(k),h(I),h(N),d(yt,t),h(M),h(_),h(P),t&&B.d(),h(j),t&&S.d(),t&&h(H),t&&h(F),t&&h(C),D(q,t),t&&h(G),t&&h(W),d(Et,t),At&&At.d(t),t&&h(ct),t&&h(it),D(lt),D(ht),t&&h(dt),t&&h(mt),t&&ft.d()}}}function it(t,e,n){let{title:o=""}=e,{description:a=""}=e,{tags:r=[]}=e;const s={"@type":"Person",name:"Tan Li Hau"};let{$$slots:c={},$$scope:i}=e;return t.$set=t=>{"title"in t&&n(0,o=t.title),"description"in t&&n(1,a=t.description),"tags"in t&&n(2,r=t.tags),"$$scope"in t&&n(4,i=t.$$scope)},[o,a,r,s,i,c]}class lt extends Y{constructor(t){super(),W(this,t,it,ct,s,{title:0,description:1,tags:2})}}function ut(t){let e,n,o,a,r,s,c,i,d,m,v,A,x,T,L,k,I,N,M,_,B,P,S;return{c(){e=f("ol"),n=f("li"),o=p("Understand the root cause"),a=g(),r=f("p"),s=p("spelunking in node modules"),c=g(),i=f("p"),d=f("a"),m=p("https://kentcdodds.com/blog/spelunking-in-node-modules"),v=g(),A=f("ol"),x=f("li"),T=f("p"),L=p("Provide you a bigger picture\ni do this and that because somehow my lib1 behaves this way"),k=g(),I=f("li"),N=f("p"),M=p("Be a better developer"),_=g(),B=f("li"),P=f("p"),S=p("Code never lies, documentation might"),this.h()},l(t){e=$(t,"OL",{});var l=y(e);n=$(l,"LI",{});var u=y(n);o=E(u,"Understand the root cause"),u.forEach(h),l.forEach(h),a=w(t),r=$(t,"P",{});var f=y(r);s=E(f,"spelunking in node modules"),f.forEach(h),c=w(t),i=$(t,"P",{});var p=y(i);d=$(p,"A",{href:!0,rel:!0});var g=y(d);m=E(g,"https://kentcdodds.com/blog/spelunking-in-node-modules"),g.forEach(h),p.forEach(h),v=w(t),A=$(t,"OL",{start:!0});var b=y(A);x=$(b,"LI",{});var j=y(x);T=$(j,"P",{});var H=y(T);L=E(H,"Provide you a bigger picture\ni do this and that because somehow my lib1 behaves this way"),H.forEach(h),j.forEach(h),k=w(b),I=$(b,"LI",{});var F=y(I);N=$(F,"P",{});var O=y(N);M=E(O,"Be a better developer"),O.forEach(h),F.forEach(h),_=w(b),B=$(b,"LI",{});var C=y(B);P=$(C,"P",{});var q=y(P);S=E(q,"Code never lies, documentation might"),q.forEach(h),C.forEach(h),b.forEach(h),this.h()},h(){b(d,"href","https://kentcdodds.com/blog/spelunking-in-node-modules"),b(d,"rel","nofollow"),b(A,"start","2")},m(t,h){u(t,e,h),l(e,n),l(n,o),u(t,a,h),u(t,r,h),l(r,s),u(t,c,h),u(t,i,h),l(i,d),l(d,m),u(t,v,h),u(t,A,h),l(A,x),l(x,T),l(T,L),l(A,k),l(A,I),l(I,N),l(N,M),l(A,_),l(A,B),l(B,P),l(P,S)},d(t){t&&h(e),t&&h(a),t&&h(r),t&&h(c),t&&h(i),t&&h(v),t&&h(A)}}}function ht(t){let n,o;const a=[dt];let r={$$slots:{default:[ut]},$$scope:{ctx:t}};for(let t=0;t<a.length;t+=1)r=e(r,a[t]);return n=new lt({props:r}),{c(){R(n.$$.fragment)},l(t){J(n.$$.fragment,t)},m(t,e){V(n,t,e),o=!0},p(t,[e]){const o=0&e?function(t,e){const n={},o={},a={$$scope:1};let r=t.length;for(;r--;){const s=t[r],c=e[r];if(c){for(const t in s)t in c||(o[t]=1);for(const t in c)a[t]||(n[t]=c[t],a[t]=1);t[r]=c}else for(const t in s)a[t]=1}for(const t in o)t in n||(n[t]=void 0);return n}(a,[(r=dt,"object"==typeof r&&null!==r?r:{})]):{};var r;1&e&&(o.$$scope={dirty:e,ctx:t}),n.$set(o)},i(t){o||(z(n.$$.fragment,t),o=!0)},o(t){U(n.$$.fragment,t),o=!1},d(t){D(n,t)}}}const dt={title:"Read the source code of your node_modules",wip:!0,slug:"read-the-source-code-of-your-node-modules",type:"blog"};class ft extends Y{constructor(t){super(),W(this,t,null,ht,s,{})}}setTimeout(()=>{new ft({target:document.querySelector("#app"),hydrate:!0})},3e3);
