import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/seo';
import { rhythm, scale } from '../utils/typography';

class NotePostTemplate extends React.Component {
  render() {
    const {
      markdownRemark: {
        html,
        excerpt,
        fields: { noteDate, noteTitle },
      },
    } = this.props.data;
    console.log(html);
    const { previous, next } = this.props.pageContext;
    return (
      <Layout location={this.props.location} title="Li Hau's Notes">
        <SEO title={noteTitle} description={excerpt} />
        <h1>
          <span style={{ ...scale(1 / 2) }}>[{noteDate}]</span> {noteTitle}
        </h1>
        <div dangerouslySetInnerHTML={{ __html: html }} />
        <hr
          style={{
            marginBottom: rhythm(1),
          }}
        />

        <ul
          style={{
            display: `flex`,
            flexWrap: `wrap`,
            justifyContent: `space-between`,
            listStyle: `none`,
            padding: 0,
          }}
        >
          <li>
            {previous && (
              <Link to={previous.fields.slug} rel="prev">
                ← [{previous.fields.noteDate}] {previous.fields.noteTitle}
              </Link>
            )}
          </li>
          <li>
            {next && (
              <Link to={next.fields.slug} rel="next">
                [{next.fields.noteDate}] {next.fields.noteTitle} →
              </Link>
            )}
          </li>
        </ul>
      </Layout>
    );
  }
}

export default NotePostTemplate;

export const pageQuery = graphql`
  query NotePostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
        author
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      excerpt(pruneLength: 160)
      fields {
        noteDate
        noteTitle
      }
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
      }
    }
  }
`;
