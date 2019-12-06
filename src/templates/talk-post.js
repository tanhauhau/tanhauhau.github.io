import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/seo';
import { rhythm, scale } from '../utils/typography';
import ArticleFooter from '../components/ArticleFooter';

class TalkPostTemplate extends React.Component {
  render() {
    const post = this.props.data.markdownRemark;
    const siteTitle = this.props.data.site.siteMetadata.title;
    const { previous, next } = this.props.pageContext;
    const isWip = post.fields.wip;

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <SEO
          title={post.frontmatter.title}
          description={post.frontmatter.description || post.excerpt}
        />
        <h1>
          {isWip ? 'WIP: ' : null}
          {post.frontmatter.title}
        </h1>
        <p
          style={{
            ...scale(-1 / 5),
            display: `block`,
          }}
        >
          <p style={{margin:0}}>
            <span role="img" aria-label="venue" style={{ marginRight: 4 }}>
              📍
            </span>
            {post.frontmatter.venueLink ? (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={post.frontmatter.venueLink}
              >
                {post.frontmatter.venue}
              </a>
            ) : (
              post.frontmatter.venue
            )}
          </p>
          <p style={{margin:0}}>
            {post.frontmatter.occasion ? (
              <>
                <span role="img" aria-label="group" style={{ marginRight: 4 }}>
                  👥
                </span>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={post.frontmatter.occasionLink}
                >
                  {post.frontmatter.occasion}
                </a>
              </>
            ) : null}
          </p>
          <p style={{margin:0}}>
            <span role="img" aria-label="date" style={{ marginRight: 4 }}>
              🗓
            </span>
            {post.frontmatter.date}
          </p>
          <p style={{margin:0}}>
            {post.frontmatter.slides ? (
              <>
                <span role="img" aria-label="slide" style={{ marginRight: 4 }}>
                  📝
                </span>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={post.frontmatter.slides}
                >
                  Slides
                </a>
              </>
            ) : null}
          </p>
          <p style={{margin:0}}>
            {post.frontmatter.video ? (
              <>
                <span role="img" aria-label="video" style={{ marginRight: 4 }}>
                  📹
                </span>
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href={post.frontmatter.video}
                >
                  Video
                </a>
              </>
            ) : null}
          </p>
          <blockquote style={{marginTop: rhythm(1)}}>{post.frontmatter.description}</blockquote>
        </p>
        {/* {post.frontmatter.slides && (
          <iframe
            src={post.frontmatter.slides + '/embed'}
            width="100%"
            height="320"
            scrolling="no"
            frameborder="0"
            title="slides"
            webkitallowfullscreen
            mozallowfullscreen
            allowfullscreen
          />
        )} */}

        <div dangerouslySetInnerHTML={{ __html: post.html }} />
        <ArticleFooter url={this.props.location.href} />
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
      fields {
        wip
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
        video
      }
    }
  }
`;
