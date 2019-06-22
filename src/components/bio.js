/**
 * Bio component that queries for data
 * with Gatsby's StaticQuery component
 *
 * See: https://www.gatsbyjs.org/docs/static-query/
 */

import React from 'react';
import { StaticQuery, graphql } from 'gatsby';
import BioImage from './BioImage';

function Bio() {
  return (
    <StaticQuery
      query={bioQuery}
      render={data => {
        const { author } = data.site.siteMetadata;
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
              <BioImage data={data} author={author} />

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
    qrCode: file(absolutePath: { regex: "/vcard-qr-code.png/" }) {
      childImageSharp {
        fixed(width: 230, height: 230) {
          ...GatsbyImageSharpFixed
        }
      }
    }
    site {
      siteMetadata {
        author
      }
    }
  }
`;

export default Bio;
