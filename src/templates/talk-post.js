import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/seo';
import { rhythm, scale } from '../utils/typography';

class TalkPostTemplate extends React.Component {
  render() {
    const post = this.props.data.markdownRemark;
    const siteTitle = this.props.data.site.siteMetadata.title;
    const { previous, next } = this.props.pageContext;

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO
          title={post.frontmatter.title}
          description={post.frontmatter.description || post.excerpt}
        />
        <h1>{post.frontmatter.title}</h1>
        <p
          style={{
            ...scale(-1 / 5),
            display: `block`,
            marginBottom: rhythm(1),
            marginTop: rhythm(-0.5),
          }}
        >
          <div>
            📍
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={post.frontmatter.venueLink}
            >
              {post.frontmatter.venue}
            </a>
          </div>
          <div>
            👥
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={post.frontmatter.occasionLink}
            >
              {post.frontmatter.occasion}
            </a>
          </div>
          <div>🗓{post.frontmatter.date}</div>
          <div>
            📝
            <a
              target="_blank"
              rel="noopener noreferrer"
              href={post.frontmatter.slides}
            >
              Slides
            </a>
          </div>
        </p>

        <div>
          <blockquote>{post.frontmatter.description}</blockquote>
          <iframe
            src={post.frontmatter.slides + '/embed'}
            width="100%"
            height="320"
            scrolling="no"
            frameborder="0"
            webkitallowfullscreen
            mozallowfullscreen
            allowfullscreen
          />
        </div>

        <div dangerouslySetInnerHTML={{ __html: post.html }} />
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
                ← {previous.frontmatter.title}
              </Link>
            )}
          </li>
          <li>
            {next && (
              <Link to={next.fields.slug} rel="next">
                {next.frontmatter.title} →
              </Link>
            )}
          </li>
        </ul>
      </Layout>
    );
  }
}

export default TalkPostTemplate;

export const pageQuery = graphql`
  query TalkPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
        author
      }
    }
    markdownRemark(fields: { slug: { eq: $slug } }) {
      id
      excerpt(pruneLength: 160)
      html
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
`;
