import React from 'react';

const skills = [
  { skill: 'JavaScript', star: 5 },
  { skill: 'React', star: 5 },
  { skill: 'React Native', star: 5 },
  { skill: 'webpack', star: 5 },
  { skill: 'AngularJS', star: 5 },
  { skill: 'Sass', star: 5 },
  { skill: 'node.js', star: 5 },
  { skill: 'Java', star: 4 },
  { skill: 'MySQL', star: 4 },
  { skill: 'Docker', star: 4 },
  { skill: 'Git', star: 4 },
  { skill: 'Command Line', star: 4 },
];
const skillStar = [1,2,3,4,5];

export default function ({ className }) {
  return (
    <div className={`Page ${className}`}>
      <h3 className="Page__title">Profile</h3>
      <h4 className="Page__subtitle">About myself</h4>
      <p className="Page__description">
        Hi, my name is Tan Li Hau.<br />
        I am from Penang, Malaysia, currently working in Singapore.<br />
        I am a passionate frontend developer, enthusiastic with latest web technologies. I love to work in teams. I strive to deliver products with high quality.
         My core strength is my ability to think analytically and adapt to new environment easily.
      </p>
      <h4 className="Page__subtitle">Skills</h4>
      <div className="Page__skills">
        { skills.map(({ skill, star }) => (
          <div className="Page__skills__skill" key={skill}>
            <p className="Page__skills__skill__title">{ skill }</p>
            <div className="Page__skills__skill__stars">
            { skillStar.map((value, index) => (
              <span key={index} className={`Page__skills__skill__star ${value <= star ? 'Page__skills__skill__star--filled' : ''}`}>{value <= star ? '★' : '☆'}</span>
            )) }
            </div>
          </div>
        )) }
      </div>
    </div>
  )
}
