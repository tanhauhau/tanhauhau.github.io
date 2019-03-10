/**
 * Bio component that queries for data
 * with Gatsby's StaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/static-query/
 */

import React from 'react';
import { StaticQuery, graphql } from 'gatsby';
import Image from 'gatsby-image';

function Bio() {
  return (
    <StaticQuery
      query={bioQuery}
      render={data => {
        const { author, social } = data.site.siteMetadata;
        return (
          <div
            style={{
              margin: 'auto',
            }}
          >
            <div
              style={{
                margin: '0px auto 60px',
                textAlign: 'center',
                maxWidth: '100%',
              }}
            >
              <Image
                fixed={data.largeAvatar.childImageSharp.fixed}
                alt={author}
                style={{
                  padding: 4,
                  border: '4px dotted #8b679b',
                  borderRadius: `50%`,
                }}
                imgStyle={{
                  borderRadius: `50%`,
                }}
              />

              <h1>Tan Li Hau</h1>
              <h2>
                {'Frontend Developer at '}
                <a
                  href="https://www.linkedin.com/company/shopee/"
                  aria-label="Shopee LinkedIn page"
                >
                  Shopee
                </a>
              </h2>
              <h3
                style={{
                  lineHeight: 1.4,
                }}
              >
                {'I '}
                <a
                  href={`https://github.com/${social.github}`}
                  aria-label="Li Hau's Github Repository"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  contribute
                </a>
                {' to open source, blog and '}
                <a
                  href={`https://stackoverflow.com/users/${
                    social.stackOverflow
                  }`}
                  aria-label="StackOverflow profile"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  answer questions
                </a>
                {
                  ' about JavaScript. If you find me interesting, you can connect with me via '
                }
                <a
                  href={`https://www.linkedin.com/in/${social.linkedIn}/`}
                  aria-label="Linkedin"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  LinkedIn
                </a>
                .
              </h3>
            </div>
          </div>
        );
      }}
    />
  );
}

const bioQuery = graphql`
  query BioQuery {
    avatar: file(absolutePath: { regex: "/profile-pic.png/" }) {
      childImageSharp {
        fixed(width: 50, height: 50) {
          ...GatsbyImageSharpFixed
        }
      }
    }
    largeAvatar: file(absolutePath: { regex: "/profile-pic.png/" }) {
      childImageSharp {
        fixed(width: 230, height: 230) {
          ...GatsbyImageSharpFixed
        }
      }
    }
    site {
      siteMetadata {
        author
        social {
          github
          stackOverflow
          linkedIn
        }
      }
    }
  }
`;

export default Bio;
