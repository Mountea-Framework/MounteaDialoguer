import React, { useState, useContext } from "react";

import NewProject from "./NewProject";
import LoadProject from "./LoadProject";
import NewProjectDetails from "./NewProjectDetails";
import AppContext from "../AppContext";

import "../componentStyles/LandingPage.css";

function LandingPage() {
	const { showLandingPage, setShowLandingPage } = useContext(AppContext);
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
		// setSelectedProject(null);
	};

	const handleContinue = (name) => {
		setProjectData((prev) => ({ ...prev, name }));
		setPage("newProjectDetails");
	};

	const handleReturn = () => {
		setPage("newProject");
		setShowLandingPage(true);
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
						setProjectData={setProjectData}
					/>
				</>
			)}
			{page === "newProjectDetails" && (
				<NewProjectDetails projectData={projectData} onReturn={handleReturn} />
			)}
		</div>
	);
}

export default LandingPage;
