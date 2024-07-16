import React, { useState } from "react";

import Title from "./objects/Title";
import TextInput from "./objects/TextInput";
import Button from "./objects/Button";

import "../componentStyles/NewProject.css";

function NewProject({ onContinue, onNewProjectClick }) {
  const [dialogueName, setDialogueName] = useState("");
  const [highlight, setHighlight] = useState(false);

  const handleInputChange = (name, value) => {
    setDialogueName(value);
  };

  const handleContinueClick = () => {
    if (dialogueName) {
      onContinue(dialogueName);
      onNewProjectClick();
    } else {
      setHighlight(true);
      setTimeout(() => setHighlight(false), 1000);
    }
  };

  const handleProjectNameClick = () => {
    onNewProjectClick();
  };

  return (
    <div>
      <Title level="2" children="New Project" className="secondary-headign"/>
      <TextInput
        title="Dialogue Name"
        placeholder="New project name"
        name="dialogueName"
        value={dialogueName}
        onChange={handleInputChange}
        highlight={highlight}
        onClick={handleProjectNameClick}
      />
      <Button
        onClick={handleContinueClick}
        disabled={dialogueName.length === 0}        
        containerClassName={"landing-page-button-container"}
        className={"custom-button landing-page-button"}
      >
        create project
      </Button>
    </div>
  );
}

export default NewProject;
