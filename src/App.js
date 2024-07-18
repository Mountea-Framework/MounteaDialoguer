import React from "react";

import LandingPage from "./components/LandingPage";
import DialogueCanvas from "./components/DialogueCanvas";
import { AppProvider } from "./AppContext";

import "./App.css";
import "./base/ColorPalette.css";
import "./base/BaseStyle.css";

function App() {
  return (
    <AppProvider>
      <div className="App">
        <DialogueCanvas>
          <LandingPage />
        </DialogueCanvas>
        <footer className="footer">
          <p>app version: 0.0.0.1a</p>
        </footer>
      </div>
    </AppProvider>
  );
}

export default App;
