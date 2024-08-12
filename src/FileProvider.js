import React, { createContext, useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import { getDB } from "./indexedDB";
import {
	importCategories,
	processImportedCategories,
} from "./helpers/importCategoriesHelper";
import {
	importParticipants,
	processImportedParticipants,
} from "./helpers/importParticipantsHelper";
import { exportCategories } from "./helpers/exportCategoriesHelper";
import { exportParticipants } from "./helpers/exportParticipantsHelper";
import { exportDialogueRows } from "./helpers/exportDialogueRowsHelper";
import { exportProject } from "./helpers/exportProjectHelper";

const FileContext = createContext();

const FileProvider = ({ children }) => {
	const [file, setFile] = useState(null);
	const [error, setError] = useState(null);
	const importCallbackRef = useRef(null);
	const setProjectDataRef = useRef(null);
	const onSelectProjectRef = useRef(null);

	useEffect(() => {
		const handleBeforeUnload = (e) => {
			setError(null);
			localStorage.removeItem("project-guid");
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, []);

	const generateFile = async () => {
		handleExportProject();
	};

	const validateMnteadlgFile = async (file) => {
		try {
			const zip = await JSZip.loadAsync(file);
			const dialogueJsonFile = zip.file("dialogueJson.json");
			if (!dialogueJsonFile) {
				setError("Invalid .mnteadlg file: missing dialogueJson.json");
				return false;
			}
			const dialogueJsonContent = await dialogueJsonFile.async("string");
			const dialogueJson = JSON.parse(dialogueJsonContent);

			// Check the required properties
			if (!dialogueJson.name) {
				setError("Missing dialogue name");
				return false;
			}

			if (!Array.isArray(dialogueJson.categories)) {
				setError("Categories must be an array");
				return false;
			}

			if (!Array.isArray(dialogueJson.participants)) {
				setError("Participants must be an array");
				return false;
			}

			if (dialogueJson.categories.length === 0) {
				setError("Categories cannot be empty");
				return false;
			}

			if (dialogueJson.participants.length === 0) {
				setError("Participants cannot be empty");
				return false;
			}

			setError(null);
			return dialogueJson;
		} catch (e) {
			setError("Error reading .mnteadlg file");
			console.error(e);
			return false;
		}
	};

	const handleFileChange = async (e) => {
		const setProjectData = setProjectDataRef.current;
		const onSelectProject = onSelectProjectRef.current;

		if (!setProjectData || !onSelectProject) {
			console.error("setProjectData or onSelectProject is not set");
			return;
		}

		setError(null);
		setFile(null);
		const file = e.target.files[0];
		if (file) {
			const validatedData = await validateMnteadlgFile(file);
			if (validatedData) {
				setFile(file);
				onSelectProject(file.name);
				const projectTitle = validatedData.name || "UntitledProject";
				const projectData = { ...validatedData, title: projectTitle };
				setProjectData(projectData);

				const db = await getDB();
				const tx = db.transaction("projects", "readwrite");
				await tx.objectStore("projects").put(projectData);
				await tx.done;
			}
		} else {
			alert("Please select a .mnteadlg file");
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = async (e) => {
		const setProjectData = setProjectDataRef.current;
		const onSelectProject = onSelectProjectRef.current;

		if (!setProjectData || !onSelectProject) {
			console.error("setProjectData or onSelectProject is not set");
			return;
		}

		e.preventDefault();
		setError(null);
		setFile(null);
		setProjectData({ title: "", participants: [], categories: [] });
		const file = e.dataTransfer.files[0];
		if (file) {
			const validatedData = await validateMnteadlgFile(file);
			if (validatedData) {
				setFile(file);
				onSelectProject(file.name);
				const projectTitle = validatedData.title || "UntitledProject";
				setProjectData({ ...validatedData, title: projectTitle });

				const db = await getDB();
				const tx = db.transaction("projects", "readwrite");
				await tx
					.objectStore("projects")
					.put({ ...validatedData, title: projectTitle });
				await tx.done;
			}
		} else {
			alert("Please select a .mnteadlg file");
		}
	};

	const handleClick = (callback, inputId) => {
		importCallbackRef.current = callback;
		const input = document.getElementById(inputId);
		if (input) {
			input.click();
		}
	};

	const resetFileInput = (inputId) => {
		const input = document.getElementById(inputId);
		if (input) {
			input.value = ""; // Reset the value of the file input element
		}
	};

	const importCategoriesHandler = (e) => {
		importCategories(e, processImportedCategories, importCallbackRef, setError);
		resetFileInput("fileInput"); // Reset the file input element after import
	};

	const importParticipantsHandler = (e) => {
		importParticipants(
			e,
			processImportedParticipants,
			importCallbackRef,
			setError
		);
		resetFileInput("participantFileInput"); // Reset the file input element after import
	};

	const handleExportCategories = async () => {
		try {
			const projectGuid = localStorage.getItem("project-guid");
			if (!projectGuid) {
				throw new Error("No project GUID found in local storage.");
			}
			await exportCategories(projectGuid);
			console.log("Categories exported successfully.");
		} catch (error) {
			console.error("Error exporting categories:", error);
		}
	};

	const handleExportParticipants = async () => {
		try {
			const projectGuid = localStorage.getItem("project-guid");
			if (!projectGuid) {
				throw new Error("No project GUID found in local storage.");
			}
			await exportParticipants(projectGuid);
			console.log("Participants exported successfully.");
		} catch (error) {
			console.error("Error exporting participants:", error);
		}
	};

	const handleExportDialogueRows = async () => {
		try {
			const projectGuid = localStorage.getItem("project-guid");
			if (!projectGuid) {
				throw new Error("No project GUID found in local storage.");
			}
			await exportDialogueRows(projectGuid);
			console.log("Dialogue rows exported successfully.");
		} catch (error) {
			console.error("Error exporting dialogue rows:", error);
		}
	};

	const handleExportProject = async () => {
		try {
			const projectGuid = localStorage.getItem("project-guid");
			if (!projectGuid) {
				throw new Error("No project GUID found in local storage.");
			}
			await exportProject(projectGuid);
			console.log("Project exported successfully.");
		} catch (error) {
			console.error("Error exporting project:", error);
		}
	};

	return (
		<FileContext.Provider
			value={{
				file,
				error,
				handleFileChange,
				handleDragOver,
				handleDrop,
				handleClick,
				generateFile,
				importCategories: importCategoriesHandler,
				importParticipants: importParticipantsHandler,
				exportCategories: handleExportCategories,
				exportParticipants: handleExportParticipants,
				exportDialogueRows: handleExportDialogueRows,
				setProjectDataRef,
				onSelectProjectRef,
			}}
		>
			<input
				type="file"
				id="fileInput"
				style={{ display: "none" }}
				onChange={importCategoriesHandler}
				accept=".xml,.json,.csv" // Accept XML, JSON, CSV files
			/>
			<input
				type="file"
				id="participantFileInput"
				style={{ display: "none" }}
				onChange={importParticipantsHandler}
				accept=".xml,.json,.csv" // Accept XML, JSON, CSV files
			/>
			<input
				type="file"
				id="projectFileInput"
				style={{ display: "none" }}
				onChange={handleFileChange}
				accept=".mnteadlg"
				onDrop={handleDrop}
			/>
			{children}
		</FileContext.Provider>
	);
};

export { FileContext, FileProvider };
