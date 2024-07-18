import React, { useContext } from "react";

import AppContext from "../AppContext";
import LandingPage from "./LandingPage";

import "../componentStyles/DialogueCanvas.css";

const DialogueCanvas = () => {
  const { showLandingPage } = useContext(AppContext);

  return (
    <div className="dialogue-canvas">
      {showLandingPage && <LandingPage />}
      {
        /* Add other components that should be rendered when LandingPage is hidden */
      }
    </div>
  );
};

export default DialogueCanvas;
