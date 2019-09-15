import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/PostSeo';
import ArticleFooter from '../components/ArticleFooter';
import { rhythm, scale } from '../utils/typography';
import ScrollIndicator from '../components/components/ScrollIndicator';

class BlogPostTemplate extends React.Component {
  render() {
    const post = this.props.data.markdownRemark;
    const siteTitle = this.props.data.site.siteMetadata.title;
    const {
      previous,
      next,
      heroImageUrl,
      heroTwitterImageUrl,
    } = this.props.pageContext;
    const isWip = post.fields.wip;

    return (
      <Layout location={this.props.location} title={siteTitle}>
        <ScrollIndicator />
        <SEO
          title={post.frontmatter.title}
          description={post.frontmatter.description || post.excerpt}
          image={heroImageUrl}
          twitterImage={heroTwitterImageUrl}
          url={post.fields.slug}
          post={post.frontmatter}
        />
        <h1>
          {isWip ? 'WIP: ' : null}
          {post.frontmatter.title}
        </h1>
        <p
          style={{
            ...scale(-1 / 5),
            display: `block`,
            marginBottom: rhythm(1),
            marginTop: rhythm(-0.5),
          }}
        >
          {post.frontmatter.date}
          {post.frontmatter.lastUpdated && (
            <span style={{ fontStyle: 'italic', marginLeft: rhythm(0.2) }}>
              (Last updated: {post.frontmatter.lastUpdated})
            </span>
          )}
        </p>
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

export default BlogPostTemplate;

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
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
        slug
        wip
      }
      frontmatter {
        title
        date(formatString: "MMMM DD, YYYY")
        lastUpdated(formatString: "MMMM DD, YYYY")
        description
        tags
      }
    }
  }
`;
