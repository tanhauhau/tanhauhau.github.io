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
        {' If you like what you have just read,'}
        <br />
        <a href={getGoodTweetLink(url)}>Tweet about it</a>
        {' so I will write more related articles;'}
        <br />
        {'If you disagree or you have opinions about this article,'}
        <br />
        <a href={getBadTweetLink(url)}>Tweet about it too</a>
        {' so I can take your suggestions and improve on it.'}
      </p>
    </>
  );
}

function getGoodTweetLink(url) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    'Insightful article from @lihautan'
  )}&url=${url}`;
}

function getBadTweetLink(url) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    "I disgree with @lihautan's article"
  )}&url=${url}`;
}
