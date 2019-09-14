<!-- 
tag: chrome-extension
-->

- write an article for what i've customised for my gatsby site
  - content in my head at the moment
    - dark mode
    - plugin-emoji
    - reorg on the article types
    - plugin-caption (wip)
    - rss feed

[Added 14 Sept 2019]

- parameters that's available from `pageQuery`, comes from `context` when `createPage({})`.
eg:

```js
// gatsby-node.js
createPage({
    context: {
        slug: '123',
        foo: 'bar',
    }
})

// template/blog-post.js
export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!, $foo: String!) {
  }
`
```

- if you are creating `slug` from page url, and it contains `<space>` characters, you might need to do 
`slug.replace(/\s+/g, '-')` as browser will `encodeUriComponent` of your path, and the slug may not match.

