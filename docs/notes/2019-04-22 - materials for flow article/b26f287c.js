function e(){}function t(e,t){for(const o in t)e[o]=t[o];return e}function o(e){return e()}function r(){return Object.create(null)}function a(e){e.forEach(o)}function n(e){return"function"==typeof e}function l(e,t){return e!=e?t==t:e!==t||e&&"object"==typeof e||"function"==typeof e}function s(e,o,r,a){return e[1]&&a?t(r.ctx.slice(),e[1](a(o))):r.ctx}function c(e,t,o,r,a,n,l){const c=function(e,t,o,r){if(e[2]&&r){const a=e[2](r(o));if(void 0===t.dirty)return a;if("object"==typeof a){const e=[],o=Math.max(t.dirty.length,a.length);for(let r=0;r<o;r+=1)e[r]=t.dirty[r]|a[r];return e}return t.dirty|a}return t.dirty}(t,r,a,n);if(c){const a=s(t,o,r,l);e.p(a,c)}}function f(e,t){e.appendChild(t)}function i(e,t,o){e.insertBefore(t,o||null)}function h(e){e.parentNode.removeChild(e)}function u(e,t){for(let o=0;o<e.length;o+=1)e[o]&&e[o].d(t)}function d(e){return document.createElement(e)}function p(e){return document.createElementNS("http://www.w3.org/2000/svg",e)}function b(e){return document.createTextNode(e)}function m(){return b(" ")}function g(){return b("")}function v(e,t,o){null==o?e.removeAttribute(t):e.getAttribute(t)!==o&&e.setAttribute(t,o)}function E(e){return Array.from(e.childNodes)}function A(e,t,o,r){for(let r=0;r<e.length;r+=1){const a=e[r];if(a.nodeName===t){let t=0;const n=[];for(;t<a.attributes.length;){const e=a.attributes[t++];o[e.name]||n.push(e.name)}for(let e=0;e<n.length;e++)a.removeAttribute(n[e]);return e.splice(r,1)[0]}}return r?p(t):d(t)}function w(e,t){for(let o=0;o<e.length;o+=1){const r=e[o];if(3===r.nodeType)return r.data=""+t,e.splice(o,1)[0]}return b(t)}function $(e){return w(e," ")}function y(e,t){t=""+t,e.wholeText!==t&&(e.data=t)}class x{constructor(e=null){this.a=e,this.e=this.n=null}m(e,t,o=null){this.e||(this.e=d(t.nodeName),this.t=t,this.h(e)),this.i(o)}h(e){this.e.innerHTML=e,this.n=Array.from(this.e.childNodes)}i(e){for(let t=0;t<this.n.length;t+=1)i(this.t,this.n[t],e)}p(e){this.d(),this.h(e),this.i(this.a)}d(){this.n.forEach(h)}}let I;function k(e){I=e}const L=[],T=[],N=[],H=[],_=Promise.resolve();let C=!1;function F(e){N.push(e)}let M=!1;const S=new Set;function z(){if(!M){M=!0;do{for(let e=0;e<L.length;e+=1){const t=L[e];k(t),R(t.$$)}for(L.length=0;T.length;)T.pop()();for(let e=0;e<N.length;e+=1){const t=N[e];S.has(t)||(S.add(t),t())}N.length=0}while(L.length);for(;H.length;)H.pop()();C=!1,M=!1,S.clear()}}function R(e){if(null!==e.fragment){e.update(),a(e.before_update);const t=e.dirty;e.dirty=[-1],e.fragment&&e.fragment.p(e.ctx,t),e.after_update.forEach(F)}}const P=new Set;function j(e,t){e&&e.i&&(P.delete(e),e.i(t))}function q(e,t,o,r){if(e&&e.o){if(P.has(e))return;P.add(e),(void 0).c.push(()=>{P.delete(e),r&&(o&&e.d(1),r())}),e.o(t)}}function U(e){e&&e.c()}function B(e,t){e&&e.l(t)}function W(e,t,r){const{fragment:l,on_mount:s,on_destroy:c,after_update:f}=e.$$;l&&l.m(t,r),F(()=>{const t=s.map(o).filter(n);c?c.push(...t):a(t),e.$$.on_mount=[]}),f.forEach(F)}function D(e,t){const o=e.$$;null!==o.fragment&&(a(o.on_destroy),o.fragment&&o.fragment.d(t),o.on_destroy=o.fragment=null,o.ctx=[])}function J(e,t){-1===e.$$.dirty[0]&&(L.push(e),C||(C=!0,_.then(z)),e.$$.dirty.fill(0)),e.$$.dirty[t/31|0]|=1<<t%31}function Y(t,o,n,l,s,c,f=[-1]){const i=I;k(t);const u=o.props||{},d=t.$$={fragment:null,ctx:null,props:c,update:e,not_equal:s,bound:r(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(i?i.$$.context:[]),callbacks:r(),dirty:f};let p=!1;if(d.ctx=n?n(t,u,(e,o,...r)=>{const a=r.length?r[0]:o;return d.ctx&&s(d.ctx[e],d.ctx[e]=a)&&(d.bound[e]&&d.bound[e](a),p&&J(t,e)),o}):[],d.update(),p=!0,a(d.before_update),d.fragment=!!l&&l(d.ctx),o.target){if(o.hydrate){const e=E(o.target);d.fragment&&d.fragment.l(e),e.forEach(h)}else d.fragment&&d.fragment.c();o.intro&&j(t.$$.fragment),W(t,o.target,o.anchor),z()}k(i)}class Z{$destroy(){D(this,1),this.$destroy=e}$on(e,t){const o=this.$$.callbacks[e]||(this.$$.callbacks[e]=[]);return o.push(t),()=>{const e=o.indexOf(t);-1!==e&&o.splice(e,1)}}$set(){}}function O(t){let o,r,a,n,l,s,c,u,g,y,x,I,k,L,T,N,H,_,C,F,M,S,z,R,P,j,q,U,B,W,D,J,Y,Z,O;return{c(){o=d("header"),r=d("nav"),a=d("ul"),n=d("li"),l=d("a"),s=b("Tan Li Hau"),c=m(),u=d("li"),g=d("a"),y=b("About"),x=m(),I=d("li"),k=d("a"),L=b("Writings"),T=m(),N=d("li"),H=d("a"),_=b("Talks"),C=m(),F=d("li"),M=d("a"),S=b("Notes"),z=m(),R=d("li"),P=d("a"),j=b("Newsletter"),q=m(),U=d("li"),B=d("a"),W=p("svg"),D=p("path"),J=m(),Y=d("a"),Z=p("svg"),O=p("path"),this.h()},l(e){o=A(e,"HEADER",{class:!0});var t=E(o);r=A(t,"NAV",{});var f=E(r);a=A(f,"UL",{class:!0});var i=E(a);n=A(i,"LI",{class:!0});var d=E(n);l=A(d,"A",{href:!0,class:!0});var p=E(l);s=w(p,"Tan Li Hau"),p.forEach(h),d.forEach(h),c=$(i),u=A(i,"LI",{class:!0});var b=E(u);g=A(b,"A",{href:!0,class:!0});var m=E(g);y=w(m,"About"),m.forEach(h),b.forEach(h),x=$(i),I=A(i,"LI",{class:!0});var v=E(I);k=A(v,"A",{href:!0,class:!0});var V=E(k);L=w(V,"Writings"),V.forEach(h),v.forEach(h),T=$(i),N=A(i,"LI",{class:!0});var X=E(N);H=A(X,"A",{href:!0,class:!0});var G=E(H);_=w(G,"Talks"),G.forEach(h),X.forEach(h),C=$(i),F=A(i,"LI",{class:!0});var K=E(F);M=A(K,"A",{href:!0,class:!0});var Q=E(M);S=w(Q,"Notes"),Q.forEach(h),K.forEach(h),z=$(i),R=A(i,"LI",{class:!0});var ee=E(R);P=A(ee,"A",{href:!0,class:!0});var te=E(P);j=w(te,"Newsletter"),te.forEach(h),ee.forEach(h),q=$(i),U=A(i,"LI",{class:!0});var oe=E(U);B=A(oe,"A",{"aria-label":!0,href:!0,class:!0});var re=E(B);W=A(re,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var ae=E(W);D=A(ae,"path",{d:!0},1),E(D).forEach(h),ae.forEach(h),re.forEach(h),J=$(oe),Y=A(oe,"A",{"aria-label":!0,href:!0,class:!0});var ne=E(Y);Z=A(ne,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var le=E(Z);O=A(le,"path",{d:!0},1),E(O).forEach(h),le.forEach(h),ne.forEach(h),oe.forEach(h),i.forEach(h),f.forEach(h),t.forEach(h),this.h()},h(){v(l,"href","/"),v(l,"class","svelte-f3e4uo"),v(n,"class","svelte-f3e4uo"),v(g,"href","/about"),v(g,"class","svelte-f3e4uo"),v(u,"class","svelte-f3e4uo"),v(k,"href","/blogs"),v(k,"class","svelte-f3e4uo"),v(I,"class","svelte-f3e4uo"),v(H,"href","/talks"),v(H,"class","svelte-f3e4uo"),v(N,"class","svelte-f3e4uo"),v(M,"href","/notes"),v(M,"class","svelte-f3e4uo"),v(F,"class","svelte-f3e4uo"),v(P,"href","/newsletter"),v(P,"class","svelte-f3e4uo"),v(R,"class","svelte-f3e4uo"),v(D,"d","M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"),v(W,"viewBox","0 0 24 24"),v(W,"width","1em"),v(W,"height","1em"),v(W,"class","svelte-f3e4uo"),v(B,"aria-label","Twitter account"),v(B,"href","https://twitter.com/lihautan"),v(B,"class","svelte-f3e4uo"),v(O,"d","M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"),v(Z,"viewBox","0 0 24 24"),v(Z,"width","1em"),v(Z,"height","1em"),v(Z,"class","svelte-f3e4uo"),v(Y,"aria-label","Github account"),v(Y,"href","https://github.com/tanhauhau"),v(Y,"class","svelte-f3e4uo"),v(U,"class","social svelte-f3e4uo"),v(a,"class","svelte-f3e4uo"),v(o,"class","svelte-f3e4uo")},m(e,t){i(e,o,t),f(o,r),f(r,a),f(a,n),f(n,l),f(l,s),f(a,c),f(a,u),f(u,g),f(g,y),f(a,x),f(a,I),f(I,k),f(k,L),f(a,T),f(a,N),f(N,H),f(H,_),f(a,C),f(a,F),f(F,M),f(M,S),f(a,z),f(a,R),f(R,P),f(P,j),f(a,q),f(a,U),f(U,B),f(B,W),f(W,D),f(U,J),f(U,Y),f(Y,Z),f(Z,O)},p:e,i:e,o:e,d(e){e&&h(o)}}}class V extends Z{constructor(e){super(),Y(this,e,null,O,l,{})}}function X(e,t,o){const r=e.slice();return r[6]=t[o],r}function G(e,t,o){const r=e.slice();return r[6]=t[o],r}function K(e){let t,o;return{c(){t=d("meta"),this.h()},l(e){t=A(e,"META",{name:!0,content:!0}),this.h()},h(){v(t,"name","keywords"),v(t,"content",o=e[6])},m(e,o){i(e,t,o)},p(e,r){4&r&&o!==(o=e[6])&&v(t,"content",o)},d(e){e&&h(t)}}}function Q(e){let t,o,r=e[6]+"";return{c(){t=d("span"),o=b(r),this.h()},l(e){t=A(e,"SPAN",{class:!0});var a=E(t);o=w(a,r),a.forEach(h),this.h()},h(){v(t,"class","svelte-10cnqwo")},m(e,r){i(e,t,r),f(t,o)},p(e,t){4&t&&r!==(r=e[6]+"")&&y(o,r)},d(e){e&&h(t)}}}function ee(e){let t,o,r,a,n,l,p,I,k,L,T,N,H,_,C,F,M,S,z,R,P,J,Y;document.title=t="Note: "+e[1]+" "+e[0]+" | Tan Li Hau";let Z=e[2],O=[];for(let t=0;t<Z.length;t+=1)O[t]=K(G(e,Z,t));L=new V({});let ee=e[2],te=[];for(let t=0;t<ee.length;t+=1)te[t]=Q(X(e,ee,t));const oe=e[4].default,re=function(e,t,o,r){if(e){const a=s(e,t,o,r);return e[0](a)}}(oe,e,e[3],null);return{c(){o=d("link"),r=d("meta"),a=d("meta");for(let e=0;e<O.length;e+=1)O[e].c();n=d("meta"),l=m(),p=d("a"),I=b("Skip to content"),k=m(),U(L.$$.fragment),T=m(),N=d("main"),H=d("h1"),_=b(e[1]),C=b(" - "),F=b(e[0]),M=m();for(let e=0;e<te.length;e+=1)te[e].c();S=m(),z=d("article"),re&&re.c(),R=m(),J=g(),this.h()},l(t){const s=function(e,t=document.body){return Array.from(t.querySelectorAll(e))}('[data-svelte="svelte-jez2i1"]',document.head);o=A(s,"LINK",{href:!0,rel:!0}),r=A(s,"META",{name:!0,content:!0}),a=A(s,"META",{name:!0,content:!0});for(let e=0;e<O.length;e+=1)O[e].l(s);n=A(s,"META",{itemprop:!0,content:!0}),s.forEach(h),l=$(t),p=A(t,"A",{href:!0,class:!0});var c=E(p);I=w(c,"Skip to content"),c.forEach(h),k=$(t),B(L.$$.fragment,t),T=$(t),N=A(t,"MAIN",{id:!0,class:!0});var f=E(N);H=A(f,"H1",{});var i=E(H);_=w(i,e[1]),C=w(i," - "),F=w(i,e[0]),i.forEach(h),M=$(f);for(let e=0;e<te.length;e+=1)te[e].l(f);S=$(f),z=A(f,"ARTICLE",{});var u=E(z);re&&re.l(u),u.forEach(h),f.forEach(h),R=$(t),J=g(),this.h()},h(){v(o,"href","https://lihautan.com/notes/2019-04-22 - materials for flow article/assets/blog-base-ddb14eb9.css"),v(o,"rel","stylesheet"),v(r,"name","og:title"),v(r,"content",e[0]),v(a,"name","og:type"),v(a,"content","website"),v(n,"itemprop","url"),v(n,"content","https%3A%2F%2Flihautan.com%2Fnotes%2F2019-04-22%20-%20materials%20for%20flow%20article"),v(p,"href","#content"),v(p,"class","skip svelte-10cnqwo"),v(N,"id","content"),v(N,"class","blog svelte-10cnqwo"),P=new x(J)},m(e,t){f(document.head,o),f(document.head,r),f(document.head,a);for(let e=0;e<O.length;e+=1)O[e].m(document.head,null);f(document.head,n),i(e,l,t),i(e,p,t),f(p,I),i(e,k,t),W(L,e,t),i(e,T,t),i(e,N,t),f(N,H),f(H,_),f(H,C),f(H,F),f(N,M);for(let e=0;e<te.length;e+=1)te[e].m(N,null);f(N,S),f(N,z),re&&re.m(z,null),i(e,R,t),P.m('<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>',e,t),i(e,J,t),Y=!0},p(e,[o]){if((!Y||3&o)&&t!==(t="Note: "+e[1]+" "+e[0]+" | Tan Li Hau")&&(document.title=t),(!Y||1&o)&&v(r,"content",e[0]),4&o){let t;for(Z=e[2],t=0;t<Z.length;t+=1){const r=G(e,Z,t);O[t]?O[t].p(r,o):(O[t]=K(r),O[t].c(),O[t].m(n.parentNode,n))}for(;t<O.length;t+=1)O[t].d(1);O.length=Z.length}if((!Y||2&o)&&y(_,e[1]),(!Y||1&o)&&y(F,e[0]),4&o){let t;for(ee=e[2],t=0;t<ee.length;t+=1){const r=X(e,ee,t);te[t]?te[t].p(r,o):(te[t]=Q(r),te[t].c(),te[t].m(N,S))}for(;t<te.length;t+=1)te[t].d(1);te.length=ee.length}re&&re.p&&8&o&&c(re,oe,e,e[3],o,null,null)},i(e){Y||(j(L.$$.fragment,e),j(re,e),Y=!0)},o(e){q(L.$$.fragment,e),q(re,e),Y=!1},d(e){h(o),h(r),h(a),u(O,e),h(n),e&&h(l),e&&h(p),e&&h(k),D(L,e),e&&h(T),e&&h(N),u(te,e),re&&re.d(e),e&&h(R),e&&h(J),e&&P.d()}}}function te(e,t,o){let{name:r}=t,{date:a}=t,{tags:n=[]}=t,{$$slots:l={},$$scope:s}=t;return e.$set=e=>{"name"in e&&o(0,r=e.name),"date"in e&&o(1,a=e.date),"tags"in e&&o(2,n=e.tags),"$$scope"in e&&o(3,s=e.$$scope)},[r,a,n,s,l]}class oe extends Z{constructor(e){super(),Y(this,e,te,ee,l,{name:0,date:1,tags:2})}}function re(e){let t,o,r,a,n,l,s,c,u,p,g,y,x,I,k,L,T,N,H,_,C,F,M,S,z,R,P,j,q,U,B,W,D,J,Y,Z,O,V,X,G,K,Q,ee,te,oe,re,ae;return{c(){t=d("ul"),o=d("li"),r=d("a"),a=b("https://flow.org/en/docs/config/options/#toc-max-header-tokens-integer"),n=m(),l=d("li"),s=d("a"),c=b("https://github.com/facebook/flow/commit/ef73d5a76fbc52c191e3e0bbbf767c52b78f3fad"),u=m(),p=d("li"),g=d("a"),y=b("https://github.com/facebookarchive/node-haste/blob/master/README.md"),x=m(),I=d("li"),k=d("a"),L=b("https://github.com/babel/babylon/pull/76/files"),T=m(),N=d("li"),H=d("a"),_=b("https://astexplorer.net/"),C=m(),F=d("p"),M=b("a"),S=d("x"),z=b("(y);\n// @flow\na"),R=d("x"),P=b("(y);"),j=m(),q=d("p"),U=d("a"),B=b("https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=IYHgHgfAFAnglAbgFAHoUAIACAzANgewHclRJZEg&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=es2015%2Cflow%2Cenv&prettier=false&targets=&version=7.4.3&externalPlugins=%40babel%2Fplugin-syntax-flow%407.2.0"),W=m(),D=d("ul"),J=d("li"),Y=b("issues"),Z=m(),O=d("li"),V=d("a"),X=b("https://github.com/babel/babel/issues/9240"),G=m(),K=d("li"),Q=d("a"),ee=b("https://github.com/facebook/flow/commit/ef73d5a76fbc52c191e3e0bbbf767c52b78f3fad"),te=m(),oe=d("li"),re=d("a"),ae=b("https://flow.org/en/docs/config/options/#toc-max-header-tokens-integer"),this.h()},l(e){t=A(e,"UL",{});var f=E(t);o=A(f,"LI",{});var i=E(o);r=A(i,"A",{href:!0,rel:!0});var d=E(r);a=w(d,"https://flow.org/en/docs/config/options/#toc-max-header-tokens-integer"),d.forEach(h),i.forEach(h),n=$(f),l=A(f,"LI",{});var b=E(l);s=A(b,"A",{href:!0,rel:!0});var m=E(s);c=w(m,"https://github.com/facebook/flow/commit/ef73d5a76fbc52c191e3e0bbbf767c52b78f3fad"),m.forEach(h),b.forEach(h),u=$(f),p=A(f,"LI",{});var v=E(p);g=A(v,"A",{href:!0,rel:!0});var ne=E(g);y=w(ne,"https://github.com/facebookarchive/node-haste/blob/master/README.md"),ne.forEach(h),v.forEach(h),x=$(f),I=A(f,"LI",{});var le=E(I);k=A(le,"A",{href:!0,rel:!0});var se=E(k);L=w(se,"https://github.com/babel/babylon/pull/76/files"),se.forEach(h),le.forEach(h),T=$(f),N=A(f,"LI",{});var ce=E(N);H=A(ce,"A",{href:!0,rel:!0});var fe=E(H);_=w(fe,"https://astexplorer.net/"),fe.forEach(h),ce.forEach(h),f.forEach(h),C=$(e),F=A(e,"P",{});var ie=E(F);M=w(ie,"a"),S=A(ie,"X",{});var he=E(S);z=w(he,"(y);\n// @flow\na"),R=A(he,"X",{});var ue=E(R);P=w(ue,"(y);"),ue.forEach(h),he.forEach(h),ie.forEach(h),j=$(e),q=A(e,"P",{});var de=E(q);U=A(de,"A",{href:!0,rel:!0});var pe=E(U);B=w(pe,"https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=IYHgHgfAFAnglAbgFAHoUAIACAzANgewHclRJZEg&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=es2015%2Cflow%2Cenv&prettier=false&targets=&version=7.4.3&externalPlugins=%40babel%2Fplugin-syntax-flow%407.2.0"),pe.forEach(h),de.forEach(h),W=$(e),D=A(e,"UL",{});var be=E(D);J=A(be,"LI",{});var me=E(J);Y=w(me,"issues"),me.forEach(h),Z=$(be),O=A(be,"LI",{});var ge=E(O);V=A(ge,"A",{href:!0,rel:!0});var ve=E(V);X=w(ve,"https://github.com/babel/babel/issues/9240"),ve.forEach(h),ge.forEach(h),G=$(be),K=A(be,"LI",{});var Ee=E(K);Q=A(Ee,"A",{href:!0,rel:!0});var Ae=E(Q);ee=w(Ae,"https://github.com/facebook/flow/commit/ef73d5a76fbc52c191e3e0bbbf767c52b78f3fad"),Ae.forEach(h),Ee.forEach(h),te=$(be),oe=A(be,"LI",{});var we=E(oe);re=A(we,"A",{href:!0,rel:!0});var $e=E(re);ae=w($e,"https://flow.org/en/docs/config/options/#toc-max-header-tokens-integer"),$e.forEach(h),we.forEach(h),be.forEach(h),this.h()},h(){v(r,"href","https://flow.org/en/docs/config/options/#toc-max-header-tokens-integer"),v(r,"rel","nofollow"),v(s,"href","https://github.com/facebook/flow/commit/ef73d5a76fbc52c191e3e0bbbf767c52b78f3fad"),v(s,"rel","nofollow"),v(g,"href","https://github.com/facebookarchive/node-haste/blob/master/README.md"),v(g,"rel","nofollow"),v(k,"href","https://github.com/babel/babylon/pull/76/files"),v(k,"rel","nofollow"),v(H,"href","https://astexplorer.net/"),v(H,"rel","nofollow"),v(U,"href","https://babeljs.io/repl#?babili=false&browsers=&build=&builtIns=false&spec=false&loose=false&code_lz=IYHgHgfAFAnglAbgFAHoUAIACAzANgewHclRJZEg&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=true&presets=es2015%2Cflow%2Cenv&prettier=false&targets=&version=7.4.3&externalPlugins=%40babel%2Fplugin-syntax-flow%407.2.0"),v(U,"rel","nofollow"),v(V,"href","https://github.com/babel/babel/issues/9240"),v(V,"rel","nofollow"),v(Q,"href","https://github.com/facebook/flow/commit/ef73d5a76fbc52c191e3e0bbbf767c52b78f3fad"),v(Q,"rel","nofollow"),v(re,"href","https://flow.org/en/docs/config/options/#toc-max-header-tokens-integer"),v(re,"rel","nofollow")},m(e,h){i(e,t,h),f(t,o),f(o,r),f(r,a),f(t,n),f(t,l),f(l,s),f(s,c),f(t,u),f(t,p),f(p,g),f(g,y),f(t,x),f(t,I),f(I,k),f(k,L),f(t,T),f(t,N),f(N,H),f(H,_),i(e,C,h),i(e,F,h),f(F,M),f(F,S),f(S,z),f(S,R),f(R,P),i(e,j,h),i(e,q,h),f(q,U),f(U,B),i(e,W,h),i(e,D,h),f(D,J),f(J,Y),f(D,Z),f(D,O),f(O,V),f(V,X),f(D,G),f(D,K),f(K,Q),f(Q,ee),f(D,te),f(D,oe),f(oe,re),f(re,ae)},d(e){e&&h(t),e&&h(C),e&&h(F),e&&h(j),e&&h(q),e&&h(W),e&&h(D)}}}function ae(e){let o,r;const a=[ne];let n={$$slots:{default:[re]},$$scope:{ctx:e}};for(let e=0;e<a.length;e+=1)n=t(n,a[e]);return o=new oe({props:n}),{c(){U(o.$$.fragment)},l(e){B(o.$$.fragment,e)},m(e,t){W(o,e,t),r=!0},p(e,[t]){const r=0&t?function(e,t){const o={},r={},a={$$scope:1};let n=e.length;for(;n--;){const l=e[n],s=t[n];if(s){for(const e in l)e in s||(r[e]=1);for(const e in s)a[e]||(o[e]=s[e],a[e]=1);e[n]=s}else for(const e in l)a[e]=1}for(const e in r)e in o||(o[e]=void 0);return o}(a,[(n=ne,"object"==typeof n&&null!==n?n:{})]):{};var n;1&t&&(r.$$scope={dirty:t,ctx:e}),o.$set(r)},i(e){r||(j(o.$$.fragment,e),r=!0)},o(e){q(o.$$.fragment,e),r=!1},d(e){D(o,e)}}}const ne={slug:"notes/2019-04-22 - materials for flow article",type:"notes",date:"2019-04-22",name:"materials for flow article",layout:"note"};class le extends Z{constructor(e){super(),Y(this,e,null,ae,l,{})}}setTimeout(()=>{new le({target:document.querySelector("#app"),hydrate:!0})},3e3);
