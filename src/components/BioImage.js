import React, { useState, useEffect, useCallback } from 'react';
import Image from 'gatsby-image';
import styles from './BioImage.module.css';
export default function BioImage({ data, author }) {
  const [startLongPress, setStartLongPress] = useState(false);
  const [showImage, setShowImage] = useState(true);

  useEffect(() => {
    let timerId;
    if (startLongPress) {
      timerId = setTimeout(() => {
        setShowImage(false);
      }, 1000);
    }
    return () => {
      clearTimeout(timerId);
    };
  }, [startLongPress, setShowImage]);

  const down = useCallback(() => {
    if (showImage) {
      setStartLongPress(true);
    } else {
      setShowImage(true);
    }
  }, [showImage]);

  const up = useCallback(() => {
    if (showImage) {
      setStartLongPress(false);
    }
  }, [showImage]);

  return (
    <span
    className={`${showImage ? styles.showImage : ''} ${styles.container}`}
      onMouseDown={down}
      onMouseUp={up}
      onMouseLeave={up}
      onTouchStart={down}
      onTouchEnd={up}
      onContextMenu={event => event.preventDefault()}
    >
      <Image
        className={styles.image1}
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
      <Image
        className={styles.image2}
        fixed={data.qrCode.childImageSharp.fixed}
        alt={author}
      />
    </span>
  );
}
