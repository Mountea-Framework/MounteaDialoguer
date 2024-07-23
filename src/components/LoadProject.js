import React, { useContext } from "react";

import Title from "./objects/Title";
import ScrollList from "./objects/ScrollList";
import Button from "./objects/Button";
import AppContext from "../AppContext";
import FileDrop from "./objects/FileDrop";

import "../componentStyles/LoadProject.css";

function LoadProject({ selectedProject, onSelectProject, setProjectData }) {
	const { setShowLandingPage } = useContext(AppContext);

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
			<FileDrop
				setProjectData={setProjectData}
				onSelectProject={onSelectProject}
			/>
			<Button
				onClick={handleContinueClick}
				disabled={!selectedProject}
				containerClassName={"landing-page-button-container"}
				className={"custom-button landing-page-button"}
			>
				Load Project
			</Button>
		</div>
	);
}

export default LoadProject;
