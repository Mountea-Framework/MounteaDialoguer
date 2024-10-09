import React, { createContext, useState, useRef, useEffect } from "react";
import { getDB } from "./indexedDB";
import {
	importCategories,
	processImportedCategories,
} from "./helpers/importCategoriesHelper";
import {
	importParticipants,
	processImportedParticipants,
} from "./helpers/importParticipantsHelper";
import {
	validateCategories,
	validateParticipants,
	validateNodes,
	validateEdges,
	validateDialogueRows,
	validateAudioFolder,
} from "./helpers/validationHelpers";
import { exportCategories } from "./helpers/exportCategoriesHelper";
import { exportParticipants } from "./helpers/exportParticipantsHelper";
import { exportDialogueRows } from "./helpers/exportDialogueRowsHelper";
import { exportProject } from "./helpers/exportProjectHelper";
import { unzip, strFromU8 } from "fflate";

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
			sessionStorage.removeItem("project-guid");
			sessionStorage.clear();
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
			const arrayBuffer = await file.arrayBuffer();

			return new Promise((resolve, reject) => {
				unzip(new Uint8Array(arrayBuffer), (err, files) => {
					if (err) {
						setError(`Error unzipping .mnteadlg file: ${err.message}`);
						console.error(err);
						alert(err.message);
						reject(false);
					} else {
						try {
							// Extract and parse files
							const categoriesJson = strFromU8(files["categories.json"]);
							const participantsJson = strFromU8(files["participants.json"]);
							const nodesJson = strFromU8(files["nodes.json"]);
							const edgesJson = strFromU8(files["edges.json"]);
							const dialogueRowsJson = strFromU8(files["dialogueRows.json"]);
							const dialogueMetadataJson = strFromU8(
								files["dialogueData.json"]
							);

							// Parse JSON
							const categories = JSON.parse(categoriesJson);
							const participants = JSON.parse(participantsJson);
							const nodes = JSON.parse(nodesJson);
							const edges = JSON.parse(edgesJson);
							const dialogueRows = JSON.parse(dialogueRowsJson);
							const dialogueMetadata = JSON.parse(dialogueMetadataJson);

							// Validation process - store validated results
							const validCategories = validateCategories(categories);
							const validParticipants = validateParticipants(
								participants,
								validCategories
							);
							const validNodes = validateNodes(nodes);
							const validEdges = validateEdges(edges, validNodes);
							const validDialogueRows = validateDialogueRows(
								dialogueRows,
								validNodes
							);

							// Set error to null and resolve with the structured data
							setError(null);
							resolve({
								categories: validCategories,
								participants: validParticipants,
								nodes: validNodes,
								edges: validEdges,
								dialogueRows: validDialogueRows,
								dialogueMetadata,
							});
						} catch (parseError) {
							setError(`Error parsing .mnteadlg file: ${parseError.message}`);
							console.error(parseError);
							alert(parseError.message);
							reject(false);
						}
					}
				});
			});
		} catch (e) {
			setError(`Error reading .mnteadlg file: ${e.message}`);
			console.error(e);
			alert(e.message);
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
			try {
				const validatedData = await validateMnteadlgFile(file);
				console.log("Validated Data:", validatedData);

				if (validatedData) {
					setFile(file.name); // Store the file name
					onSelectProject(validatedData.dialogueMetadata.dialogueName);
					const projectTitle =
						validatedData.dialogueMetadata.dialogueName || "UntitledProject";
					const projectData = { ...validatedData, title: projectTitle };

					// Store the project data in sessionStorage
					sessionStorage.setItem(
						"selectedProject",
						JSON.stringify(projectData)
					);

					// Update your React state or any other logic that depends on projectData
					setProjectData(projectData);
				} else {
					console.error("Validated data is null or undefined.");
				}
			} catch (error) {
				console.error("Error validating file:", error);
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
			const projectGuid = sessionStorage.getItem("project-guid");
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
			const projectGuid = sessionStorage.getItem("project-guid");
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
			const projectGuid = sessionStorage.getItem("project-guid");
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
			const projectGuid = sessionStorage.getItem("project-guid");
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
