import React, { useContext, useEffect } from "react";

import Title from "./objects/Title";
import ScrollList from "./objects/ScrollList";
import Button from "./objects/Button";
import AppContext from "../AppContext";
import FileDrop from "./objects/FileDrop";
import { FileContext } from "./../FileProvider";

import "../componentStyles/LoadProject.css";

function LoadProject({ selectedProject, onSelectProject, setProjectData }) {
	const { setShowLandingPage } = useContext(AppContext);
	const { handleFileChange, setProjectDataRef, onSelectProjectRef } =
		useContext(FileContext);

	useEffect(() => {
		setProjectDataRef.current = setProjectData;
		onSelectProjectRef.current = onSelectProject;
	}, [setProjectData, onSelectProject, setProjectDataRef, onSelectProjectRef]);

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
				onChange={handleFileChange}
				primaryText="Drag and drop a .mnteadlg file here or click to select"
				accept=".mnteadlg"
				id="projectFileInput"
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
