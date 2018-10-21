import React from "react";
import HeroImage from "./HeroImage";

class Main extends React.Component {
  render() {
    return (
      <React.Fragment>
        <div className="personal-info">
          <HeroImage />
          <h1 className="blurb">Hello, I'm Li Hau!</h1>
          <h2 className="blurb-subtitle">
            A passionate frontend developer at Shopee
          </h2>
          <ul className="connections">
            <li key="gh">
              <a
                href="https://github.com/tanhauhau"
                alt="Github"
                target="_blank"
                rel="noreferrer noopener"
              >
                <i className="fab fa-github" />
              </a>
            </li>
            <li key="li">
              <a
                href="https://www.linkedin.com/in/lihautan/"
                alt="Linkedin"
                target="_blank"
                rel="noreferrer noopener"
              >
                <i className="fab fa-linkedin-in" />
              </a>
            </li>
            <li key="so">
              <a
                href="https://stackoverflow.com/users/1513547/lihau-tan"
                alt="Stackoverflow"
                target="_blank"
                rel="noreferrer noopener"
              >
                <i className="fab fa-stack-overflow" />
              </a>
            </li>
            <li key="mail">
              <a
                href="mailto:lhtan93@gmail.com"
                alt="Email"
                rel="noreferrer noopener"
              >
                <i className="fas fa-at" />
              </a>
            </li>
          </ul>
        </div>
      </React.Fragment>
    );
  }
}

export default Main;
