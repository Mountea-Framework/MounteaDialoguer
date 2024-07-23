import React, { createContext, useState } from "react";
import JSZip from "jszip";

const FileContext = createContext();

export const FileProvider = ({ children }) => {
	const [file, setFile] = useState(null);
	const [error, setError] = useState(null);

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
				!dialogueJson.name ||
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
		setProjectData({ name: "", participants: [], categories: [] });
		const file = e.target.files[0];
		if (file) {
			const validatedData = await validateMnteadlgFile(file);
			if (validatedData) {
				setFile(file);
				onSelectProject(file.name);
				const projectName = validatedData.name || "Untitled Project"; // Set a default name if none provided
				setProjectData({ ...validatedData, name: projectName });
				const autoSaveData = { ...validatedData, name: projectName };
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
		setProjectData({ name: "", participants: [], categories: [] });
		const file = e.dataTransfer.files[0];
		if (file) {
			const validatedData = await validateMnteadlgFile(file);
			if (validatedData) {
				setFile(file);
				onSelectProject(file.name);
				const projectName = validatedData.name || "Untitled Project"; // Set a default name if none provided
				setProjectData({ ...validatedData, name: projectName });
				const autoSaveData = { ...validatedData, name: projectName };
				localStorage.setItem("autoSaveProject", JSON.stringify(autoSaveData));
			}
		} else {
			alert("Please select a .mnteadlg file");
		}
	};

	const handleClick = () => {
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
			}}
		>
			{children}
		</FileContext.Provider>
	);
};

export default FileContext;
