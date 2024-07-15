import React from 'react';

import LandingPage from './components/LandingPage';

import './App.css';
import "./base/ColorPalette.css"
import "./base/BaseStyle.css"

function App() {
  return (
    <div className="App background">
      <LandingPage />
      <footer className="footer">
        <p>app version: 0.0.0.1a</p>
      </footer>
    </div>
  );
}

export default App;
