import React, { createContext, useContext, useState, useEffect } from "react";
import { getDB } from "../indexedDB";

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
	const [projects, setProjects] = useState([]);

	useEffect(() => {
		const fetchProjects = async () => {
			const db = await getDB();
			const tx = db.transaction("projects", "readonly");
			const store = tx.objectStore("projects");
			const allProjects = await store.getAll();
			const currentGuid = localStorage.getItem("project-guid");

			const filteredProjects = allProjects.filter(
				(project) => project.guid !== currentGuid
			);

			setProjects(
				filteredProjects.map((project) => ({
					displayName: `${project.dialogueName}`,
					guid: project.guid,
				}))
			);
		};

		fetchProjects();
	}, []);

	const deleteProject = async (guid) => {
		const db = await getDB();
		const tx = db.transaction("projects", "readwrite");
		const store = tx.objectStore("projects");

		await store.delete(guid);
		await tx.done;

		setProjects((prevProjects) =>
			prevProjects.filter((project) => project.guid !== guid)
		);
	};

	return (
		<ProjectContext.Provider value={{ projects, deleteProject }}>
			{children}
		</ProjectContext.Provider>
	);
};
