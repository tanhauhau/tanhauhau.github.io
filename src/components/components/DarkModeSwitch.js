import React, { useState, useEffect } from 'react';
import './theme-mode.css';

const DARK_MODE = 'mode--dark';
export default function() {
  const [darkMode, setDarkMode] = useDarkMode();
  const onClick = event => {
    setDarkMode(event.target.checked);
    /* eslint-disable no-restricted-globals */
    self.ga &&
      self.ga('send', 'event', {
        eventCategory: 'ux',
        eventAction: 'click',
        eventLabel: 'dark mode',
      });
  };

  return (
    <label className="dark-mode-checkbox">
      <input type="checkbox" checked={darkMode} onChange={onClick} />
      <span className="sun">{'🌞'}</span>
      <span className="moon">{'🌝'}</span>
    </label>
  );
}

const DARK_MODE_COOKIE = 'DARK_MODE';
const DARK_MODE_REGEX = new RegExp(`^${DARK_MODE_COOKIE}=`);
const getDarkModeFromCookie = () => {
  if (typeof document !== 'undefined') {
    const cookie = document.cookie
      .split(';')
      .filter(str => str.trim().match(DARK_MODE_REGEX));
    if (cookie.length) {
      return cookie[0].replace(DARK_MODE_REGEX, '').trim() === 'true';
    }
  }
  return false;
};
const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(getDarkModeFromCookie);

  // set class name
  useEffect(() => {
    const classList = document.body.classList;
    if (darkMode) {
      classList.add(DARK_MODE);
    } else {
      classList.remove(DARK_MODE);
    }
  }, [darkMode]);

  // set cookie
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.cookie = `${DARK_MODE_COOKIE}=${darkMode}; expires=Thu, Dec 31 2111 00:00:00 UTC`;
    }
  }, [darkMode]);

  return [darkMode, setDarkMode];
};
