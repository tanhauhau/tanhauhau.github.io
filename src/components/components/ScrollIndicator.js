import React, { useEffect, useRef } from 'react';
import styles from './ScrollIndicator.module.css';

let supportsPassive = false;
try {
  const opts = Object.defineProperty({}, 'passive', {
    /* eslint-disable-next-line getter-return */
    get: function() {
      supportsPassive = true;
    },
  });
  window.addEventListener('testPassive', null, opts);
  window.removeEventListener('testPassive', null, opts);
} catch (e) {}

export default function ScrollIndicator() {
  const ref = useRef();

  useEffect(() => {
    const listener = () => {
      let winScroll =
        document.body.scrollTop || document.documentElement.scrollTop;
      let height =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      let scrolled = winScroll / height;
      ref.current.style.transform = `scaleX(${scrolled})`;
    };
    window.addEventListener(
      'scroll',
      listener,
      supportsPassive ? { passive: true } : false
    );

    return () => {
      window.removeEventListener(
        'scroll',
        listener,
        supportsPassive ? { passive: true } : false
      );
    };
  });

  return (
    <div className={styles.container}>
      <div className={styles.indicator} ref={ref} />
    </div>
  );
}
