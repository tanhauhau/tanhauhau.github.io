(window.webpackJsonp=window.webpackJsonp||[]).push([[8],{189:function(e,t,a){"use strict";a.r(t),a.d(t,"pageQuery",function(){return s});var n=a(0),r=a.n(n),o=a(197),i=a(198),c=a(194);t.default=function(e){var t=e.data,a=e.location,n=t.allMarkdownRemark.edges;return r.a.createElement(o.a,{location:a,title:"Back to Home Page"},r.a.createElement(i.a,{title:"Li Hau's Projects",keywords:["blog","gatsby","javascript","react","projects"]}),r.a.createElement("h1",null,"Li Hau's Projects"),n.map(function(e){var t=e.node,a=t.frontmatter,n=a.title,o=a.description,i=t.fields.website;return r.a.createElement(r.a.Fragment,null,r.a.createElement("h3",{key:i,style:{marginBottom:Object(c.a)(.75),marginTop:Object(c.a)(.75)}},r.a.createElement("a",{style:{boxShadow:"none"},href:i},n)),r.a.createElement("p",null,o))}),r.a.createElement("div",{style:{marginTop:Object(c.a)(2)}}))};var s="3054593235"},193:function(e,t,a){var n;e.exports=(n=a(196))&&n.default||n},194:function(e,t,a){"use strict";a.d(t,"a",function(){return s}),a.d(t,"b",function(){return l});var n=a(200),r=a.n(n),o=a(201),i=a.n(o);a(180);i.a.overrideThemeStyles=function(){return{"a.gatsby-resp-image-link":{boxShadow:"none"},a:{color:"#612e77",textDecoration:"underline",fontWeight:600,textShadow:"initial",backgroundImage:"initial"},pre:{overflow:"scroll"},blockquote:{borderLeftColor:"#612e77"},li:{marginBottom:0},"li > p":{marginBottom:0},"li > ul":{marginTop:0}}};var c=new r.a(i.a);var s=c.rhythm,l=c.scale},195:function(e,t,a){"use strict";a.d(t,"b",function(){return m});var n=a(0),r=a.n(n),o=a(11),i=a.n(o),c=a(59),s=a.n(c);a.d(t,"a",function(){return s.a});a(193);var l=r.a.createContext({});function u(e){var t=e.staticQueryData,a=e.data,n=e.query,o=e.render,i=a?a.data:t[n]&&t[n].data;return r.a.createElement(r.a.Fragment,null,i&&o(i),!i&&r.a.createElement("div",null,"Loading (StaticQuery)"))}var m=function(e){var t=e.data,a=e.query,n=e.render,o=e.children;return r.a.createElement(l.Consumer,null,function(e){return r.a.createElement(u,{data:t,query:a,render:n||o,staticQueryData:e})})};m.propTypes={data:i.a.object,query:i.a.string.isRequired,render:i.a.func,children:i.a.func}},196:function(e,t,a){"use strict";a.r(t);a(20);var n=a(0),r=a.n(n),o=a(11),i=a.n(o),c=a(85),s=function(e){var t=e.location,a=e.pageResources;return a?r.a.createElement(c.a,Object.assign({location:t,pageResources:a},a.json)):null};s.propTypes={location:i.a.shape({pathname:i.a.string.isRequired}).isRequired},t.default=s},197:function(e,t,a){"use strict";var n=a(0),r=a.n(n),o=a(195),i=a(194);var c=function(e){var t,a;function n(){return e.apply(this,arguments)||this}return a=e,(t=n).prototype=Object.create(a.prototype),t.prototype.constructor=t,t.__proto__=a,n.prototype.render=function(){var e,t=this.props,a=t.location,n=t.title,c=t.children;return e="/"===a.pathname?null:r.a.createElement("h3",{style:{fontFamily:"Montserrat, sans-serif",marginTop:0}},r.a.createElement(o.a,{style:{boxShadow:"none",textDecoration:"none",color:"inherit"},to:"/"},n)),r.a.createElement("div",{style:{marginLeft:"auto",marginRight:"auto",maxWidth:Object(i.a)(24),padding:Object(i.a)(1.5)+" "+Object(i.a)(.75)}},r.a.createElement("header",null,e),r.a.createElement("main",null,c),r.a.createElement("footer",{style:{marginTop:Object(i.a)(2)}},"Built with ",r.a.createElement("span",{role:"img",className:"emoji"},"💻")," and ",r.a.createElement("span",{role:"img",className:"emoji"},"❤️")," • ",r.a.createElement(o.a,{to:"/notes"},"notes")," • ",r.a.createElement("a",{href:"https://twitter.com/lihautan"},"twitter")," • ",r.a.createElement("a",{href:"https://github.com/tanhauhau"},"github")," • ",r.a.createElement("a",{href:"https://github.com/tanhauhau/tanhauhau.github.io/issues/new?assignees=&labels=grammar%2C+typo&template=fix-typos-and-grammars.md&title=%5BTYPO%5D"},"discuss")))},n}(r.a.Component);t.a=c},198:function(e,t,a){"use strict";var n=a(199),r=a(0),o=a.n(r),i=a(11),c=a.n(i),s=a(202),l=a.n(s);function u(e){var t=e.description,a=e.lang,r=e.meta,i=e.keywords,c=e.title,s=n.data.site,u=t||s.siteMetadata.description;return o.a.createElement(l.a,{htmlAttributes:{lang:a},title:c,titleTemplate:"%s | "+s.siteMetadata.title,meta:[{name:"description",content:u},{property:"og:title",content:c},{property:"og:description",content:u},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"},{name:"twitter:creator",content:s.siteMetadata.author},{name:"twitter:title",content:c},{name:"twitter:description",content:u}].concat(i.length>0?{name:"keywords",content:i.join(", ")}:[]).concat(r)})}u.defaultProps={lang:"en",meta:[],keywords:[]},u.propTypes={description:c.a.string,lang:c.a.string,meta:c.a.array,keywords:c.a.arrayOf(c.a.string),title:c.a.string.isRequired},t.a=u},199:function(e){e.exports={data:{site:{siteMetadata:{title:"Tan Li Hau",description:"Tan Li Hau is a frontend engineer who is currently working in Shopee",author:"Tan Li Hau"}}}}}}]);
//# sourceMappingURL=component---src-pages-projects-js-9fc706a83ea3a70ce243.js.map