import React from "react";
import ReactDOM from "react-dom/client";
import './styles.css';
import LamaChat from "./llama/llama";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LamaChat/>
  </React.StrictMode>,
);