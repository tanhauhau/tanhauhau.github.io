import React from 'react';
import { rhythm } from '../utils/typography';

export default function ArticleFooter({ url }) {
  return (
    <>
      <hr
        style={{
          marginBottom: rhythm(1),
        }}
      />
      <p>
        Thank you for your time reading through this article.
        <br />
        It means a lot to me.
      </p>
      <p>
        {' I would appreciate if you '}
        <a href={getGoodTweetLink(url)}>tweet about it</a>
        {' or buy me a coffee.'}
        <a href="https://www.buymeacoffee.com/lihautan" target="_blank">
          <img
            src="https://cdn.buymeacoffee.com/buttons/arial-black.png"
            alt="Buy Me A Coffee"
            style={{
              height: 51,
              width: 217,
              display: 'block',
              margin: '16px auto',
            }}
          />
        </a>
      </p>
    </>
  );
}

function getGoodTweetLink(url) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    'Insightful article from @lihautan'
  )}&url=${url}`;
}

// function getBadTweetLink(url) {
//   return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
//     "I disgree with @lihautan's article"
//   )}&url=${url}`;
// }
