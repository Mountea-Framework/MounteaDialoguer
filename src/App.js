import React, { useEffect } from "react";

import LandingPage from "./components/LandingPage";
import DialogueCanvas from "./components/DialogueCanvas";
import { AppProvider } from "./AppContext";

import "./App.css";
import "./base/ColorPalette.css";
import "./base/BaseStyle.css";

function App() {

  useEffect(() => {
    function handleContextMenu(e) {
      e.preventDefault();
    }
    const rootElement = document.getElementById('App');
    rootElement.addEventListener('contextmenu', handleContextMenu);
    return () => {
      rootElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <AppProvider>
      <div id="App" className="App">
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
