import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { ThemeProvider } from "styled-components";
// import App from "./App";
import './styles.css';
// import { darkTheme, lightTheme } from "./styles";
import LamaChat from "./llama/llama";

const ThemedApp = () => {
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  return (
    <LamaChat/>
    // <ThemeProvider theme={isDarkTheme ? darkTheme : lightTheme}>
    //   <App toggleTheme={toggleTheme} isDarkTheme={isDarkTheme} />
    // </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LamaChat/>
  </React.StrictMode>,
);