import React from 'react';
import { graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/seo';
import { rhythm } from '../utils/typography';

function Projects({ data, location }) {
  const projects = data.allMarkdownRemark.edges;

  return (
    <Layout location={location} title="Back to Home Page">
      <SEO
        title="Li Hau's Projects"
        keywords={[`blog`, `gatsby`, `javascript`, `react`, 'projects']}
      />
      <h1>Li Hau's Projects</h1>
      {projects.map(
        ({
          node: {
            frontmatter: { title, description },
            fields: { website },
          },
        }) => {
          return (
            <>
              <h3
                key={website}
                style={{
                  marginBottom: rhythm(0.75),
                  marginTop: rhythm(0.75),
                }}
              >
                <a style={{ boxShadow: `none` }} href={website}>
                  {title}
                </a>
              </h3>
              <p>{description}</p>
            </>
          );
        }
      )}
      <div style={{ marginTop: rhythm(2) }} />
    </Layout>
  );
}

export default Projects;

export const pageQuery = graphql`
  query {
    allMarkdownRemark(
      filter: { fields: { type: { eq: "portfolios" }, wip: { ne: true } } }
      sort: { fields: [frontmatter___title], order: ASC }
    ) {
      edges {
        node {
          frontmatter {
            title
            description
          }
          fields {
            website
          }
        }
      }
    }
  }
`;
