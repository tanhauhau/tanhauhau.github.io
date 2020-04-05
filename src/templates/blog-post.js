import React from 'react';
import { Link, graphql } from 'gatsby';

import Layout from '../components/layout';
import SEO from '../components/PostSeo';
import ArticleFooter from '../components/ArticleFooter';
import { rhythm, scale } from '../utils/typography';

function BlogPostTemplate(props) {
  // TODO: NOTE: this is making XSS possible.
  // go figure out MDX so we dont need to manually execute scripts in the .md
  const blogRef = React.useRef();
  React.useEffect(() => {
    const scripts = blogRef.current.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.innerHTML) {
        /* eslint-disable no-eval */
        window.eval(script.innerHTML);
      } else if (script.src) {
        const s = document.createElement('script');
        s.async = script.async;
        s.src = script.src;
        document.head.appendChild(s);
      }
    });
  }, []);

  React.useEffect(() => {
    if (window.innerWidth > 1080) {
      const script = document.createElement('script');
      script.async = true;
      script.type = 'text/javascript';
      script.src =
        '//cdn.carbonads.com/carbon.js?serve=CE7ITK3E&placement=lihautancom';
      script.id = '_carbonads_js';
      document.body.appendChild(script);
      console.log('script', script);
    }
    return () => {
      try {
        const ad = document.getElementById('carbonads');
        ad.parentNode.removeChild(ad);
      } catch (error) {
        // ignore them
      }
    };
  }, []);

  const post = props.data.markdownRemark;
  const siteTitle = props.data.site.siteMetadata.title;
  const url = props.data.site.siteMetadata.siteUrl + post.fields.slug;
  const {
    previous,
    next,
    heroImageUrl,
    heroTwitterImageUrl,
  } = props.pageContext;
  const isWip = post.fields.wip;

  return (
    <Layout location={props.location} title={siteTitle}>
      <article
        itemscope
        itemtype="http://schema.org/Article"
        itemprop="mainEntity"
      >
        <SEO
          title={post.frontmatter.title}
          description={post.frontmatter.description || post.excerpt}
          image={heroImageUrl}
          twitterImage={heroTwitterImageUrl}
          url={post.fields.slug}
          post={post.frontmatter}
        />
        <h1 itemprop="name headline">
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
          <time
            itemprop="datePublished"
            dateTime={post.frontmatter.dateTimestamp}
          >
            {post.frontmatter.date}
          </time>
          {post.frontmatter.lastUpdated && (
            <span style={{ fontStyle: 'italic', marginLeft: rhythm(0.2) }}>
              (Last updated:{' '}
              <time
                itemprop="dateUpdated"
                dateTime={post.frontmatter.lastUpdatedTimestamp}
              >
                {post.frontmatter.lastUpdated}
              </time>
              )
            </span>
          )}
        </p>
        <div
          itemprop="articleBody"
          ref={blogRef}
          dangerouslySetInnerHTML={{ __html: post.html }}
        />
      </article>
      <ArticleFooter url={url} />
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

export default BlogPostTemplate;

export const pageQuery = graphql`
  query BlogPostBySlug($slug: String!) {
    site {
      siteMetadata {
        title
        author
        siteUrl
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
        dateTimestamp: date(formatString: "YYYY-MM-DDThh:mm:ssz")
        date(formatString: "MMMM DD, YYYY")
        lastUpdatedTimestamp: lastUpdated(formatString: "YYYY-MM-DDThh:mm:ssz")
        lastUpdated(formatString: "MMMM DD, YYYY")
        description
        tags
      }
    }
  }
`;
