import React from 'react';
import { Link, graphql } from 'gatsby';

import Bio from '../components/bio';
import Layout from '../components/layout';
import SEO from '../components/seo';
import { rhythm } from '../utils/typography';
import styles from './index.module.css';

function Index({ data, location }) {
  const siteTitle = data.site.siteMetadata.title;
  const {
    portfolios: { edges: portfolios },
    blogs: { edges: blogs },
    talks: { edges: talks },
  } = data;

  return (
    <Layout location={location} title={siteTitle}>
      <SEO title="Home" keywords={[`blog`, `gatsby`, `javascript`, `react`]} />
      <Bio />

      <h3>
        Interesting Facts
        <span role="img" className="emoji">
          {'✌️'}
        </span>
      </h3>
      <ul style={{ marginBottom: rhythm(0.25) }}>
        <li className={styles.list}>
          {`I'm from Penang, Malaysia `}
          <span role="img" className="emoji">
            {'🇲🇾'}
          </span>
          {` and live in Singapore `}
          <span role="img" className="emoji">
            {'🇸🇬'}
          </span>
          .
        </li>
        <li className={styles.list}>
          {'I love '}
          <span role="img" className="emoji">
            {'⚛'}
          </span>{' '}
          React, and I build <Link to="/projects">projects</Link>
          {' with '}
          <span role="img" className="emoji">
            {'⚛'}
          </span>
          {' React.'}
        </li>
        <li className={styles.list}>
          I contribute to open source projects, such as{' '}
          <a
            href="https://github.com/babel/babel"
            target="_blank"
            rel="noopener noreferrer"
          >
            babel
          </a>
        </li>
        <li className={styles.list}>
          {'You can find me on '}
          <a
            href="https://twitter.com/lihautan"
            aria-label="Twitter handle: lihautan"
            target="_blank"
            rel="noreferrer noopener"
          >
            twitter
          </a>
          {', '}
          <a
            href={`https://github.com/tanhauhau`}
            aria-label="tanhauhau Github Repository"
            target="_blank"
            rel="noreferrer noopener"
          >
            Github
          </a>
          {' and '}
          <a
            href={`https://www.linkedin.com/in/lihautan/`}
            aria-label="Linkedin"
            target="_blank"
            rel="noreferrer noopener"
          >
            LinkedIn
          </a>
          .
        </li>
      </ul>

      <h3>
        Articles{' '}
        <span role="img" className="emoji">
          {'📚'}
        </span>
      </h3>
      <p className={styles.p}>Thoughts and lessons I've learned:</p>
      <ul style={{ marginBottom: rhythm(0.25) }}>
        {blogs.map(({ node: { frontmatter: { title }, fields: { slug } } }) => {
          return (
            <div key={slug}>
              <li className={styles.list}>
                <Link style={{ boxShadow: `none` }} to={slug}>
                  {title}
                </Link>
              </li>
            </div>
          );
        })}
      </ul>
      <p className={styles.p}>
        You can find the full list of articles <Link to="/blogs">here</Link>.
      </p>

      <h3>
        Open Source{' '}
        <span role="img" className="emoji">
          {'❤️'}
        </span>
      </h3>
      <p className={styles.p}>
        Since{' '}
        <Link to="/parsing-error-flow-type-parameter-instantiation">
          I stumbled upon a bug in babel
        </Link>
        , I've been actively contributing to{' '}
        <a
          href="https://github.com/babel/babel"
          target="_blank"
          rel="noopener noreferrer"
        >
          babel
        </a>
        . I am now currently a member of the babel organisation.
      </p>
      <h3>
        Projects{' '}
        <span role="img" className="emoji">
          {'💻'}
        </span>
      </h3>
      <p className={styles.p}>Cool stuff that I've been working on:</p>
      <ul style={{ marginBottom: rhythm(0.25) }}>
        {portfolios.map(
          ({
            node: {
              frontmatter: { title, description },
              fields: { website },
            },
          }) => {
            return (
              <li key={title} className={styles.list}>
                <Link style={{ boxShadow: `none` }} to={website}>
                  {title}
                </Link>{' '}
                <small>{description}</small>
              </li>
            );
          }
        )}
      </ul>
      <h3>
        Talks{' '}
        <span role="img" className="emoji">
          {'🎤'}
        </span>
      </h3>
      <ul style={{ marginBottom: rhythm(0.25) }}>
        {talks.map(
          ({
            node: {
              frontmatter: { date, title, occasion },
              fields: { slug },
            },
          }) => {
            return (
              <div key={slug}>
                <li
                  style={{
                    marginBottom: 0,
                    marginTop: 0,
                  }}
                >
                  {date} - {occasion} -{' '}
                  <Link style={{ boxShadow: `none` }} to={slug}>
                    {title}
                  </Link>
                </li>
              </div>
            );
          }
        )}
      </ul>
    </Layout>
  );
}

export default Index;

export const pageQuery = graphql`
  query {
    site {
      siteMetadata {
        title
      }
    }
    portfolios: allMarkdownRemark(
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
    blogs: allMarkdownRemark(
      filter: { fields: { type: { eq: "blog" }, wip: { ne: true } } }
      sort: { fields: [frontmatter___date], order: DESC }
      limit: 5
    ) {
      edges {
        node {
          fields {
            slug
          }
          frontmatter {
            date(formatString: "MMMM DD, YYYY")
            title
          }
        }
      }
    }
    talks: allMarkdownRemark(
      filter: { fields: { type: { eq: "talk" }, wip: { ne: true } } }
      sort: { fields: [frontmatter___date], order: DESC }
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
          }
        }
      }
    }
  }
`;
