(window.webpackJsonp=window.webpackJsonp||[]).push([[12],{"+Ud7":function(e){e.exports=JSON.parse('{"data":{"site":{"siteMetadata":{"title":"Tan Li Hau","description":"Tan Li Hau is a frontend engineer who is currently working in Shopee","author":"Tan Li Hau","siteUrl":"https://lihautan.com"}},"file":{"publicURL":"/static/profile-pic-65797d16af424cddbffebd0e19ab2f56.png"}}}')},"0WFU":function(e,t,a){"use strict";a("KKXr");var r=a("+Ud7"),n=a("q1tI"),i=a.n(n),l=a("TJpk"),o=a.n(l);t.a=function(e){var t=e.siteLanguage,a=void 0===t?"en":t,n=e.meta,l=void 0===n?[]:n,m=e.title,s=e.description,c=e.image,p=e.twitterImage,u=e.url,d=e.post,g=r.data,f=g.site,h=g.file.publicURL,y=s||f.siteMetadata.description,E=""+f.siteMetadata.siteUrl+(p||c||h),b=d.tags?d.tags.split(","):[];return i.a.createElement(i.a.Fragment,null,i.a.createElement(o.a,{htmlAttributes:{lang:a},title:m,titleTemplate:"%s | "+f.siteMetadata.title,meta:[{name:"description",content:y},{name:"image",content:E},{property:"og:image",content:E},{property:"og:title",content:m},{property:"og:description",content:y},{property:"og:type",content:"website"},{name:"twitter:site",content:"@lihautan"},{name:"twitter:card",content:p?"summary_large_image":"summary"},{name:"twitter:creator",content:f.siteMetadata.author},{name:"twitter:title",content:m},{name:"twitter:description",content:y},{name:"twitter:image",content:E}].concat(b.length>0?{name:"keywords",content:b.join(", ")}:[]).concat(l)}),i.a.createElement("script",{type:"application/ld+json"},JSON.stringify({"@context":"http://schema.org","@type":"Article",author:{"@type":"Person",name:f.siteMetadata.author},copyrightHolder:{"@type":"Person",name:f.siteMetadata.author},copyrightYear:"2019",creator:{"@type":"Person",name:f.siteMetadata.author},publisher:{"@type":"Organization",name:f.siteMetadata.author,logo:{"@type":"ImageObject",url:h}},datePublished:d.date,dateModified:d.lastUpdated||d.date,description:y,headline:m,inLanguage:a,url:""+f.siteMetadata.siteUrl+u,name:m,image:{"@type":"ImageObject",url:E},mainEntityOfPage:""+f.siteMetadata.siteUrl+u})),i.a.createElement("script",{type:"application/ld+json"},JSON.stringify({"@context":"http://schema.org","@type":"BreadcrumbList",description:"Breadcrumbs list",name:"Breadcrumbs",itemListElement:[{"@type":"ListItem",item:{"@id":f.siteMetadata.siteUrl,name:"Homepage"},position:1},{"@type":"ListItem",item:{"@id":""+f.siteMetadata.siteUrl+u,name:m},position:2}]})),i.a.createElement("meta",{itemprop:"url",content:""+f.siteMetadata.siteUrl+u}),i.a.createElement("meta",{itemprop:"image",content:E}))}},D7qs:function(e,t,a){"use strict";a.d(t,"a",(function(){return l}));var r=a("q1tI"),n=a.n(r),i=a("p3AD");function l(e){var t=e.url;return n.a.createElement(n.a.Fragment,null,n.a.createElement("hr",{style:{marginBottom:Object(i.a)(1)}}),n.a.createElement("p",null,"Thank you for your time reading through this article.",n.a.createElement("br",null),"It means a lot to me."),n.a.createElement("p",null," I would appreciate if you ",n.a.createElement("a",{href:o(t)},"tweet about it.")))}function o(e){return"https://twitter.com/intent/tweet?text="+encodeURIComponent("Insightful article from @lihautan")+"&url="+e}},wOHX:function(e,t,a){"use strict";a.r(t),a.d(t,"pageQuery",(function(){return c}));a("91GP");var r=a("q1tI"),n=a.n(r),i=a("Wbzz"),l=a("Bl7J"),o=a("0WFU"),m=a("p3AD"),s=a("D7qs");t.default=function(e){var t=e.data.markdownRemark,a=e.data.site.siteMetadata.title,r=e.pageContext,c=r.previous,p=r.next,u=r.heroImageUrl,d=r.heroTwitterImageUrl,g=t.fields.wip;return n.a.createElement(l.a,{location:e.location,title:a},n.a.createElement(o.a,{title:t.frontmatter.title,description:t.frontmatter.description||t.excerpt,image:u,twitterImage:d,url:t.fields.slug,post:t.frontmatter}),n.a.createElement("h1",null,g?"WIP: ":null,t.frontmatter.title),n.a.createElement("p",{style:Object.assign({},Object(m.b)(-.2),{display:"block"})},n.a.createElement("p",{style:{margin:0}},n.a.createElement("span",{role:"img","aria-label":"venue",style:{marginRight:4}},"📍"),t.frontmatter.venueLink?n.a.createElement("a",{target:"_blank",rel:"noopener noreferrer",href:t.frontmatter.venueLink},t.frontmatter.venue):t.frontmatter.venue),n.a.createElement("p",{style:{margin:0}},t.frontmatter.occasion?n.a.createElement(n.a.Fragment,null,n.a.createElement("span",{role:"img","aria-label":"group",style:{marginRight:4}},"👥"),n.a.createElement("a",{target:"_blank",rel:"noopener noreferrer",href:t.frontmatter.occasionLink},t.frontmatter.occasion)):null),n.a.createElement("p",{style:{margin:0}},n.a.createElement("span",{role:"img","aria-label":"date",style:{marginRight:4}},"🗓"),t.frontmatter.date),n.a.createElement("p",{style:{margin:0}},t.frontmatter.slides?n.a.createElement(n.a.Fragment,null,n.a.createElement("span",{role:"img","aria-label":"slide",style:{marginRight:4}},"📝"),n.a.createElement("a",{target:"_blank",rel:"noopener noreferrer",href:t.frontmatter.slides},"Slides")):null),n.a.createElement("p",{style:{margin:0}},t.frontmatter.video?n.a.createElement(n.a.Fragment,null,n.a.createElement("span",{role:"img","aria-label":"video",style:{marginRight:4}},"📹"),n.a.createElement("a",{target:"_blank",rel:"noopener noreferrer",href:t.frontmatter.video},"Video")):null),n.a.createElement("blockquote",{style:{marginTop:Object(m.a)(1)}},t.frontmatter.description)),t.frontmatter.slides&&n.a.createElement("iframe",{src:t.frontmatter.slides+"/embed",width:"100%",height:"320",scrolling:"no",frameborder:"0",title:"slides",webkitallowfullscreen:!0,mozallowfullscreen:!0,allowfullscreen:!0}),n.a.createElement("div",{dangerouslySetInnerHTML:{__html:t.html}}),n.a.createElement(s.a,{url:e.location.href}),n.a.createElement("hr",{style:{marginBottom:Object(m.a)(1)}}),n.a.createElement("ul",{style:{display:"flex",flexWrap:"wrap",justifyContent:"space-between",listStyle:"none",padding:0}},n.a.createElement("li",null,c&&n.a.createElement(i.Link,{to:c.fields.slug,rel:"prev"},"← ",c.frontmatter.title)),n.a.createElement("li",null,p&&n.a.createElement(i.Link,{to:p.fields.slug,rel:"next"},p.frontmatter.title," →"))))};var c="3464631507"}}]);
//# sourceMappingURL=component---src-templates-talk-post-js-db0033e9c15dae6a1ffa.js.map