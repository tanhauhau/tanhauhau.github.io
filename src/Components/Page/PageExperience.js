import React from 'react';

export default function ({ className }) {
  return (
    <div className={`Page ${className}`}>
      <h3 className="Page__title">Experience</h3>
      <div className="Page__row">
        <h4 className="Page__row__company">Garena Labs, Sea Group</h4>
        <p className="Page__row__period">Aug 2017 - Present</p>
        <h4 className="Page__row__title">Software Engineer</h4>
        <p className="Page__row__desc">
          Sea is an internet platform company, focused on Greater Southeast Asia. Founded in 2009, Sea’s mission is to better the lives of the consumers and small businesses of our region with technology.
        </p>
        <div>
          <span className="Page__row__skill">React</span>
        </div>
      </div>
      <div className="Page__row">
        <h4 className="Page__row__company">Ninja Van</h4>
        <p className="Page__row__period">July 2016 - Aug 2017</p>
        <h4 className="Page__row__title">Software Engineer</h4>
        <p className="Page__row__desc">
          Launched in 2014, Ninja Van is Southeast Asia’s fastest growing last-mile logistics company, powering businesses with innovative transport solutions.<br />
          I joined Ninja Van as a software engineer. I lead in implementing style guide for a Angular powered frontend portal. I built a suite of modular, reusable Angular directives and a set of Sass utility functions.<br />
          In the begining of 2017, I worked in a team of 3 engineers, developing a React powered consumer application in 3 platforms, web, iOS and Android, within 2 months from scratch.<br />
        </p>
        <div className="Page__row__skills">
          <span className="Page__row__skill">React</span>
          <span className="Page__row__skill">React Native</span>
          <span className="Page__row__skill">AngularJS</span>
          <span className="Page__row__skill">Sass</span>
          <span className="Page__row__skill">Java</span>
          <span className="Page__row__skill">Play Framework</span>
        </div>
      </div>
      <div className="Page__row">
        <h4 className="Page__row__company">Activate Interactive</h4>
        <p className="Page__row__period">May 2015 - May 2016</p>
        <h4 className="Page__row__title">Intern - Part Time - Software Engineer</h4>
        <p className="Page__row__desc">
            Activate Interactive is a leading developer of online and mobile applications. I joined in as a intern for 10 weeks to work on a project for Health Promotion Board Singapore for their national wide campaign. After my internship, I was hired as a part time to continue working on the project.
        </p>
        <div className="Page__row__skills">
          <span className="Page__row__skill">JavaScript</span>
          <span className="Page__row__skill">Titanium SDK</span>
        </div>
      </div>
      <div className="Page__row">
        <h4 className="Page__row__company">Nanyang Technological University</h4>
        <p className="Page__row__period">Sep 2012 - Aug 2014</p>
        <h4 className="Page__row__title">Student Assistant</h4>
        <p className="Page__row__desc">
            I volunteered to work as a student assistant under my academic mentor, Prof. Lee. We worked through several projects, such as "User and Domain Driven Data Analytics as a Service Framework”, “Cybersecurity via Big data Analytics”, and etc. For the first project, I helped him to build a front-end web portal for his research project. The web portal was built using Python, Django and MySQL in the backend; Bootstrap and JQuery in the frontend. For the second project, I built a set of web-based visualisation tools aim to visualise data for their research. The visualisation tools were built using d3.js.
        </p>
        <div className="Page__row__skills">
          <span className="Page__row__skill">JQuery</span>
          <span className="Page__row__skill">d3.js</span>
          <span className="Page__row__skill">Bootstrap</span>
          <span className="Page__row__skill">Python Django</span>
        </div>
        <div className="Page__row__demo">
          <a href="/demo/1/graph.html" className="Page__row__demo__link">Demo1</a>
          <a href="/demo/2/graph.html" className="Page__row__demo__link">Demo2</a>
          <a href="/demo/3/timeline.html" className="Page__row__demo__link">Demo3</a>
        </div>
      </div>
    </div>
  )
}
