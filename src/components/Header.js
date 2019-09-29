import React from 'react';
import { Link } from 'gatsby';
import ScrollIndicator from './components/ScrollIndicator';
import * as styles from './Header.module.css';

function Header({ siteTitle, hide, hideScrollIndicator }) {
  if (hide) {
    return <header />;
  }
  return (
    <>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <ul className={styles.list}>
            <li>
              <Link
                to="/"
                className={styles.link}
                activeClassName={styles.active}
              >
                {siteTitle}
              </Link>
            </li>
            <li>
              <Link
                to="/blogs/"
                className={styles.link}
                activeClassName={styles.active}
              >
                Writings
              </Link>
            </li>
            <li>
              <Link
                to="/talks/"
                className={styles.link}
                activeClassName={styles.active}
              >
                Talks
              </Link>
            </li>
            <li>
              <Link
                to="/projects/"
                className={styles.link}
                activeClassName={styles.active}
              >
                Projects
              </Link>
            </li>
            <li>
              <Link
                to="/notes/"
                className={styles.link}
                activeClassName={styles.active}
              >
                Notes
              </Link>
            </li>
            <li className={styles.spacer} />
            <li>
              <a className={styles.link} href="https://twitter.com/lihautan">
                <svg viewBox="0 0 24 24" className={styles.icon}>
                  <path
                    d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66
            10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5
            4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"
                  />
                </svg>
              </a>
            </li>
            <li>
              <a className={styles.link} href="https://github.com/tanhauhau">
                <svg viewBox="0 0 24 24" className={styles.icon}>
                  <path
                    d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0
            0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07
            5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65
            5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42
            3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
                  />
                </svg>
              </a>
            </li>
          </ul>
        </nav>
        {!hideScrollIndicator && <ScrollIndicator />}
      </header>
    </>
  );
}

export default Header;
