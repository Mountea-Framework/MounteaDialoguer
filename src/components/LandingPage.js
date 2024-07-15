import React, { useState } from "react";

import NewProject from "./NewProject";
import LoadProject from "./LoadProject";
import NewProjectDetails from "./NewProjectDetails";

import "../base/ColorPalette.css"
import "../base/BaseStyle.css"
import "../componentStyles/LandingPage.css";

function LandingPage() {
  const [selectedProject, setSelectedProject] = useState(null);
  const [page, setPage] = useState("newProject");
  const [projectData, setProjectData] = useState({
    name: "",
    participants: [],
    categories: [],
  });

  const handleSelectProject = (project) => {
    setSelectedProject(project);
  };

  const handleNewProjectClick = () => {
    setSelectedProject(null);
  };

  const handleContinue = (name) => {
    setProjectData((prev) => ({ ...prev, name }));
    setPage("newProjectDetails");
  };

  const handleReturn = () => {
    setProjectData({
      name: "",
      participants: [],
      categories: [],
    });
    setPage("newProject");
  };

  const setParticipants = (participants) => {
    setProjectData((prev) => ({ ...prev, participants }));
  };

  const setCategories = (categories) => {
    setProjectData((prev) => ({ ...prev, categories }));
  };

  return (
    <div className="landing-page-wrapper no-selection">
      {page === "newProject" && (
        <>
          <NewProject
            onContinue={handleContinue}
            onNewProjectClick={handleNewProjectClick}
          />
          <hr />
          <LoadProject
            selectedProject={selectedProject}
            onSelectProject={handleSelectProject}
          />
        </>
      )}
      {page === "newProjectDetails" && (
        <NewProjectDetails
          projectData={projectData}
          onReturn={handleReturn}
          setParticipants={setParticipants}
          setCategories={setCategories}
        />
      )}
    </div>
  );
}

export default LandingPage;
