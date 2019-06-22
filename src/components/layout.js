import React from 'react';
import { Link } from 'gatsby';

import { rhythm } from '../utils/typography';

class Layout extends React.Component {
  render() {
    const { location, title, children } = this.props;
    const rootPath = `${__PATH_PREFIX__}/`;
    let header;

    if (location.pathname === rootPath) {
      header = null;
    } else {
      header = (
        <h3
          style={{
            fontFamily: `Montserrat, sans-serif`,
            marginTop: 0,
          }}
        >
          <Link
            style={{
              boxShadow: `none`,
              textDecoration: `none`,
              color: `inherit`,
            }}
            to={`/`}
          >
            {title}
          </Link>
        </h3>
      );
    }

    return (
      <div
        style={{
          marginLeft: `auto`,
          marginRight: `auto`,
          maxWidth: rhythm(24),
          padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
        }}
      >
        <header>{header}</header>
        <main>{children}</main>
        <footer style={{ marginTop: rhythm(2) }}>
          {'Built with '}
          <span role="img" className="emoji">
            {'💻'}
          </span>
          {' and '}
          <span role="img" className="emoji">
            {'❤️'}
          </span>
          {' • '}
          <Link to={`/notes`}>notes</Link>
          {' • '}
          <a href="https://twitter.com/lihautan">twitter</a>
          {' • '}
          <a href="https://github.com/tanhauhau">github</a>
          {' • '}
          <a href="https://github.com/tanhauhau/tanhauhau.github.io/issues/new?assignees=&labels=grammar%2C+typo&template=fix-typos-and-grammars.md&title=%5BTYPO%5D">
            discuss
          </a>
        </footer>
      </div>
    );
  }
}

export default Layout;
