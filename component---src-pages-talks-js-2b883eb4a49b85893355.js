(window.webpackJsonp=window.webpackJsonp||[]).push([[9],{190:function(e,t,a){"use strict";a.r(t),a.d(t,"pageQuery",function(){return s});var n=a(0),r=a.n(n),l=a(196),i=a(198),o=a(199);var c=function(e){var t,a;function n(){return e.apply(this,arguments)||this}return a=e,(t=n).prototype=Object.create(a.prototype),t.prototype.constructor=t,t.__proto__=a,n.prototype.render=function(){var e=this.props.data,t=e.site.siteMetadata.title,a=e.allMarkdownRemark.edges;return r.a.createElement(i.a,{location:this.props.location,title:t,hideScrollIndicator:!0},r.a.createElement(o.a,{title:"Talks"}),r.a.createElement("h1",null,"Talks"),a.map(function(e){var t=e.node,a=t.fields,n=t.frontmatter;return r.a.createElement("div",{key:a.slug},r.a.createElement("h3",null,r.a.createElement(l.a,{style:{boxShadow:"none"},to:a.slug},n.title)),r.a.createElement("div",null,r.a.createElement("span",{role:"img","aria-label":"venue",style:{marginRight:4}},"📍"),r.a.createElement("a",{target:"_blank",rel:"noopener noreferrer",href:n.venueLink},n.venue)),r.a.createElement("div",null,r.a.createElement("span",{role:"img","aria-label":"group",style:{marginRight:4}},"👥"),r.a.createElement("a",{target:"_blank",rel:"noopener noreferrer",href:n.occasionLink},n.occasion)),r.a.createElement("div",null,r.a.createElement("span",{role:"img","aria-label":"date",style:{marginRight:4}},"🗓"),n.date),n.slides?r.a.createElement("div",null,r.a.createElement("span",{role:"img","aria-label":"slide",style:{marginRight:4}},"📝"),r.a.createElement("a",{target:"_blank",rel:"noopener noreferrer",href:n.slides},"Slides")):null,r.a.createElement("div",{style:{fontStyle:"italic",lineHeight:"1.5em",marginBottom:"2rem",color:"rgba(0,0,0,0.75)"}},n.description))}))},n}(r.a.Component);t.default=c;var s="918320275"},194:function(e,t,a){var n;e.exports=(n=a(197))&&n.default||n},195:function(e,t,a){"use strict";a.d(t,"a",function(){return c}),a.d(t,"b",function(){return s});var n=a(202),r=a.n(n),l=a(203),i=a.n(l);a(181);i.a.overrideThemeStyles=function(){return{"a.gatsby-resp-image-link":{boxShadow:"none"},a:{color:"#612e77",textDecoration:"underline",fontWeight:600,textShadow:"initial",backgroundImage:"initial"},pre:{overflow:"scroll"},blockquote:{borderLeftColor:"#612e77"},li:{marginBottom:0},"li > p":{marginBottom:0},"li > ul":{marginTop:0}}};var o=new r.a(i.a);var c=o.rhythm,s=o.scale},196:function(e,t,a){"use strict";a.d(t,"b",function(){return u});var n=a(0),r=a.n(n),l=a(10),i=a.n(l),o=a(58),c=a.n(o);a.d(t,"a",function(){return c.a});a(194);var s=r.a.createContext({});function m(e){var t=e.staticQueryData,a=e.data,n=e.query,l=e.render,i=a?a.data:t[n]&&t[n].data;return r.a.createElement(r.a.Fragment,null,i&&l(i),!i&&r.a.createElement("div",null,"Loading (StaticQuery)"))}var u=function(e){var t=e.data,a=e.query,n=e.render,l=e.children;return r.a.createElement(s.Consumer,null,function(e){return r.a.createElement(m,{data:t,query:a,render:n||l,staticQueryData:e})})};u.propTypes={data:i.a.object,query:i.a.string.isRequired,render:i.a.func,children:i.a.func}},197:function(e,t,a){"use strict";a.r(t);a(20);var n=a(0),r=a.n(n),l=a(10),i=a.n(l),o=a(82),c=function(e){var t=e.location,a=e.pageResources;return a?r.a.createElement(o.a,Object.assign({location:t,pageResources:a},a.json)):null};c.propTypes={location:i.a.shape({pathname:i.a.string.isRequired}).isRequired},t.default=c},198:function(e,t,a){"use strict";var n=a(0),r=a.n(n),l=(a(201),a(196)),i=a(179),o=a.n(i),c=!1;try{var s=Object.defineProperty({},"passive",{get:function(){c=!0}});window.addEventListener("testPassive",null,s),window.removeEventListener("testPassive",null,s)}catch(g){}function m(){var e=Object(n.useRef)();return Object(n.useEffect)(function(){var t=function(){var t=(document.body.scrollTop||document.documentElement.scrollTop)/(document.documentElement.scrollHeight-document.documentElement.clientHeight);e.current.style.transform="scaleX("+t+")"};return window.addEventListener("scroll",t,!!c&&{passive:!0}),function(){window.removeEventListener("scroll",t,!!c&&{passive:!0})}}),r.a.createElement("div",{className:o.a.container},r.a.createElement("div",{className:o.a.indicator,ref:e}))}var u=a(180);var d=function(e){var t=e.siteTitle,a=e.hide,n=e.hideScrollIndicator;return a?r.a.createElement("header",null):r.a.createElement(r.a.Fragment,null,r.a.createElement("header",{className:u.header},r.a.createElement("nav",{className:u.nav},r.a.createElement("ul",{className:u.list},r.a.createElement("li",null,r.a.createElement(l.a,{to:"/",className:u.link,activeClassName:u.active},t)),r.a.createElement("li",null,r.a.createElement(l.a,{to:"/blogs/",className:u.link,activeClassName:u.active},"Writings")),r.a.createElement("li",null,r.a.createElement(l.a,{to:"/talks/",className:u.link,activeClassName:u.active},"Talks")),r.a.createElement("li",null,r.a.createElement(l.a,{to:"/projects/",className:u.link,activeClassName:u.active},"Projects")),r.a.createElement("li",null,r.a.createElement(l.a,{to:"/notes/",className:u.link,activeClassName:u.active},"Notes")),r.a.createElement("li",{className:u.spacer}),r.a.createElement("li",null,r.a.createElement("a",{className:u.link,href:"https://twitter.com/lihautan"},r.a.createElement("svg",{viewBox:"0 0 24 24",className:u.icon},r.a.createElement("path",{d:"M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"})))),r.a.createElement("li",null,r.a.createElement("a",{className:u.link,href:"https://github.com/tanhauhau"},r.a.createElement("svg",{viewBox:"0 0 24 24",className:u.icon},r.a.createElement("path",{d:"M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"})))))),!n&&r.a.createElement(m,null)))},p=a(195);var v=function(e){var t,a;function n(){return e.apply(this,arguments)||this}return a=e,(t=n).prototype=Object.create(a.prototype),t.prototype.constructor=t,t.__proto__=a,n.prototype.render=function(){var e=this.props,t=e.location,a=e.title,n=e.children,l=e.hideScrollIndicator;return r.a.createElement(r.a.Fragment,null,r.a.createElement(d,{siteTitle:a,hide:"/"===t.pathname,hideScrollIndicator:l}),r.a.createElement("div",{style:{marginLeft:"auto",marginRight:"auto",maxWidth:Object(p.a)(24),padding:Object(p.a)(1.5)+" "+Object(p.a)(.75)}},r.a.createElement("main",null,n),r.a.createElement("footer",{style:{marginTop:Object(p.a)(2)}},"Built with ",r.a.createElement("span",{role:"img",className:"emoji"},"💻")," and ",r.a.createElement("span",{role:"img",className:"emoji"},"❤️"))))},n}(r.a.Component);t.a=v},199:function(e,t,a){"use strict";var n=a(200),r=a(0),l=a.n(r),i=a(10),o=a.n(i),c=a(204),s=a.n(c);function m(e){var t=e.description,a=e.lang,r=e.meta,i=e.keywords,o=e.title,c=n.data.site,m=t||c.siteMetadata.description;return l.a.createElement(s.a,{htmlAttributes:{lang:a},title:o,titleTemplate:"%s | "+c.siteMetadata.title,meta:[{name:"description",content:m},{property:"og:title",content:o},{property:"og:description",content:m},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"},{name:"twitter:creator",content:c.siteMetadata.author},{name:"twitter:title",content:o},{name:"twitter:description",content:m}].concat(i.length>0?{name:"keywords",content:i.join(", ")}:[]).concat(r)})}m.defaultProps={lang:"en",meta:[],keywords:[]},m.propTypes={description:o.a.string,lang:o.a.string,meta:o.a.array,keywords:o.a.arrayOf(o.a.string),title:o.a.string.isRequired},t.a=m},200:function(e){e.exports={data:{site:{siteMetadata:{title:"Tan Li Hau",description:"Tan Li Hau is a frontend engineer who is currently working in Shopee",author:"Tan Li Hau"}}}}}}]);
//# sourceMappingURL=component---src-pages-talks-js-2b883eb4a49b85893355.js.map