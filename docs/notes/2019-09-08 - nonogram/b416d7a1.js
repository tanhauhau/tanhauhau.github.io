function t(){}function e(t,e){for(const n in e)t[n]=e[n];return t}function n(t){return t()}function o(){return Object.create(null)}function a(t){t.forEach(n)}function r(t){return"function"==typeof t}function s(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function c(t,n,o,a){return t[1]&&a?e(o.ctx.slice(),t[1](a(n))):o.ctx}function l(t,e,n,o,a,r,s){const l=function(t,e,n,o){if(t[2]&&o){const a=t[2](o(n));if(void 0===e.dirty)return a;if("object"==typeof a){const t=[],n=Math.max(e.dirty.length,a.length);for(let o=0;o<n;o+=1)t[o]=e.dirty[o]|a[o];return t}return e.dirty|a}return e.dirty}(e,o,a,r);if(l){const a=c(e,n,o,s);t.p(a,l)}}function i(t,e){t.appendChild(e)}function h(t,e,n){t.insertBefore(e,n||null)}function f(t){t.parentNode.removeChild(t)}function u(t,e){for(let n=0;n<t.length;n+=1)t[n]&&t[n].d(e)}function d(t){return document.createElement(t)}function m(t){return document.createElementNS("http://www.w3.org/2000/svg",t)}function g(t){return document.createTextNode(t)}function p(){return g(" ")}function v(){return g("")}function E(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function $(t){return Array.from(t.childNodes)}function b(t,e,n,o){for(let o=0;o<t.length;o+=1){const a=t[o];if(a.nodeName===e){let e=0;const r=[];for(;e<a.attributes.length;){const t=a.attributes[e++];n[t.name]||r.push(t.name)}for(let t=0;t<r.length;t++)a.removeAttribute(r[t]);return t.splice(o,1)[0]}}return o?m(e):d(e)}function y(t,e){for(let n=0;n<t.length;n+=1){const o=t[n];if(3===o.nodeType)return o.data=""+e,t.splice(n,1)[0]}return g(e)}function A(t){return y(t," ")}function w(t,e){e=""+e,t.wholeText!==e&&(t.data=e)}class x{constructor(t=null){this.a=t,this.e=this.n=null}m(t,e,n=null){this.e||(this.e=d(e.nodeName),this.t=e,this.h(t)),this.i(n)}h(t){this.e.innerHTML=t,this.n=Array.from(this.e.childNodes)}i(t){for(let e=0;e<this.n.length;e+=1)h(this.t,this.n[e],t)}p(t){this.d(),this.h(t),this.i(this.a)}d(){this.n.forEach(f)}}let L;function k(t){L=t}const T=[],I=[],N=[],_=[],M=Promise.resolve();let P=!1;function S(t){N.push(t)}let U=!1;const H=new Set;function O(){if(!U){U=!0;do{for(let t=0;t<T.length;t+=1){const e=T[t];k(e),j(e.$$)}for(T.length=0;I.length;)I.pop()();for(let t=0;t<N.length;t+=1){const e=N[t];H.has(e)||(H.add(e),e())}N.length=0}while(T.length);for(;_.length;)_.pop()();P=!1,U=!1,H.clear()}}function j(t){if(null!==t.fragment){t.update(),a(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(S)}}const q=new Set;function C(t,e){t&&t.i&&(q.delete(t),t.i(e))}function B(t,e,n,o){if(t&&t.o){if(q.has(t))return;q.add(t),(void 0).c.push(()=>{q.delete(t),o&&(n&&t.d(1),o())}),t.o(e)}}function R(t){t&&t.c()}function Y(t,e){t&&t.l(e)}function F(t,e,o){const{fragment:s,on_mount:c,on_destroy:l,after_update:i}=t.$$;s&&s.m(e,o),S(()=>{const e=c.map(n).filter(r);l?l.push(...e):a(e),t.$$.on_mount=[]}),i.forEach(S)}function V(t,e){const n=t.$$;null!==n.fragment&&(a(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function W(t,e){-1===t.$$.dirty[0]&&(T.push(t),P||(P=!0,M.then(O)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function z(e,n,r,s,c,l,i=[-1]){const h=L;k(e);const u=n.props||{},d=e.$$={fragment:null,ctx:null,props:l,update:t,not_equal:c,bound:o(),on_mount:[],on_destroy:[],before_update:[],after_update:[],context:new Map(h?h.$$.context:[]),callbacks:o(),dirty:i};let m=!1;if(d.ctx=r?r(e,u,(t,n,...o)=>{const a=o.length?o[0]:n;return d.ctx&&c(d.ctx[t],d.ctx[t]=a)&&(d.bound[t]&&d.bound[t](a),m&&W(e,t)),n}):[],d.update(),m=!0,a(d.before_update),d.fragment=!!s&&s(d.ctx),n.target){if(n.hydrate){const t=$(n.target);d.fragment&&d.fragment.l(t),t.forEach(f)}else d.fragment&&d.fragment.c();n.intro&&C(e.$$.fragment),F(e,n.target,n.anchor),O()}k(h)}class D{$destroy(){V(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(){}}function G(e){let n,o,a,r,s,c,l,u,v,w,x,L,k,T,I,N,_,M,P,S,U,H,O,j,q,C,B,R,Y,F,V,W,z,D,G;return{c(){n=d("header"),o=d("nav"),a=d("ul"),r=d("li"),s=d("a"),c=g("Tan Li Hau"),l=p(),u=d("li"),v=d("a"),w=g("About"),x=p(),L=d("li"),k=d("a"),T=g("Writings"),I=p(),N=d("li"),_=d("a"),M=g("Talks"),P=p(),S=d("li"),U=d("a"),H=g("Notes"),O=p(),j=d("li"),q=d("a"),C=g("Newsletter"),B=p(),R=d("li"),Y=d("a"),F=m("svg"),V=m("path"),W=p(),z=d("a"),D=m("svg"),G=m("path"),this.h()},l(t){n=b(t,"HEADER",{class:!0});var e=$(n);o=b(e,"NAV",{});var i=$(o);a=b(i,"UL",{class:!0});var h=$(a);r=b(h,"LI",{class:!0});var d=$(r);s=b(d,"A",{href:!0,class:!0});var m=$(s);c=y(m,"Tan Li Hau"),m.forEach(f),d.forEach(f),l=A(h),u=b(h,"LI",{class:!0});var g=$(u);v=b(g,"A",{href:!0,class:!0});var p=$(v);w=y(p,"About"),p.forEach(f),g.forEach(f),x=A(h),L=b(h,"LI",{class:!0});var E=$(L);k=b(E,"A",{href:!0,class:!0});var K=$(k);T=y(K,"Writings"),K.forEach(f),E.forEach(f),I=A(h),N=b(h,"LI",{class:!0});var J=$(N);_=b(J,"A",{href:!0,class:!0});var Q=$(_);M=y(Q,"Talks"),Q.forEach(f),J.forEach(f),P=A(h),S=b(h,"LI",{class:!0});var X=$(S);U=b(X,"A",{href:!0,class:!0});var Z=$(U);H=y(Z,"Notes"),Z.forEach(f),X.forEach(f),O=A(h),j=b(h,"LI",{class:!0});var tt=$(j);q=b(tt,"A",{href:!0,class:!0});var et=$(q);C=y(et,"Newsletter"),et.forEach(f),tt.forEach(f),B=A(h),R=b(h,"LI",{class:!0});var nt=$(R);Y=b(nt,"A",{"aria-label":!0,href:!0,class:!0});var ot=$(Y);F=b(ot,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var at=$(F);V=b(at,"path",{d:!0},1),$(V).forEach(f),at.forEach(f),ot.forEach(f),W=A(nt),z=b(nt,"A",{"aria-label":!0,href:!0,class:!0});var rt=$(z);D=b(rt,"svg",{viewBox:!0,width:!0,height:!0,class:!0},1);var st=$(D);G=b(st,"path",{d:!0},1),$(G).forEach(f),st.forEach(f),rt.forEach(f),nt.forEach(f),h.forEach(f),i.forEach(f),e.forEach(f),this.h()},h(){E(s,"href","/"),E(s,"class","svelte-f3e4uo"),E(r,"class","svelte-f3e4uo"),E(v,"href","/about"),E(v,"class","svelte-f3e4uo"),E(u,"class","svelte-f3e4uo"),E(k,"href","/blogs"),E(k,"class","svelte-f3e4uo"),E(L,"class","svelte-f3e4uo"),E(_,"href","/talks"),E(_,"class","svelte-f3e4uo"),E(N,"class","svelte-f3e4uo"),E(U,"href","/notes"),E(U,"class","svelte-f3e4uo"),E(S,"class","svelte-f3e4uo"),E(q,"href","/newsletter"),E(q,"class","svelte-f3e4uo"),E(j,"class","svelte-f3e4uo"),E(V,"d","M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66\n    10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5\n    4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"),E(F,"viewBox","0 0 24 24"),E(F,"width","1em"),E(F,"height","1em"),E(F,"class","svelte-f3e4uo"),E(Y,"aria-label","Twitter account"),E(Y,"href","https://twitter.com/lihautan"),E(Y,"class","svelte-f3e4uo"),E(G,"d","M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0\n    0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07\n    5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65\n    5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42\n    3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"),E(D,"viewBox","0 0 24 24"),E(D,"width","1em"),E(D,"height","1em"),E(D,"class","svelte-f3e4uo"),E(z,"aria-label","Github account"),E(z,"href","https://github.com/tanhauhau"),E(z,"class","svelte-f3e4uo"),E(R,"class","social svelte-f3e4uo"),E(a,"class","svelte-f3e4uo"),E(n,"class","svelte-f3e4uo")},m(t,e){h(t,n,e),i(n,o),i(o,a),i(a,r),i(r,s),i(s,c),i(a,l),i(a,u),i(u,v),i(v,w),i(a,x),i(a,L),i(L,k),i(k,T),i(a,I),i(a,N),i(N,_),i(_,M),i(a,P),i(a,S),i(S,U),i(U,H),i(a,O),i(a,j),i(j,q),i(q,C),i(a,B),i(a,R),i(R,Y),i(Y,F),i(F,V),i(R,W),i(R,z),i(z,D),i(D,G)},p:t,i:t,o:t,d(t){t&&f(n)}}}class K extends D{constructor(t){super(),z(this,t,null,G,s,{})}}function J(t,e,n){const o=t.slice();return o[6]=e[n],o}function Q(t,e,n){const o=t.slice();return o[6]=e[n],o}function X(t){let e,n;return{c(){e=d("meta"),this.h()},l(t){e=b(t,"META",{name:!0,content:!0}),this.h()},h(){E(e,"name","keywords"),E(e,"content",n=t[6])},m(t,n){h(t,e,n)},p(t,o){4&o&&n!==(n=t[6])&&E(e,"content",n)},d(t){t&&f(e)}}}function Z(t){let e,n,o=t[6]+"";return{c(){e=d("span"),n=g(o),this.h()},l(t){e=b(t,"SPAN",{class:!0});var a=$(e);n=y(a,o),a.forEach(f),this.h()},h(){E(e,"class","svelte-10cnqwo")},m(t,o){h(t,e,o),i(e,n)},p(t,e){4&e&&o!==(o=t[6]+"")&&w(n,o)},d(t){t&&f(e)}}}function tt(t){let e,n,o,a,r,s,m,L,k,T,I,N,_,M,P,S,U,H,O,j,q,W,z;document.title=e="Note: "+t[1]+" "+t[0]+" | Tan Li Hau";let D=t[2],G=[];for(let e=0;e<D.length;e+=1)G[e]=X(Q(t,D,e));T=new K({});let tt=t[2],et=[];for(let e=0;e<tt.length;e+=1)et[e]=Z(J(t,tt,e));const nt=t[4].default,ot=function(t,e,n,o){if(t){const a=c(t,e,n,o);return t[0](a)}}(nt,t,t[3],null);return{c(){n=d("link"),o=d("meta"),a=d("meta");for(let t=0;t<G.length;t+=1)G[t].c();r=d("meta"),s=p(),m=d("a"),L=g("Skip to content"),k=p(),R(T.$$.fragment),I=p(),N=d("main"),_=d("h1"),M=g(t[1]),P=g(" - "),S=g(t[0]),U=p();for(let t=0;t<et.length;t+=1)et[t].c();H=p(),O=d("article"),ot&&ot.c(),j=p(),W=v(),this.h()},l(e){const c=function(t,e=document.body){return Array.from(e.querySelectorAll(t))}('[data-svelte="svelte-jez2i1"]',document.head);n=b(c,"LINK",{href:!0,rel:!0}),o=b(c,"META",{name:!0,content:!0}),a=b(c,"META",{name:!0,content:!0});for(let t=0;t<G.length;t+=1)G[t].l(c);r=b(c,"META",{itemprop:!0,content:!0}),c.forEach(f),s=A(e),m=b(e,"A",{href:!0,class:!0});var l=$(m);L=y(l,"Skip to content"),l.forEach(f),k=A(e),Y(T.$$.fragment,e),I=A(e),N=b(e,"MAIN",{id:!0,class:!0});var i=$(N);_=b(i,"H1",{});var h=$(_);M=y(h,t[1]),P=y(h," - "),S=y(h,t[0]),h.forEach(f),U=A(i);for(let t=0;t<et.length;t+=1)et[t].l(i);H=A(i),O=b(i,"ARTICLE",{});var u=$(O);ot&&ot.l(u),u.forEach(f),i.forEach(f),j=A(e),W=v(),this.h()},h(){E(n,"href","https://lihautan.com/notes/2019-09-08 - nonogram/assets/blog-base-ddb14eb9.css"),E(n,"rel","stylesheet"),E(o,"name","og:title"),E(o,"content",t[0]),E(a,"name","og:type"),E(a,"content","website"),E(r,"itemprop","url"),E(r,"content","https%3A%2F%2Flihautan.com%2Fnotes%2F2019-09-08%20-%20nonogram"),E(m,"href","#content"),E(m,"class","skip svelte-10cnqwo"),E(N,"id","content"),E(N,"class","blog svelte-10cnqwo"),q=new x(W)},m(t,e){i(document.head,n),i(document.head,o),i(document.head,a);for(let t=0;t<G.length;t+=1)G[t].m(document.head,null);i(document.head,r),h(t,s,e),h(t,m,e),i(m,L),h(t,k,e),F(T,t,e),h(t,I,e),h(t,N,e),i(N,_),i(_,M),i(_,P),i(_,S),i(N,U);for(let t=0;t<et.length;t+=1)et[t].m(N,null);i(N,H),i(N,O),ot&&ot.m(O,null),h(t,j,e),q.m('<script async src="https://platform.twitter.com/widgets.js" charset="utf-8"><\/script>',t,e),h(t,W,e),z=!0},p(t,[n]){if((!z||3&n)&&e!==(e="Note: "+t[1]+" "+t[0]+" | Tan Li Hau")&&(document.title=e),(!z||1&n)&&E(o,"content",t[0]),4&n){let e;for(D=t[2],e=0;e<D.length;e+=1){const o=Q(t,D,e);G[e]?G[e].p(o,n):(G[e]=X(o),G[e].c(),G[e].m(r.parentNode,r))}for(;e<G.length;e+=1)G[e].d(1);G.length=D.length}if((!z||2&n)&&w(M,t[1]),(!z||1&n)&&w(S,t[0]),4&n){let e;for(tt=t[2],e=0;e<tt.length;e+=1){const o=J(t,tt,e);et[e]?et[e].p(o,n):(et[e]=Z(o),et[e].c(),et[e].m(N,H))}for(;e<et.length;e+=1)et[e].d(1);et.length=tt.length}ot&&ot.p&&8&n&&l(ot,nt,t,t[3],n,null,null)},i(t){z||(C(T.$$.fragment,t),C(ot,t),z=!0)},o(t){B(T.$$.fragment,t),B(ot,t),z=!1},d(t){f(n),f(o),f(a),u(G,t),f(r),t&&f(s),t&&f(m),t&&f(k),V(T,t),t&&f(I),t&&f(N),u(et,t),ot&&ot.d(t),t&&f(j),t&&f(W),t&&q.d()}}}function et(t,e,n){let{name:o}=e,{date:a}=e,{tags:r=[]}=e,{$$slots:s={},$$scope:c}=e;return t.$set=t=>{"name"in t&&n(0,o=t.name),"date"in t&&n(1,a=t.date),"tags"in t&&n(2,r=t.tags),"$$scope"in t&&n(3,c=t.$$scope)},[o,a,r,c,s]}class nt extends D{constructor(t){super(),z(this,t,et,tt,s,{name:0,date:1,tags:2})}}function ot(t){let e,n,o,a,r,s,c,l,u,m,v,w,x,L,k,T,I,N,_,M,P,S,U,H,O,j,q,C,B,R,Y,F,V,W,z;return{c(){e=d("p"),n=g("nonogram solver\n("),o=d("a"),a=g("https://lihautan.com/nonogram/"),r=g(")"),s=p(),c=d("ul"),l=d("li"),u=d("input"),m=g(" solving nonograms with exhaustive search + pruning"),v=d("ul"),w=d("li"),x=g("animating the exhaustive searching"),L=p(),k=d("li"),T=d("input"),I=g(" image recognition to solve nonogram"),N=d("ul"),_=d("li"),M=g("box detection"),P=d("ul"),S=d("li"),U=d("a"),H=g("https://medium.com/coinmonks/a-box-detection-algorithm-for-any-image-containing-boxes-756c15d7ed26"),O=p(),j=d("li"),q=d("a"),C=g("http://aishack.in/tutorials/sudoku-grabber-opencv-detection/"),B=p(),R=d("li"),Y=d("input"),F=g(" auto drawing? auto screenshot? overlay answers "),V=d("a"),W=g("TYPE_APPLICATION_OVERLAY"),z=g("?"),this.h()},l(t){e=b(t,"P",{});var i=$(e);n=y(i,"nonogram solver\n("),o=b(i,"A",{href:!0,rel:!0});var h=$(o);a=y(h,"https://lihautan.com/nonogram/"),h.forEach(f),r=y(i,")"),i.forEach(f),s=A(t),c=b(t,"UL",{class:!0});var d=$(c);l=b(d,"LI",{class:!0});var g=$(l);u=b(g,"INPUT",{type:!0,checked:!0,disabled:!0}),m=y(g," solving nonograms with exhaustive search + pruning"),v=b(g,"UL",{});var p=$(v);w=b(p,"LI",{});var E=$(w);x=y(E,"animating the exhaustive searching"),E.forEach(f),p.forEach(f),g.forEach(f),L=A(d),k=b(d,"LI",{class:!0});var D=$(k);T=b(D,"INPUT",{type:!0,disabled:!0}),I=y(D," image recognition to solve nonogram"),N=b(D,"UL",{});var G=$(N);_=b(G,"LI",{});var K=$(_);M=y(K,"box detection"),P=b(K,"UL",{});var J=$(P);S=b(J,"LI",{});var Q=$(S);U=b(Q,"A",{href:!0,rel:!0});var X=$(U);H=y(X,"https://medium.com/coinmonks/a-box-detection-algorithm-for-any-image-containing-boxes-756c15d7ed26"),X.forEach(f),Q.forEach(f),O=A(J),j=b(J,"LI",{});var Z=$(j);q=b(Z,"A",{href:!0,rel:!0});var tt=$(q);C=y(tt,"http://aishack.in/tutorials/sudoku-grabber-opencv-detection/"),tt.forEach(f),Z.forEach(f),J.forEach(f),K.forEach(f),G.forEach(f),D.forEach(f),B=A(d),R=b(d,"LI",{class:!0});var et=$(R);Y=b(et,"INPUT",{type:!0,disabled:!0}),F=y(et," auto drawing? auto screenshot? overlay answers "),V=b(et,"A",{href:!0,rel:!0});var nt=$(V);W=y(nt,"TYPE_APPLICATION_OVERLAY"),nt.forEach(f),z=y(et,"?"),et.forEach(f),d.forEach(f),this.h()},h(){E(o,"href","https://lihautan.com/nonogram/"),E(o,"rel","nofollow"),E(u,"type","checkbox"),u.checked=!0,u.disabled=!0,E(l,"class","task-list-item"),E(T,"type","checkbox"),T.disabled=!0,E(U,"href","https://medium.com/coinmonks/a-box-detection-algorithm-for-any-image-containing-boxes-756c15d7ed26"),E(U,"rel","nofollow"),E(q,"href","http://aishack.in/tutorials/sudoku-grabber-opencv-detection/"),E(q,"rel","nofollow"),E(k,"class","task-list-item"),E(Y,"type","checkbox"),Y.disabled=!0,E(V,"href","https://developer.android.com/reference/android/Manifest.permission.html#SYSTEM_ALERT_WINDOW"),E(V,"rel","nofollow"),E(R,"class","task-list-item"),E(c,"class","contains-task-list")},m(t,f){h(t,e,f),i(e,n),i(e,o),i(o,a),i(e,r),h(t,s,f),h(t,c,f),i(c,l),i(l,u),i(l,m),i(l,v),i(v,w),i(w,x),i(c,L),i(c,k),i(k,T),i(k,I),i(k,N),i(N,_),i(_,M),i(_,P),i(P,S),i(S,U),i(U,H),i(P,O),i(P,j),i(j,q),i(q,C),i(c,B),i(c,R),i(R,Y),i(R,F),i(R,V),i(V,W),i(R,z)},d(t){t&&f(e),t&&f(s),t&&f(c)}}}function at(t){let n,o;const a=[rt];let r={$$slots:{default:[ot]},$$scope:{ctx:t}};for(let t=0;t<a.length;t+=1)r=e(r,a[t]);return n=new nt({props:r}),{c(){R(n.$$.fragment)},l(t){Y(n.$$.fragment,t)},m(t,e){F(n,t,e),o=!0},p(t,[e]){const o=0&e?function(t,e){const n={},o={},a={$$scope:1};let r=t.length;for(;r--;){const s=t[r],c=e[r];if(c){for(const t in s)t in c||(o[t]=1);for(const t in c)a[t]||(n[t]=c[t],a[t]=1);t[r]=c}else for(const t in s)a[t]=1}for(const t in o)t in n||(n[t]=void 0);return n}(a,[(r=rt,"object"==typeof r&&null!==r?r:{})]):{};var r;1&e&&(o.$$scope={dirty:e,ctx:t}),n.$set(o)},i(t){o||(C(n.$$.fragment,t),o=!0)},o(t){B(n.$$.fragment,t),o=!1},d(t){V(n,t)}}}const rt={slug:"notes/2019-09-08 - nonogram",type:"notes",date:"2019-09-08",name:"nonogram",layout:"note"};class st extends D{constructor(t){super(),z(this,t,null,at,s,{})}}setTimeout(()=>{new st({target:document.querySelector("#app"),hydrate:!0})},3e3);
