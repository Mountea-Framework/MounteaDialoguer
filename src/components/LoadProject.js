import React, { useState, useRef } from "react";

import Title from "./objects/Title";
import ScrollList from "./objects/ScrollList";
import Button from "./objects/Button";

import "../componentStyles/LoadProject.css";

function LoadProject({ selectedProject, onSelectProject }) {
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.name.endsWith(".mnteadlg")) {
      setFile(file);
    } else {
      alert("Please select a .mnteadlg file");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith(".mnteadlg")) {
      setFile(file);
    } else {
      alert("Please select a .mnteadlg file");
    }
  };

  const handleFileClick = () => {
    fileInputRef.current.click();
  };

  const handleContinueClick = () => {
    if (selectedProject) {
      console.log("Continuing with selected project:", selectedProject);
      // TODO: call to landing page to move to remove LoadingPage, load Project from JSON
    }
  };

  return (
    <div className="load-project">
      <Title level="2" children="Load Project" className="secondary-heading" />
      <ScrollList
        selectedProject={selectedProject}
        onSelectProject={onSelectProject}
        classState={"base"}
      />
      <div
        className="file-drop-area"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleFileClick}
      >
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          accept=".mnteadlg"
        />
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
