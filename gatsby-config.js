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
          `gatsby-remark-prismjs`,
          `gatsby-remark-copy-linked-files`,
          `gatsby-remark-smartypants`,
          // wrap emoji with span.emoji
          require.resolve('./plugins/gatsby/remark-emoji'),
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
    `gatsby-plugin-feed`,
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
