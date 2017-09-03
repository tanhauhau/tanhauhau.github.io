import React from 'react';

export default function ({ className }) {
  return (
    <div className={`Page ${className}`}>
      <h3 className="Page__title">Projects</h3>
      <h4 className="Page__subtitle">NTU Timetable Android App</h4>
      <p className="Page__description">
        I developed a native Android application that fetches timetable information from NTU school portal.
        The app shows the user their timetable and reminds the user on their next class to attend.
      </p>
      <a className="Page__row__demo__link" href="https://play.google.com/store/apps/details?id=com.lhtan.ntutimetable">Go to Play Store</a>
      <div className="Page__space" />
      <h4 className="Page__subtitle">Distributed Systems Project</h4>
      <p className="Page__description">
        In a team of 3, we designed and implemented a distributed system for remote file access based on client-server architecture.
        The client-server communication is carried out using UDP. We experimented with different invocation semantics: at-least-once and at-most-once, and compared their results from non-idempotent operations.
        The client and server programs were written in Java.
      </p>
      <a className="Page__row__demo__link" href="https://github.com/tanhauhau/Bueno4013/tree/master">Go to Play Store</a>
      <div className="Page__space" />
      <h4 className="Page__subtitle">Multi-Disciplinary Project</h4>
      <p className="Page__description">
        In a team of 8, we built a robotic system that can autonomously explore and traverse unknown areas. I was the Chief Arduino Engineer, taking the lead of designing the robot's obstacle detection and alignment algorithm.
      </p>
      <iframe className="Page__video" src="https://www.youtube.com/embed/aDH1NMdzuYA" frameborder="0" allowfullscreen></iframe>
    </div>
  )
}
