import React, { useState, useContext } from "react";
import NewProject from "./NewProject";
import LoadProject from "./LoadProject";
import NewProjectDetails from "./NewProjectDetails";
import AppContext from "../AppContext";
import Button from "./objects/Button";

import "../componentStyles/LandingPage.css";

function LandingPage() {
	const { showLandingPage, setShowLandingPage, loadProject } =
		useContext(AppContext);
	const [selectedProjectGuid, setSelectedProjectGuid] = useState(null);
	const [page, setPage] = useState("newProject");
	const [projectData, setProjectData] = useState({
		dialogueName: "",
		participants: [],
		categories: [],
	});

	const onSelectProject = (projectGuid) => {
		setSelectedProjectGuid(projectGuid);
	};

	const handleNewProjectClick = () => {
		// setSelectedProject(null);
	};

	const handleContinue = (name) => {
		setProjectData((prev) => ({ ...prev, name }));
		setPage("newProjectDetails");
	};

	const handleReturn = () => {
		sessionStorage.removeItem("project-guid");
		sessionStorage.removeItem("selectedProject");
		setPage("newProject");
		setShowLandingPage(true);
	};

	const handleLoadProject = () => {
		if (selectedProjectGuid) {
			const storedProject = JSON.parse(
				sessionStorage.getItem("selectedProject")
			);
			if (storedProject && storedProject.guid === selectedProjectGuid) {
				loadProject(storedProject);
			} else {
				console.error("Selected project not found in session storage");
			}
		}
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
						selectedProject={selectedProjectGuid}
						onSelectProject={onSelectProject}
						setProjectData={setProjectData}
					/>
					<Button
						onClick={handleLoadProject}
						disabled={!selectedProjectGuid}
						containerClassName={"landing-page-button-container"}
						className={"custom-button landing-page-button"}
					>
						Load Project
					</Button>
				</>
			)}
			{page === "newProjectDetails" && (
				<NewProjectDetails projectData={projectData} onReturn={handleReturn} />
			)}
		</div>
	);
}

export default LandingPage;
