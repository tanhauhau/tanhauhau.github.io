function n(){}function t(n,t){for(const a in t)n[a]=t[a];return n}function a(n){return n()}function s(){return Object.create(null)}function e(n){n.forEach(a)}function o(n){return"function"==typeof n}function c(n,t){return n!=n?t==t:n!==t||n&&"object"==typeof n||"function"==typeof n}function l(n,a,s,e){return n[1]&&e?t(s.ctx.slice(),n[1](e(a))):s.ctx}function r(n,t,a,s,e,o,c){const r=function(n,t,a,s){if(n[2]&&s){const e=n[2](s(a));if(void 0===t.dirty)return e;if("object"==typeof e){const n=[],a=Math.max(t.dirty.length,e.length);for(let s=0;s<a;s+=1)n[s]=t.dirty[s]|e[s];return n}return t.dirty|e}return t.dirty}(t,s,e,o);if(r){const e=l(t,a,s,c);n.p(e,r)}}function p(n,t){n.appendChild(t)}function u(n,t,a){n.insertBefore(t,a||null)}function i(n){n.parentNode.removeChild(n)}function f(n,t){for(let a=0;a<n.length;a+=1)n[a]&&n[a].d(t)}function h(n){return document.createElement(n)}function d(n){return document.createElementNS("http://www.w3.org/2000/svg",n)}function m(n){return document.createTextNode(n)}function g(){return m(" ")}function k(n,t,a){null==a?n.removeAttribute(t):n.getAttribute(t)!==a&&n.setAttribute(t,a)}function v(n){return Array.from(n.childNodes)}function y(n,t,a,s){for(let s=0;s<n.length;s+=1){const e=n[s];if(e.nodeName===t){let t=0;const o=[];for(;t<e.attributes.length;){const n=e.attributes[t++];a[n.name]||o.push(n.name)}for(let n=0;n<o.length;n++)e.removeAttribute(o[n]);return n.splice(s,1)[0]}}return s?d(t):h(t)}function $(n,t){for(let a=0;a<n.length;a+=1){const s=n[a];if(3===s.nodeType)return s.data=""+t,n.splice(a,1)[0]}return m(t)}function E(n){return $(n," ")}function b(n,t){t=""+t,n.wholeText!==t&&(n.data=t)}let A;function w(n){A=n}const x=[],T=[],L=[],N=[],S=Promise.resolve();let I=!1;function M(n){L.push(n)}let _=!1;const C=new Set;function z(){if(!_){_=!0;do{for(let n=0;n<x.length;n+=1){const t=x[n];w(t),H(t.$$)}for(x.length=0;T.length;)T.pop()();for(let n=0;n<L.length;n+=1){const t=L[n];C.has(t)||(C.add(t),t())}L.length=0}while(x.length);for(;N.length;)N.pop()();I=!1,_=!1,C.clear()}}function H(n){if(null!==n.fragment){n.update(),e(n.before_update);const t=n.dirty;n.dirty=[-1],n.fragment&&n.fragment.p(n.ctx,t),n.after_update.forEach(M)}}const j=new Set;function P(n,t){n&&n.i&&(j.delete(n),n.i(t))}function q(n,t,a,s){if(n&&n.o){if(j.has(n))return;j.add(n),(void 0).c.push(()=>{j.delete(n),s&&(a&&n.d(1),s())}),n.o(t)}}function B(n){n&&n.c()}function F(n,t){n&&n.l(t)}function O(n,t,s){const{fragment:c,on_mount:l,on_destroy:r,after_update:p}=n.$$;c&&c.m(t,s),M(()=>{const t=l.map(a).filter(o);r?r.push(...t):e(t),n.$$.on_mount=[]}),p.forEach(M)}function R(n,t){const a=n.$$;null!==a.fragment&&(e(a.on_destroy),a.fragment&&a.fragment.d(t),a.on_destroy=a.fragment=null,a.ctx=[])}function U(n,t){-1===n.$$.dirty[0]&&(x.push(n),I||(I=!0,S.then(z)),n.$$.dirty.fill(0)),n.$$.dirty[t/31|0]|=1<<t%31}function V(t,a,o,c,l,r,p=[-1]){const u=A;w(t);const f=a.props||{},h=t.$$={fragment:null,ctx:null,props:r,update:n,not_equal:l,bound:s(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(u?u.$$.context:[]),callbacks:s(),dirty:p};let d=!1;if(h.ctx=o?o(t,f,(n,a,...s)=>{const e=s.length?s[0]:a;return h.ctx&&l(h.ctx[n],h.ctx[n]=e)&&(h.bound[n]&&h.bound[n](e),d&&U(t,n)),a}):[],h.update(),d=!0,e(h.before_update),h.fragment=!!c&&c(h.ctx),a.target){if(a.hydrate){const n=v(a.target);h.fragment&&h.fragment.l(n),n.forEach(i)}else h.fragment&&h.fragment.c();a.intro&&P(t.$$.fragment),O(t,a.target,a.anchor),z()}w(u)}class W{$destroy(){R(this,1),this.$destroy=n}$on(n,t){const a=this.$$.callbacks[n]||(this.$$.callbacks[n]=[]);return a.push(t),()=>{const n=a.indexOf(t);-1!==n&&a.splice(n,1)}}$set(){}}function D(t){let a,s,e,o,c,l,r,f,b,A,w,x,T,L,N,S,I,M,_,C,z,H,j,P,q,B,F,O,R,U,V,W,D,G,K;return{c(){a=h("header"),s=h("nav"),e=h("ul"),o=h("li"),c=h("a"),l=m("Tan Li Hau"),r=g(),f=h("li"),b=h("a"),A=m("About"),w=g(),x=h("li"),T=h("a"),L=m("Writings"),N=g(),S=h("li"),I=h("a"),M=m("Talks"),_=g(),C=h("li"),z=h("a"),H=m("Notes"),j=g(),P=h("li"),q=h("a"),B=m("Newsletter"),F=g(),O=h("li"),R=h("a"),U=d("svg"),V=d("path"),W=g(),D=h("a"),G=d("svg"),K=d("path"),this.h()},l(n){a=y(n,"HEADER",{class:!0});var t=v(a);s=y(t,"NAV",{});var p=v(s);e=y(p,"UL",{class:!0});var u=v(e);o=y(u,"LI",{class:!0});var h=v(o);c=y(h,"A",{href:!0,class:!0});var d=v(c);l=$(d,"Tan Li Hau"),d.forEach(i),h.forEach(i),r=E(u),f=y(u,"LI",{class:!0});var m=v(f);b=y(m,"A",{href:!0,class:!0});var g=v(b);A=$(g,"About"),g.forEach(i),m.forEach(i),w=E(u),x=y(u,"LI",{class:!0});var k=v(x);T=y(k,"A",{href:!0,class:!0});var Y=v(T);L=$(Y,"Writings"),Y.forEach(i),k.forEach(i),N=E(u),S=y(u,"LI",{class:!0});var J=v(S);I=y(J,"A",{href:!0,class:!0});var Q=v(I);M=$(Q,"Talks"),Q.forEach(i),J.forEach(i),_=E(u),C=y(u,"LI",{class:!0});var X=v(C);z=y(X,"A",{href:!0,class:!0});var Z=v(z);H=$(Z,"Notes"),Z.forEach(i),X.forEach(i),j=E(u),P=y(u,"LI",{class:!0});var nn=v(P);q=y(nn,"A",{href:!0,class:!0});var tn=v(q);B=$(tn,"Newsletter"),tn.forEach(i),nn.forEach(i),F=E(u),O=y(u,"LI",{class:!0});var an=v(O);R=y(an,"A",{"aria-label":!0,href:!0,class:!0});var sn=v(R);U=y(sn,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var en=v(U);V=y(en,"path",{d:!0},1),v(V).forEach(i),en.forEach(i),sn.forEach(i),W=E(an),D=y(an,"A",{"aria-label":!0,href:!0,class:!0});var on=v(D);G=y(on,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var cn=v(G);K=y(cn,"path",{d:!0},1),v(K).forEach(i),cn.forEach(i),on.forEach(i),an.forEach(i),u.forEach(i),p.forEach(i),t.forEach(i),this.h()},h(){k(c,"href","/"),k(c,"class","svelte-f3e4uo"),k(o,"class","svelte-f3e4uo"),k(b,"href","/about"),k(b,"class","svelte-f3e4uo"),k(f,"class","svelte-f3e4uo"),k(T,"href","/blogs"),k(T,"class","svelte-f3e4uo"),k(x,"class","svelte-f3e4uo"),k(I,"href","/talks"),k(I,"class","svelte-f3e4uo"),k(S,"class","svelte-f3e4uo"),k(z,"href","/notes"),k(z,"class","svelte-f3e4uo"),k(C,"class","svelte-f3e4uo"),k(q,"href","/newsletter"),k(q,"class","svelte-f3e4uo"),k(P,"class","svelte-f3e4uo"),k(V,"d","M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"),k(U,"viewBox","0 0 24 24"),k(U,"width","1em"),k(U,"height","1em"),k(U,"class","svelte-f3e4uo"),k(R,"aria-label","Twitter account"),k(R,"href","https://twitter.com/lihautan"),k(R,"class","svelte-f3e4uo"),k(K,"d","M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"),k(G,"viewBox","0 0 24 24"),k(G,"width","1em"),k(G,"height","1em"),k(G,"class","svelte-f3e4uo"),k(D,"aria-label","Github account"),k(D,"href","https://github.com/tanhauhau"),k(D,"class","svelte-f3e4uo"),k(O,"class","social svelte-f3e4uo"),k(e,"class","svelte-f3e4uo"),k(a,"class","svelte-f3e4uo")},m(n,t){u(n,a,t),p(a,s),p(s,e),p(e,o),p(o,c),p(c,l),p(e,r),p(e,f),p(f,b),p(b,A),p(e,w),p(e,x),p(x,T),p(T,L),p(e,N),p(e,S),p(S,I),p(I,M),p(e,_),p(e,C),p(C,z),p(z,H),p(e,j),p(e,P),p(P,q),p(q,B),p(e,F),p(e,O),p(O,R),p(R,U),p(U,V),p(O,W),p(O,D),p(D,G),p(G,K)},p:n,i:n,o:n,d(n){n&&i(a)}}}class G extends W{constructor(n){super(),V(this,n,null,D,c,{})}}function K(n,t,a){const s=n.slice();return s[6]=t[a],s}function Y(n,t,a){const s=n.slice();return s[6]=t[a],s}function J(n){let t,a;return{c(){t=h("meta"),this.h()},l(n){t=y(n,"META",{name:!0,content:!0}),this.h()},h(){k(t,"name","keywords"),k(t,"content",a=n[6])},m(n,a){u(n,t,a)},p(n,s){4&s&&a!==(a=n[6])&&k(t,"content",a)},d(n){n&&i(t)}}}function Q(n){let t,a,s=n[6]+"";return{c(){t=h("span"),a=m(s),this.h()},l(n){t=y(n,"SPAN",{class:!0});var e=v(t);a=$(e,s),e.forEach(i),this.h()},h(){k(t,"class","svelte-186dllz")},m(n,s){u(n,t,s),p(t,a)},p(n,t){4&t&&s!==(s=n[6]+"")&&b(a,s)},d(n){n&&i(t)}}}function X(n){let t,a,s,e,o,c,d,A,w,x,T,L,N,S,I,M,_,C;document.title=t="Note: "+n[1]+" | Tan Li Hau";let z=n[2],H=[];for(let t=0;t<z.length;t+=1)H[t]=J(Y(n,z,t));x=new G({});let j=n[2],U=[];for(let t=0;t<j.length;t+=1)U[t]=Q(K(n,j,t));const V=n[4].default,W=function(n,t,a,s){if(n){const e=l(n,t,a,s);return n[0](e)}}(V,n,n[3],null);return{c(){a=h("link"),s=h("meta"),e=h("meta");for(let n=0;n<H.length;n+=1)H[n].c();o=h("meta"),c=g(),d=h("a"),A=m("Skip to content"),w=g(),B(x.$$.fragment),T=g(),L=h("main"),N=h("h1"),S=m(n[1]),I=g();for(let n=0;n<U.length;n+=1)U[n].c();M=g(),_=h("article"),W&&W.c(),this.h()},l(t){const l=function(n,t=document.body){return Array.from(t.querySelectorAll(n))}('[data-svelte="svelte-ywf7m8"]',document.head);a=y(l,"LINK",{href:!0,rel:!0}),s=y(l,"META",{name:!0,content:!0}),e=y(l,"META",{name:!0,content:!0});for(let n=0;n<H.length;n+=1)H[n].l(l);o=y(l,"META",{itemprop:!0,content:!0}),l.forEach(i),c=E(t),d=y(t,"A",{href:!0,class:!0});var r=v(d);A=$(r,"Skip to content"),r.forEach(i),w=E(t),F(x.$$.fragment,t),T=E(t),L=y(t,"MAIN",{id:!0,class:!0});var p=v(L);N=y(p,"H1",{});var u=v(N);S=$(u,n[1]),u.forEach(i),I=E(p);for(let n=0;n<U.length;n+=1)U[n].l(p);M=E(p),_=y(p,"ARTICLE",{class:!0});var f=v(_);W&&W.l(f),f.forEach(i),p.forEach(i),this.h()},h(){k(a,"href","https://lihautan.com/notes/css-houdini/assets/blog-base-967d71e9.css"),k(a,"rel","stylesheet"),k(s,"name","og:title"),k(s,"content",n[0]),k(e,"name","og:type"),k(e,"content","website"),k(o,"itemprop","url"),k(o,"content","https%3A%2F%2Flihautan.com%2Fnotes%2Fcss-houdini"),k(d,"href","#content"),k(d,"class","skip svelte-186dllz"),k(_,"class","svelte-186dllz"),k(L,"id","content"),k(L,"class","blog svelte-186dllz")},m(n,t){p(document.head,a),p(document.head,s),p(document.head,e);for(let n=0;n<H.length;n+=1)H[n].m(document.head,null);p(document.head,o),u(n,c,t),u(n,d,t),p(d,A),u(n,w,t),O(x,n,t),u(n,T,t),u(n,L,t),p(L,N),p(N,S),p(L,I);for(let n=0;n<U.length;n+=1)U[n].m(L,null);p(L,M),p(L,_),W&&W.m(_,null),C=!0},p(n,[a]){if((!C||2&a)&&t!==(t="Note: "+n[1]+" | Tan Li Hau")&&(document.title=t),(!C||1&a)&&k(s,"content",n[0]),4&a){let t;for(z=n[2],t=0;t<z.length;t+=1){const s=Y(n,z,t);H[t]?H[t].p(s,a):(H[t]=J(s),H[t].c(),H[t].m(o.parentNode,o))}for(;t<H.length;t+=1)H[t].d(1);H.length=z.length}if((!C||2&a)&&b(S,n[1]),4&a){let t;for(j=n[2],t=0;t<j.length;t+=1){const s=K(n,j,t);U[t]?U[t].p(s,a):(U[t]=Q(s),U[t].c(),U[t].m(L,M))}for(;t<U.length;t+=1)U[t].d(1);U.length=j.length}W&&W.p&&8&a&&r(W,V,n,n[3],a,null,null)},i(n){C||(P(x.$$.fragment,n),P(W,n),C=!0)},o(n){q(x.$$.fragment,n),q(W,n),C=!1},d(n){i(a),i(s),i(e),f(H,n),i(o),n&&i(c),n&&i(d),n&&i(w),R(x,n),n&&i(T),n&&i(L),f(U,n),W&&W.d(n)}}}function Z(n,t,a){let{name:s}=t,{title:e}=t,{tags:o=[]}=t,{$$slots:c={},$$scope:l}=t;return n.$set=n=>{"name"in n&&a(0,s=n.name),"title"in n&&a(1,e=n.title),"tags"in n&&a(2,o=n.tags),"$$scope"in n&&a(3,l=n.$$scope)},[s,e,o,l,c]}class nn extends W{constructor(n){super(),V(this,n,Z,X,c,{name:0,title:1,tags:2})}}function tn(t){let a,s,e,o,c,l,r,f,d,b,A,w,x,T,L,N;return{c(){a=h("section"),s=h("ul"),e=h("li"),o=h("a"),c=m("Make custom property animatable"),l=g(),r=h("section"),f=h("h2"),d=h("a"),b=m("Make custom property animatable"),A=g(),w=h("ul"),x=h("li"),T=m("registerProperty"),L=g(),N=h("pre"),this.h()},l(n){a=y(n,"SECTION",{});var t=v(a);s=y(t,"UL",{class:!0,id:!0,role:!0,"aria-label":!0});var p=v(s);e=y(p,"LI",{});var u=v(e);o=y(u,"A",{href:!0});var h=v(o);c=$(h,"Make custom property animatable"),h.forEach(i),u.forEach(i),p.forEach(i),t.forEach(i),l=E(n),r=y(n,"SECTION",{});var m=v(r);f=y(m,"H2",{});var g=v(f);d=y(g,"A",{href:!0,id:!0});var k=v(d);b=$(k,"Make custom property animatable"),k.forEach(i),g.forEach(i),A=E(m),w=y(m,"UL",{});var S=v(w);x=y(S,"LI",{});var I=v(x);T=$(I,"registerProperty"),I.forEach(i),S.forEach(i),L=E(m),N=y(m,"PRE",{class:!0}),v(N).forEach(i),m.forEach(i),this.h()},h(){k(o,"href","#make-custom-property-animatable"),k(s,"class","sitemap"),k(s,"id","sitemap"),k(s,"role","navigation"),k(s,"aria-label","Table of Contents"),k(d,"href","#make-custom-property-animatable"),k(d,"id","make-custom-property-animatable"),k(N,"class","language-html")},m(n,t){u(n,a,t),p(a,s),p(s,e),p(e,o),p(o,c),u(n,l,t),u(n,r,t),p(r,f),p(f,d),p(d,b),p(r,A),p(r,w),p(w,x),p(x,T),p(r,L),p(r,N),N.innerHTML='<code class="language-html"><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>div</span> <span class="token attr-name">id</span><span class="token attr-value"><span class="token punctuation">=</span><span class="token punctuation">"</span>hero<span class="token punctuation">"</span></span><span class="token punctuation">></span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>div</span><span class="token punctuation">></span></span>\n\n<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>style</span><span class="token punctuation">></span></span><span class="token style"><span class="token language-css">\n  <span class="token selector">#hero</span> <span class="token punctuation">&#123;</span>\n    <span class="token property">display</span><span class="token punctuation">:</span> block<span class="token punctuation">;</span>\n    <span class="token property">height</span><span class="token punctuation">:</span> 100px<span class="token punctuation">;</span>\n    <span class="token property">width</span><span class="token punctuation">:</span> 100px<span class="token punctuation">;</span>\n    <span class="token property">background</span><span class="token punctuation">:</span> red<span class="token punctuation">;</span>\n    <span class="token property">transform</span><span class="token punctuation">:</span> <span class="token function">scaleY</span><span class="token punctuation">(</span><span class="token function">var</span><span class="token punctuation">(</span>--scale<span class="token punctuation">,</span> 1<span class="token punctuation">)</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n    <span class="token property">animation</span><span class="token punctuation">:</span> scale 1s linear infinite<span class="token punctuation">;</span>\n  <span class="token punctuation">&#125;</span>\n\n  <span class="token atrule"><span class="token rule">@keyframes</span> scale</span> <span class="token punctuation">&#123;</span>\n    <span class="token selector">to</span> <span class="token punctuation">&#123;</span>\n      <span class="token property">--scale</span><span class="token punctuation">:</span> 1.5<span class="token punctuation">;</span>\n    <span class="token punctuation">&#125;</span>\n  <span class="token punctuation">&#125;</span>\n</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>style</span><span class="token punctuation">></span></span>\n\n<span class="token tag"><span class="token tag"><span class="token punctuation">&lt;</span>script</span><span class="token punctuation">></span></span><span class="token script"><span class="token language-javascript">\n  <span class="token constant">CSS</span><span class="token punctuation">.</span><span class="token function">registerProperty</span><span class="token punctuation">(</span><span class="token punctuation">&#123;</span>\n    name<span class="token punctuation">:</span> <span class="token string">\'--scale\'</span><span class="token punctuation">,</span>\n    syntax<span class="token punctuation">:</span> <span class="token string">\'&lt;number>\'</span><span class="token punctuation">,</span>\n    inherits<span class="token punctuation">:</span> <span class="token boolean">true</span><span class="token punctuation">,</span>\n    initialValue<span class="token punctuation">:</span> <span class="token string">\'1\'</span><span class="token punctuation">,</span>\n  <span class="token punctuation">&#125;</span><span class="token punctuation">)</span><span class="token punctuation">;</span>\n</span></span><span class="token tag"><span class="token tag"><span class="token punctuation">&lt;/</span>script</span><span class="token punctuation">></span></span></code>'},p:n,d(n){n&&i(a),n&&i(l),n&&i(r)}}}function an(n){let a,s;const e=[sn];let o={$$slots:{default:[tn]},$$scope:{ctx:n}};for(let n=0;n<e.length;n+=1)o=t(o,e[n]);return a=new nn({props:o}),{c(){B(a.$$.fragment)},l(n){F(a.$$.fragment,n)},m(n,t){O(a,n,t),s=!0},p(n,[t]){const s=0&t?function(n,t){const a={},s={},e={$$scope:1};let o=n.length;for(;o--;){const c=n[o],l=t[o];if(l){for(const n in c)n in l||(s[n]=1);for(const n in l)e[n]||(a[n]=l[n],e[n]=1);n[o]=l}else for(const n in c)e[n]=1}for(const n in s)n in a||(a[n]=void 0);return a}(e,[(o=sn,"object"==typeof o&&null!==o?o:{})]):{};var o;1&t&&(s.$$scope={dirty:t,ctx:n}),a.$set(s)},i(n){s||(P(a.$$.fragment,n),s=!0)},o(n){q(a.$$.fragment,n),s=!1},d(n){R(a,n)}}}const sn={title:"CSS Houdini",tags:["css houdini"],slug:"notes/css-houdini",type:"notes",name:"css-houdini",layout:"note"};class en extends W{constructor(n){super(),V(this,n,null,an,c,{})}}setTimeout(()=>{new en({target:document.querySelector("#app"),hydrate:!0});if(document.querySelector(".twitter-tweet")){const n=document.createElement("script");n.async=!0,n.src="https://platform.twitter.com/widgets.js",n.charset="utf-8",document.body.appendChild(n)}if("loading"in HTMLImageElement.prototype){document.querySelectorAll('img[loading="lazy"]').forEach(n=>{n.src=n.dataset.src})}else{const n=document.createElement("script");n.src="https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.1.2/lazysizes.min.js",document.body.appendChild(n)}},3e3);
