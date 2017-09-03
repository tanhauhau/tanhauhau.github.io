import React from 'react';

export default function ({ className }) {
  return (
    <div className={`Page ${className}`}>
      <h3 className="Page__title">Education</h3>
      <div className="Page__row">
        <h4 className="Page__row__company">Nanyang Technological University</h4>
        <p className="Page__row__period">Aug 2012 - Present</p>
        <h4 className="Page__row__title">B.Eng in Computer Engineering, Minor in Business</h4>
        <p className="Page__row__desc">In the university, I've learned about algorithms, the concepts of OOP and Software Development LifeCycle. The curriculum is mainly group project based, we learned how to co-operate well in a team and practiced textbook knowledge through various projects and assignments.</p>
      </div>
      <div className="Page__row">
        <h4 className="Page__row__company">INTI International College Penang</h4>
        <p className="Page__row__period">Jan 2011 - May 2012</p>
        <h4 className="Page__row__title">General Certificate of Education (GCE) Advance Level</h4>
        <p className="Page__row__desc">I enjoyed taking Maths and Further Mathematics. Towards the end of my college study, I realized my interest in creating software applications.</p>
      </div>
    </div>
  )
}
