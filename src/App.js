import React from "react";

import LandingPage from "./components/LandingPage";
import { AppProvider } from "./AppContext";

import "./App.css";
import "./base/ColorPalette.css";
import "./base/BaseStyle.css";

function App() {
  return (
    <AppProvider>
      <div className="App background">
        <LandingPage />
        <footer className="footer">
          <p>app version: 0.0.0.1a</p>
        </footer>
      </div>
    </AppProvider>
  );
}

export default App;
