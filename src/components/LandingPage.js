import React, { useState, useContext } from "react";

import NewProject from "./NewProject";
import LoadProject from "./LoadProject";
import NewProjectDetails from "./NewProjectDetails";
import MobileView from "./../components/MobileView";
import AppContext from "../AppContext";
import Button from "./objects/Button";
import { v4 as uuidv4 } from "uuid";
import { saveProjectToIndexedDB } from "../hooks/useAutoSave";
import { convertToStandardGuid } from "../helpers/validationHelpers";

import "../componentStyles/LandingPage.css";

function LandingPage() {
	const { setShowLandingPage, loadProject } = useContext(AppContext);
	const [selectedProjectGuid, setSelectedProjectGuid] = useState(null);
	const [page, setPage] = useState("newProject");
	const [projectData, setProjectData] = useState({
		dialogueName: "",
		participants: [],
		categories: [],
	});

	const onSelectProject = (projectGuid) => {
		console.log(`selectedGuid: ${projectGuid}`);
		setSelectedProjectGuid(projectGuid);
	};

	const handleNewProjectClick = () => {
		sessionStorage.removeItem("project-guid");
		sessionStorage.removeItem("selectedProject");
		setSelectedProjectGuid(uuidv4());
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
		const storedProject = JSON.parse(sessionStorage.getItem("selectedProject"));
		if (storedProject) {
			storedProject.guid = convertToStandardGuid(storedProject.guid);
			console.log(storedProject);
			sessionStorage.setItem("project-guid", storedProject.guid);
			loadProject(storedProject);
			saveProjectToIndexedDB(storedProject);
		} else {
			console.error("Selected project not found in session storage");
		}
	};

	return (
		<div className="landing-page-wrapper no-selection">
			<div className="desktop-view">
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
					<NewProjectDetails
						projectData={projectData}
						onReturn={handleReturn}
					/>
				)}
			</div>
			<MobileView className="mobile-view" />
		</div>
	);
}

export default LandingPage;
