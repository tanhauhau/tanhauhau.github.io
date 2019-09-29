import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/seo';
import { rhythm } from '../utils/typography';
import { sanitizeEmoji } from '../utils/emoji';

function BlogIndex({ data, location }) {
  const siteTitle = data.site.siteMetadata.title;
  const posts = data.allMarkdownRemark.edges;

  return (
    <Layout location={location} title={siteTitle} hideScrollIndicator>
      <SEO
        title="Li Hau's Blog"
        keywords={[`blog`, `gatsby`, `javascript`, `react`]}
      />
      <h1>Li Hau's Blog</h1>
      {posts.map(({ node }) => {
        const title = node.frontmatter.title || node.fields.slug;
        return (
          <div key={node.fields.slug}>
            <h3
              style={{
                marginBottom: rhythm(1 / 4),
              }}
            >
              <Link style={{ boxShadow: `none` }} to={node.fields.slug}>
                {title}
              </Link>
            </h3>
            <small>
              {node.frontmatter.date}{' '}
              {node.fields.type === 'talk' && (
                <span
                  style={{
                    backgroundColor: '#612e77',
                    color: 'white',
                    padding: '1px 6px',
                    borderRadius: 4,
                    cursor: 'default',
                    fontSize: '0.8em',
                    verticalAlign: 'bottom',
                  }}
                >
                  talk
                </span>
              )}
            </small>
            <p
              dangerouslySetInnerHTML={{
                __html: sanitizeEmoji(
                  node.frontmatter.description || node.excerpt
                ),
              }}
            />
          </div>
        );
      })}
    </Layout>
  );
}

export default BlogIndex;

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      filter: {
        fields: { type: { nin: ["notes", "portfolios"] }, wip: { ne: true } }
      }
      sort: { fields: [frontmatter___date], order: DESC }
    ) {
      edges {
        node {
          excerpt
          fields {
            slug
            type
          }
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
            description
          }
        }
      }
    }
  }
`;
