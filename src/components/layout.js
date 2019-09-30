import React from 'react';
import Header from './Header';
import { rhythm } from '../utils/typography';

class Layout extends React.Component {
  render() {
    const {
      location,
      title,
      children,
      hideScrollIndicator,
    } = this.props;
    const rootPath = `${__PATH_PREFIX__}/`;

    return (
      <>
        <Header
          siteTitle={title}
          hide={location.pathname === rootPath}
          hideScrollIndicator={hideScrollIndicator}
        />
        <div
          style={{
            marginLeft: `auto`,
            marginRight: `auto`,
            maxWidth: rhythm(24),
            padding: `${rhythm(1.5)} ${rhythm(3 / 4)}`,
          }}
        >
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
          </footer>
        </div>
      </>
    );
  }
}

export default Layout;
