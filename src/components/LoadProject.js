import React, { useContext, useEffect, useState, useCallback } from "react";
import Title from "./objects/Title";
import ScrollList from "./objects/ScrollList";
import AppContext from "../AppContext";
import FileDrop from "./objects/FileDrop";
import { getDB } from "../indexedDB";
import { FileContext } from "./../FileProvider";
import { useProject, ProjectProvider } from "../helpers/projectManager";

import "../componentStyles/LoadProject.css";

function LoadProject({ selectedProject, onSelectProject, setProjectData }) {
	const { projects, deleteProject } = useProject();
	const [filteredProjects, setFilteredProjects] = useState([]);
	const [selectedListItem, setSelectedListItem] = useState(null);
	const [fileName, setFileName] = useState("");

	const {
		handleFileChange: contextHandleFileChange,
		setProjectDataRef,
		onSelectProjectRef,
		file,
	} = useContext(FileContext);

	const handleFileChange = useCallback(
		(event) => {
			const file = event.target.files[0];
			if (file) {
				setFileName(file.name);
				contextHandleFileChange(event);
			}
		},
		[contextHandleFileChange]
	);

	const handleFileChangeAndResetSelection = useCallback(
		(event) => {
			onSelectProject(null);
			setSelectedListItem(null);
			handleFileChange(event);
		},
		[onSelectProject, handleFileChange]
	);

	const clearFileDrop = useCallback(() => {
		setFileName("");
	}, []);

	useEffect(() => {
		setProjectDataRef.current = setProjectData;
		onSelectProjectRef.current = onSelectProject;

		const currentGuid = sessionStorage.getItem("project-guid");

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

	const handleSelectProject = async (selectedItem) => {
		const selectedGuid = selectedItem.value;
		const db = await getDB();
		const tx = db.transaction("projects", "readonly");
		const store = tx.objectStore("projects");
		const selectedProjectData = await store.get(selectedGuid);

		if (selectedProjectData) {
			clearFileDrop();
			

			const transformedData = transformProjectData(selectedProjectData);

			// Store the selected project in session storage
			sessionStorage.setItem(
				"selectedProject",
				JSON.stringify(transformedData)
			);

			setProjectData(transformedData);
			onSelectProject(selectedGuid);
			setSelectedListItem(selectedItem);
		}
	};

	const transformProjectData = (dbProjectData) => {
		return {
			dialogueName: dbProjectData.dialogueName,
			guid: dbProjectData.guid,
			categories: dbProjectData.categories || [],
			participants: dbProjectData.participants || [],
			nodes: dbProjectData.nodes || [],
			edges: dbProjectData.edges || [],
			files: dbProjectData.files || [],
		};
	};

	const handleDeleteProject = async (selectedItem) => {
		const selectedGuid = selectedItem.value;
		deleteProject(selectedGuid);
	};

	return (
		<div className="load-project-wrapper">
			<div className="load-project">
				<Title
					level="2"
					children="Load Project"
					className="secondary-heading"
				/>
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
					allowSelection={true}
					selectedItem={selectedListItem}
					onSelectItem={setSelectedListItem}
				/>
				<FileDrop
					onChange={handleFileChangeAndResetSelection}
					primaryText="Drag and drop a .mnteadlg file here or click to select"
					accept=".mnteadlg"
					id="projectFileInput"
					fileName={fileName}
				/>
			</div>
		</div>
	);
}

export default (props) => (
	<ProjectProvider>
		<LoadProject {...props} />
	</ProjectProvider>
);
