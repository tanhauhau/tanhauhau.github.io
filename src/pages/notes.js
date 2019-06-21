import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/seo';
import { rhythm } from '../utils/typography';

class NoteIndex extends React.Component {
  render() {
    const notes = this.props.data.allMarkdownRemark.edges;

    return (
      <Layout location={this.props.location} title="Back to Home Page">
        <SEO
          title="Li Hau's Notes"
          keywords={[`blog`, `gatsby`, `javascript`, `react`, 'notes']}
        />
        <h1>Li Hau's Notes</h1>
        {notes.map(({ node: { fields: { slug, noteDate, noteTitle } } }) => {
          return (
            <h4
              key={slug}
              style={{
                marginBottom: rhythm(0.75),
                marginTop: rhythm(0.75),
              }}
            >
              <Link style={{ boxShadow: `none` }} to={slug}>
                {`[${noteDate}] ${noteTitle}`}
              </Link>
            </h4>
          );
        })}
        <div style={{ marginTop: rhythm(2) }} />
      </Layout>
    );
  }
}

export default NoteIndex;

export const pageQuery = graphql`
  query {
    allMarkdownRemark(
      filter: {
        frontmatter: { wip: { ne: true } }
        fields: { type: { eq: "notes" } }
      }
      sort: { fields: [fields___noteDate], order: DESC }
    ) {
      edges {
        node {
          excerpt
          fields {
            slug
            type
            noteDate
            noteTitle
          }
        }
      }
    }
  }
`;
