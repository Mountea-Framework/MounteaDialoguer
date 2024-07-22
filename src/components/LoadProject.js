import React, { useState, useContext } from "react";
import JSZip from "jszip";

import Title from "./objects/Title";
import ScrollList from "./objects/ScrollList";
import Button from "./objects/Button";
import AppContext from "../AppContext";
import "../componentStyles/LoadProject.css";

function LoadProject({ selectedProject, onSelectProject, setProjectData }) {
  const { setShowLandingPage } = useContext(AppContext);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);

  const validateMnteadlgFile = async (file) => {
    try {
      const zip = await JSZip.loadAsync(file);
      const dialogueJsonFile = zip.file("dialogueJson.json");
      if (!dialogueJsonFile) {
        setError("Invalid .mnteadlg file: missing dialogueJson.json");
        onSelectProject(null);
        setProjectData({ name: "", participants: [], categories: [] });
        return false;
      }
      const dialogueJsonContent = await dialogueJsonFile.async("string");
      const dialogueJson = JSON.parse(dialogueJsonContent);
      if (
        !dialogueJson.name ||
        !Array.isArray(dialogueJson.categories) ||
        !Array.isArray(dialogueJson.participants)
      ) {
        setError("Invalid dialogueJson.json content or structure");
        onSelectProject(null);
        setProjectData({ name: "", participants: [], categories: [] });
        return false;
      }
      if (
        dialogueJson.categories.length === 0 ||
        dialogueJson.participants.length === 0
      ) {
        setError("Categories or participants cannot be empty");
        onSelectProject(null);
        setProjectData({ name: "", participants: [], categories: [] });
        return false;
      }
      setError(null);
      return dialogueJson;
    } catch (e) {
      setError("Error reading .mnteadlg file");
      onSelectProject(null);
      setProjectData({ name: "", participants: [], categories: [] });
      return false;
    }
  };

  const handleFileChange = async (e) => {
    setError(null);
    setFile(null);
    setProjectData({ name: "", participants: [], categories: [] });
    const file = e.target.files[0];
    if (file) {
      const validatedData = await validateMnteadlgFile(file);
      if (validatedData) {
        setFile(file);
        onSelectProject(file.name);
        const projectName = validatedData.name || "Untitled Project"; // Set a default name if none provided
        setProjectData({ ...validatedData, name: projectName });
        const autoSaveData = { ...validatedData, name: projectName };
        localStorage.setItem("autoSaveProject", JSON.stringify(autoSaveData));
      }
    } else {
      alert("Please select a .mnteadlg file");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setError(null);
    setFile(null);
    setProjectData({ name: "", participants: [], categories: [] });
    const file = e.dataTransfer.files[0];
    if (file) {
      const validatedData = await validateMnteadlgFile(file);
      if (validatedData) {
        setFile(file);
        onSelectProject(file.name);
        const projectName = validatedData.name || "Untitled Project"; // Set a default name if none provided
        setProjectData({ ...validatedData, name: projectName });
        const autoSaveData = { ...validatedData, name: projectName };
        localStorage.setItem("autoSaveProject", JSON.stringify(autoSaveData));
      }
    } else {
      alert("Please select a .mnteadlg file");
    }
  };

  const handleClick = () => {
    document.getElementById("fileInput").click();
  };

  const handleContinueClick = () => {
    if (selectedProject) {
      setShowLandingPage(false);
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
        onClick={handleClick}
      >
        <input
          id="fileInput"
          type="file"
          onChange={handleFileChange}
          accept=".mnteadlg"
          style={{ display: "none" }}
        />
        {error ? (
          <p className="error">{error}</p>
        ) : file ? (
          <p>{file.name}</p>
        ) : (
          <p className="primary-text">
            Drag and drop a .mnteadlg file here or click to select
          </p>
        )}
      </div>
      <Button
        onClick={handleContinueClick}
        disabled={!selectedProject || error !== null}
        containerClassName={"landing-page-button-container"}
        className={"custom-button landing-page-button"}
      >
        load project
      </Button>
    </div>
  );
}

export default LoadProject;
