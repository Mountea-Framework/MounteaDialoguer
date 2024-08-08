import React, { useContext, useEffect, useState } from "react";

import Title from "./objects/Title";
import ScrollList from "./objects/ScrollList";
import Button from "./objects/Button";
import AppContext from "../AppContext";
import FileDrop from "./objects/FileDrop";
import { getDB } from "../indexedDB";
import { FileContext } from "./../FileProvider";
import { useProject, ProjectProvider } from "../helpers/projectManager";

import "../componentStyles/LoadProject.css";

function LoadProject({ selectedProject, onSelectProject, setProjectData }) {
	const { setShowLandingPage } = useContext(AppContext);
	const { handleFileChange, setProjectDataRef, onSelectProjectRef } =
		useContext(FileContext);
	const { projects, deleteProject } = useProject();
	const [filteredProjects, setFilteredProjects] = useState([]);

	useEffect(() => {
		setProjectDataRef.current = setProjectData;
		onSelectProjectRef.current = onSelectProject;

		const currentGuid = localStorage.getItem("project-guid");

		setFilteredProjects(
			projects.filter((project) => project.guid !== currentGuid)
		);
	}, [
		projects,
		setProjectData,
		onSelectProject,
		setProjectDataRef,
		onSelectProjectRef,
	]);

	const handleContinueClick = () => {
		if (selectedProject) {
			setShowLandingPage(false);
		}
	};

	const handleSelectProject = async (selectedItem) => {
		const selectedGuid = selectedItem.value;
		const db = await getDB();
		const tx = db.transaction("projects", "readonly");
		const store = tx.objectStore("projects");
		const selectedProjectData = await store.get(selectedGuid);

		if (selectedProjectData) {
			setProjectData(selectedProjectData);
			onSelectProject(selectedGuid);
		}
	};

	const handleDeleteProject = async (selectedItem) => {
		const selectedGuid = selectedItem.value;
		deleteProject(selectedGuid);
	};

	return (
		<div className="load-project">
			<Title level="2" children="Load Project" className="secondary-heading" />
			<ScrollList
				classState="none"
				classStateItems="none"
				items={filteredProjects.map((project) => ({
					displayName: project.displayName,
					value: project.guid,
				}))}
				onSelect={handleSelectProject}
				allowEdit={false}
				onIconClick={handleDeleteProject}
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

export default (props) => (
	<ProjectProvider>
		<LoadProject {...props} />
	</ProjectProvider>
);
