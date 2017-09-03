import React from 'react';

export default function ({ className }) {
  return (
    <div className={`Page ${className}`}>
      <h3 className="Page__title">Contact</h3>
      <a href="mailto:lhtan93@gmail.com" className="Page__row__demo__link">Email</a>
      <a href="https://github.com/tanhauhau" className="Page__row__demo__link">Github</a>
      <a href="https://sg.linkedin.com/in/lihautan" className="Page__row__demo__link">LinkedIn</a>

      <div className="Page__credits">Icons made by <a href="https://www.flaticon.com/authors/smashicons" title="Smashicons">Smashicons</a> and <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
    </div>
  )
}
