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
      <h1>
        Li Hau's Blog{' '}
        <a href="/blog-rss.xml" target="_blank">
          <svg
            viewBox="0 0 30 30"
            style={{
              width: 15,
              height: 15,
              verticalAlign: 'bottom',
              position: 'relative',
              bottom: 4,
              fill: 'none',
              stroke: '#612e77',
            }}
          >
            <path
              d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796
            0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.795.001
            3.251 1.454 3.251 3.248zm-6.503-12.572v4.811c6.05.062 10.96 4.966
            11.022
            11.009h4.817c-.062-8.71-7.118-15.758-15.839-15.82zm0-3.368c10.58.046
            19.152 8.594 19.183
            19.188h4.817c-.03-13.231-10.755-23.954-24-24v4.812z"
            />
          </svg>
        </a>
      </h1>
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
