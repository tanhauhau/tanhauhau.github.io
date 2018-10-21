import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import registerServiceWorker from "./registerServiceWorker";
import "./index.css";

ReactDOM.hydrate(<App />, document.querySelector(".content"));
registerServiceWorker();
