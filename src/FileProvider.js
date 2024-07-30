import React, { createContext, useState, useRef, useEffect } from "react";
import JSZip from "jszip";
import { useAutoSave } from "./hooks/useAutoSave";
import {
	importCategories,
	processImportedCategories,
} from "./helpers/importCategoriesHelper";
import {
	importParticipants,
	processImportedParticipants,
} from "./helpers/importParticipantsHelper";

const FileContext = createContext();

const FileProvider = ({ children }) => {
	const [file, setFile] = useState(null);
	const [error, setError] = useState(null);
	const importCallbackRef = useRef(null);

	const { saveProjectToLocalStorage } = useAutoSave();

	useEffect(() => {
		const handleBeforeUnload = (e) => {
			setError(null);
			localStorage.removeItem("autoSaveProject");
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, []);

	const generateFile = async () => {
		const autoSaveData = localStorage.getItem("autoSaveProject");
		if (!autoSaveData) {
			setError("No data found in local storage.");
			return;
		}

		const parsedData = JSON.parse(autoSaveData);

		const jsonData = {
			name: parsedData.name || "UntitledProject",
			categories: parsedData.categories || [],
			participants: parsedData.participants || [],
			nodes: parsedData.nodes || [],
			edges: parsedData.edges || [],
		};

		const zip = new JSZip();
		zip.file("dialogueJson.json", JSON.stringify(jsonData));
		zip.folder("audio"); // TODO: Actually add audio files once supported

		try {
			const content = await zip.generateAsync({ type: "blob" });

			const options = {
				suggestedName: `${jsonData.name}`,
				types: [
					{
						description: "Mountea Dialogue Files",
						accept: { "application/mnteadlg": [".mnteadlg"] },
					},
				],
			};

			const handle = await window.showSaveFilePicker(options);
			const writable = await handle.createWritable();
			await writable.write(content);
			await writable.close();

			setError(null);
		} catch (e) {
			setError("Error generating .mnteadlg file or saving it.");
		}
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
			if (
				!dialogueJson.title ||
				!Array.isArray(dialogueJson.categories) ||
				!Array.isArray(dialogueJson.participants)
			) {
				setError("Invalid dialogueJson.json content or structure");
				return false;
			}
			if (
				dialogueJson.categories.length === 0 ||
				dialogueJson.participants.length === 0
			) {
				setError("Categories or participants cannot be empty");
				return false;
			}
			setError(null);
			return dialogueJson;
		} catch (e) {
			setError("Error reading .mnteadlg file");
			return false;
		}
	};

	const handleFileChange = async (e, setProjectData, onSelectProject) => {
		setError(null);
		setFile(null);
		setProjectData({ title: "", participants: [], categories: [] });
		const file = e.target.files[0];
		if (file) {
			const validatedData = await validateMnteadlgFile(file);
			if (validatedData) {
				setFile(file);
				onSelectProject(file.name);
				const projectTitle = validatedData.title || "UntitledProject";
				setProjectData({ ...validatedData, title: projectTitle });
				const autoSaveData = { ...validatedData, title: projectTitle };
				localStorage.setItem("autoSaveProject", JSON.stringify(autoSaveData));
			}
		} else {
			alert("Please select a .mnteadlg file");
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = async (e, setProjectData, onSelectProject) => {
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
				const autoSaveData = { ...validatedData, title: projectTitle };
				localStorage.setItem("autoSaveProject", JSON.stringify(autoSaveData));
			}
		} else {
			alert("Please select a .mnteadlg file");
		}
	};

	const handleClick = (callback) => {
		importCallbackRef.current = callback;
		document.getElementById("fileInput").click();
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
				importCategories: (e) =>
					importCategories(e, importCallbackRef, setError),
				processImportedCategories: (data) =>
					processImportedCategories(data, importCallbackRef, setError),
				importParticipants: (e) =>
					importParticipants(e, importCallbackRef, setError),
				processImportedParticipants: (data) =>
					processImportedParticipants(data, importCallbackRef, setError),
			}}
		>
			<input
				type="file"
				id="fileInput"
				style={{ display: "none" }}
				onChange={(e) => importCategories(e, importCallbackRef, setError)}
				accept=".xml,.json,.csv"
			/>
			<input
				type="file"
				id="participantFileInput"
				style={{ display: "none" }}
				onChange={(e) => importParticipants(e, importCallbackRef, setError)}
				accept=".xml,.json,.csv"
			/>
			{children}
		</FileContext.Provider>
	);
};

export { FileContext, FileProvider };
