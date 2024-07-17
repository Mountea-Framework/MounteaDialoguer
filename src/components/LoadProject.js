import React, { useState } from "react";

import Title from "./objects/Title";
import ScrollList from "./objects/ScrollList";
import Button from "./objects/Button";

import "../componentStyles/LoadProject.css";

function LoadProject({ selectedProject, onSelectProject }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files[0].type === "application/x-mnteadlg") {
      setFile(e.target.files[0]);
    } else {
      alert("Please select a .mnteadlg file");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleContinueClick = () => {
    if (selectedProject) {
      console.log("Continuing with selected project:", selectedProject);
      // TODO: call to landing page to move to remove LoadingPage, load Project from JSON
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files[0].type === "application/x-mnteadlg") {
      setFile(e.dataTransfer.files[0]);
    } else {
      alert("Please select a .mnteadlg file");
    }
  };

  return (
    <div className="load-project">
      <Title level="2" children="Load Project" className="secondary-headign" />
      <ScrollList
        selectedProject={selectedProject}
        onSelectProject={onSelectProject}
        classState={"base"}
      />
      <div
        className="file-drop-area"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input type="file" onChange={handleFileChange} accept=".mnteadlg" />
        {file ? (
          <p>{file.name}</p>
        ) : (
          <p className="primary-text">
            Drag and drop a .mnteadlg file here or click to select
          </p>
        )}
      </div>
      <Button
        onClick={handleContinueClick}
        disabled={!selectedProject}
        containerClassName={"landing-page-button-container"}
        className={"custom-button landing-page-button"}
      >
        load project
      </Button>
    </div>
  );
}

export default LoadProject;
