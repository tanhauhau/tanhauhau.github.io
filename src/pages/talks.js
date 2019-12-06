import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/seo';

class TalkPage extends React.Component {
  render() {
    const { data } = this.props;
    const siteTitle = data.site.siteMetadata.title;
    const talks = data.allMarkdownRemark.edges;

    return (
      <Layout
        location={this.props.location}
        title={siteTitle}
        hideScrollIndicator
      >
        <SEO title="Talks" />
        <h1>Talks</h1>
        {talks.map(talk => {
          const { fields, frontmatter } = talk.node;
          return (
            <div key={fields.slug}>
              <h3>
                <Link style={{ boxShadow: `none` }} to={fields.slug}>
                  {frontmatter.title}
                </Link>
              </h3>
              <div>
                <span role="img" aria-label="venue" style={{ marginRight: 4 }}>
                  📍
                </span>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={frontmatter.venueLink}
                >
                  {frontmatter.venue}
                </a>
              </div>
              <div>
                <span role="img" aria-label="group" style={{ marginRight: 4 }}>
                  👥
                </span>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={frontmatter.occasionLink}
                >
                  {frontmatter.occasion}
                </a>
              </div>
              <div>
                <span role="img" aria-label="date" style={{ marginRight: 4 }}>
                  🗓
                </span>
                {frontmatter.date}
              </div>
              {frontmatter.slides ? (
                <div>
                  <span
                    role="img"
                    aria-label="slide"
                    style={{ marginRight: 4 }}
                  >
                    📝
                  </span>
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={frontmatter.slides}
                  >
                    Slides
                  </a>
                </div>
              ) : null}
              <div
                style={{
                  fontStyle: 'italic',
                  lineHeight: '1.5em',
                  marginBottom: '2rem',
                  color: 'rgba(0,0,0,0.75)',
                }}
              >
                {frontmatter.description}
              </div>
            </div>
          );
        })}
      </Layout>
    );
  }
}

export default TalkPage;

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    allMarkdownRemark(
      sort: {order: DESC, fields: [frontmatter___date]}
      filter: { fields: { type: { eq: "talk" }, wip: { ne: true } } }
    ) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
            occasion
            occasionLink
            venue
            venueLink
            description
            slides
          }
        }
      }
    }
  }
`;
