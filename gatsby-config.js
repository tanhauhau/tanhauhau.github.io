module.exports = {
  siteMetadata: {
    title: `Tan Li Hau`,
    author: `Tan Li Hau`,
    description: `Tan Li Hau is a frontend engineer who is currently working in Shopee`,
    siteUrl: `https://lihautan.com`,
    social: {
      twitter: `lihautan`,
      github: 'tanhauhau',
      stackOverflow: `1513547/lihau-tan`,
      linkedIn: `lihautan`,
    },
  },
  plugins: [
    ...['blog', 'talk', 'notes', 'portfolios'].map(type => ({
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/${type}`,
        name: type,
      },
    })),
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/content/assets`,
        name: `assets`,
      },
    },
    {
      resolve: `gatsby-transformer-remark`,
      options: {
        plugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 590,
            },
          },
          {
            resolve: `gatsby-remark-responsive-iframe`,
            options: {
              wrapperStyle: `margin-bottom: 1.0725rem`,
            },
          },
          // add filename in code snippets, do it before prismjs
          require.resolve('./plugins/gatsby/remark-filename'),
          `gatsby-remark-prismjs`,
          `gatsby-remark-copy-linked-files`,
          `gatsby-remark-smartypants`,
          // wrap emoji with span.emoji
          require.resolve('./plugins/gatsby/remark-emoji'),
          // wrap img + caption with figure & figcaption
          require.resolve('./plugins/gatsby/remark-caption'),
          // add ids and links to header
          {
            resolve: `gatsby-remark-autolink-headers`,
            options: {
              offsetY: 70,
            },
          },
        ],
      },
    },
    `gatsby-transformer-sharp`,
    `gatsby-plugin-sharp`,
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: `UA-135921142-1`,
      },
    },
    {
      resolve: `gatsby-plugin-feed`,
      options: {
        feeds: [
          {
            filter: 'in: ["blog", "talk"]',
            title: "Tan Li Hau's RSS Feed",
            outputFile: 'rss.xml',
            include: true,
          },
          {
            filter: 'eq: "blog"',
            title: "Tan Li Hau's Blog RSS Feed",
            outputFile: 'blog-rss.xml',
            include: false,
          },
          {
            filter: 'eq: "talk"',
            title: "Tan Li Hau's Talk RSS Feed",
            outputFile: 'talk-rss.xml',
            include: false,
          },
        ].map(feed => {
          return {
            serialize: ({ query: { site, allMarkdownRemark } }) => {
              return allMarkdownRemark.edges.map(edge => {
                return Object.assign({}, edge.node.frontmatter, {
                  description: edge.node.frontmatter.description || edge.node.excerpt,
                  date: edge.node.frontmatter.date,
                  url: site.siteMetadata.siteUrl + edge.node.fields.slug,
                  guid: site.siteMetadata.siteUrl + edge.node.fields.slug,
                  custom_elements: [{ 'content:encoded': edge.node.html }],
                });
              });
            },
            query: `{
              site {
                siteMetadata {
                  title
                  description
                  siteUrl
                  site_url: siteUrl
                }
              }
              allMarkdownRemark(
                filter: {
                  fields: {
                    type: {
                      ${feed.filter}
                    },
                    wip: { ne: true }
                  }
                }
                sort: { fields: [frontmatter___date], order: DESC }
              ) {
                edges {
                  node { 
                    fields { 
                      slug
                     }
                    frontmatter {
                      date
                      title
                      description
                    }
                    html
                    excerpt
                  }
                }
              }
            }`,
            output: feed.outputFile,
            title: feed.title,
            match: feed.include
              ? undefined
              : 'DO_NOT_INCLUDE_RSS_FEED_INTO_HTML',
          };
        }),
      },
    },
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Tan Li Hau`,
        short_name: `Tan Li Hau`,
        start_url: `/`,
        background_color: `#faf0fd`,
        theme_color: `#612e77`,
        display: `fullscreen`,
        icon: `content/assets/profile-pic.png`,
      },
    },
    `gatsby-plugin-offline`,
    `gatsby-plugin-react-helmet`,
    {
      resolve: `gatsby-plugin-typography`,
      options: {
        pathToConfigModule: `src/utils/typography`,
      },
    },
    `gatsby-plugin-sitemap`,
  ],
};
