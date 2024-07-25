import React, { createContext, useState } from "react";
import JSZip from "jszip";

const FileContext = createContext();

const FileProvider = ({ children }) => {
	const [file, setFile] = useState(null);
	const [error, setError] = useState(null);

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

	const handleClick = () => {
		document.getElementById("fileInput").click();
	};

	const importCategories = async (e) => {
		const file = e.target.files[0];
		if (!file) {
			alert("No file selected");
			return;
		}

		// TODO: All "parent" categories must be declared as normal category -> all entries with non-declared parents must be excluded
		// maybe provide output log for download?

		if (
			!["application/json", "application/xml", "text/xml", "text/csv"].includes(
				file.type
			)
		) {
			alert("Invalid file type");
			return;
		}

		const fileContent = await file.text();
		if (!fileContent) {
			alert("File is empty");
			return;
		}

		let categories = [];
		let logEntries = [];

		try {
			if (file.type === "application/json") {
				const data = JSON.parse(fileContent);
				if (
					!data.categories ||
					!Array.isArray(data.categories) ||
					data.categories.length === 0 ||
					!data.categories.every(
						(cat) =>
							typeof cat.name === "string" && typeof cat.parent === "string"
					)
				) {
					alert("Invalid JSON format");
					return;
				}
			} else if (file.type === "application/xml" || file.type === "text/xml") {
				const parser = new DOMParser();
				const xmlDoc = parser.parseFromString(fileContent, "application/xml");
				const categories = xmlDoc.getElementsByTagName("category");
				if (categories.length === 0) {
					alert("Invalid XML format: No categories found");
					return;
				}
				for (let i = 0; i < categories.length; i++) {
					const name = categories[i].getElementsByTagName("name")[0];
					if (!name || name.textContent.trim() === "") {
						alert("Invalid XML format: Each category must have a name!");
						return;
					}
				}
			} else if (
				file.type === "text/csv" ||
				file.type === "application/vnd.ms-excel"
			) {
				const rows = fileContent
					.trim()
					.split("\n")
					.map((row) => row.split(","));
				const headers = rows[0].map((header) => header.trim());
				if (!headers.includes("name") || !headers.includes("parent")) {
					alert("Invalid CSV format: Missing 'name' or 'parent' columns");
					return;
				}
				const nameIndex = headers.indexOf("name");
				const parentIndex = headers.indexOf("parent");
				const categories = rows.slice(1).filter((row) => row.length > 1);
				if (categories.length === 0) {
					alert("Invalid CSV format: No categories found");
					return;
				}
				for (let i = 0; i < categories.length; i++) {
					const name = categories[i][nameIndex];
					const parent = categories[i][parentIndex];
					if (!name || name.trim() === "") {
						alert("Invalid CSV format: Each category must have a name!");
						return;
					}
				}
			}

			// Post-processing steps

			// Step 1: Find all valid parents
			const categoryNames = new Set(categories.map((cat) => cat.name));
			console.log(categoryNames);
			const invalidEntries = [];
			const validCategories = categories.filter((cat) => {
				if (cat.parent && !categoryNames.has(cat.parent)) {
					invalidEntries.push(cat);
					return false;
				}
				return true;
			});

			// Step 1.1: Log invalid entries
			if (invalidEntries.length > 0) {
				logEntries.push("Invalid Categories:\n");
				invalidEntries.forEach((entry) => {
					logEntries.push(`Name: ${entry.name}, Parent: ${entry.parent}\n`);
				});
			}

			// Step 2: Create a hierarchy tree and replace parents with composite strings
			const parentMap = {};
			validCategories.forEach((cat) => {
				if (cat.parent) {
					const compositeParent = parentMap[cat.parent]
						? parentMap[cat.parent]
						: cat.parent;
					cat.parent = `${compositeParent}.${cat.name}`;
					parentMap[cat.name] = cat.parent;
				} else {
					parentMap[cat.name] = cat.name;
				}
			});

			// Show the user a log and provide a download option if there are invalid entries
			if (logEntries.length > 0) {
				const logBlob = new Blob(logEntries, { type: "text/plain" });
				const logUrl = URL.createObjectURL(logBlob);
				const logLink = document.createElement("a");
				logLink.href = logUrl;
				logLink.download = "import_log.txt";
				logLink.innerText = "Download log file";
				document.body.appendChild(logLink);
				alert(
					"Some categories had invalid parents. Check the log file for details."
				);
				logLink.click();
				document.body.removeChild(logLink);
			} else {
				alert("File imported successfully");
			}

			// Now you can use the validCategories list as needed
			console.log(validCategories);
		} catch (err) {
			alert("Error parsing file");
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
				importCategories,
			}}
		>
			<input
				type="file"
				id="fileInput"
				style={{ display: "none" }}
				onChange={importCategories}
				accept=".xml,.json,.csv" // Accept XML, JSON, CSV files
			/>
			{children}
		</FileContext.Provider>
	);
};

export { FileContext, FileProvider };
