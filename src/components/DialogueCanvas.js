import React, { useContext } from "react";

import AppContext from "../AppContext";
import LandingPage from "./LandingPage";
import DialogueEditor from "./DialogueEditor";

import "../componentStyles/DialogueCanvas.css";

const DialogueCanvas = () => {
  const { showLandingPage } = useContext(AppContext);

  return (
    <div className="dialogue-canvas">
      {showLandingPage && <LandingPage />}
      {
        <DialogueEditor></DialogueEditor>
      }
    </div>
  );
};

export default DialogueCanvas;
