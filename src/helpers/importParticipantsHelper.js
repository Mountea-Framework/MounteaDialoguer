import { saveProjectToLocalStorage } from "../hooks/useAutoSave";

export const processImportedParticipants = (
	importedParticipants,
	importCallbackRef,
	setError
) => {
	const autoSaveData = localStorage.getItem("autoSaveProject");
	if (!autoSaveData) {
		setError("No data found in local storage.");
		return;
	}

	const parsedData = JSON.parse(autoSaveData);
	const existingParticipants = parsedData.participants || [];

	const mergedParticipants = [...existingParticipants, ...importedParticipants];
	const uniqueParticipants = Array.from(
		new Set(mergedParticipants.map((part) => JSON.stringify(part)))
	).map((str) => JSON.parse(str));

	saveProjectToLocalStorage({
		...parsedData,
		participants: uniqueParticipants,
	});

	if (importCallbackRef.current) {
		importCallbackRef.current(uniqueParticipants);
	}

	alert("Participants imported and merged successfully.");
};

export const importParticipants = async (
	e,
	processImportedParticipants,
	importCallbackRef,
	setError
) => {
	const file = e.target.files[0];
	if (!file) {
		alert("No file selected");
		return;
	}

	if (
		![
			"application/json",
			"application/xml",
			"text/xml",
			"text/csv",
			"application/vnd.ms-excel",
		].includes(file.type)
	) {
		alert("Invalid file type");
		return;
	}

	const fileContent = await file.text();
	if (!fileContent) {
		alert("File is empty");
		return;
	}

	let participants = [];
	let logEntries = [];

	try {
		if (file.type === "application/json") {
			const data = JSON.parse(fileContent);
			if (
				!data.participants ||
				!Array.isArray(data.participants) ||
				data.participants.length === 0 ||
				!data.participants.every(
					(part) =>
						typeof part.name === "string" && typeof part.category === "string"
				)
			) {
				alert("Invalid JSON format");
				return;
			}
			participants = data.participants;
		} else if (file.type === "application/xml" || file.type === "text/xml") {
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(fileContent, "application/xml");
			const xmlParticipants = xmlDoc.getElementsByTagName("participant");
			if (xmlParticipants.length === 0) {
				alert("Invalid XML format: No participants found");
				return;
			}
			for (let i = 0; i < xmlParticipants.length; i++) {
				const name = xmlParticipants[i].getElementsByTagName("name")[0];
				const category = xmlParticipants[i].getElementsByTagName("category")[0];
				if (!name || name.textContent.trim() === "") {
					alert("Invalid XML format: Each participant must have a name");
					return;
				}
				participants.push({
					name: name.textContent.trim(),
					category: category ? category.textContent.trim() : "",
				});
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
			if (!headers.includes("name") || !headers.includes("category")) {
				alert("Invalid CSV format: Missing 'name' or 'category' columns");
				return;
			}
			const nameIndex = headers.indexOf("name");
			const categoryIndex = headers.indexOf("category");
			const csvParticipants = rows.slice(1).filter((row) => row.length > 1);
			if (csvParticipants.length === 0) {
				alert("Invalid CSV format: No participants found");
				return;
			}
			for (let i = 0; i < csvParticipants.length; i++) {
				const name = csvParticipants[i][nameIndex];
				const category = csvParticipants[i][categoryIndex];
				if (!name || name.trim() === "") {
					alert("Invalid CSV format: Each participant must have a name");
					return;
				}
				participants.push({ name: name.trim(), category: category.trim() });
			}
		}

		participants = participants.map((part) => ({
			name: part.name.replace(/\s+/g, ""),
			category: part.category.replace(/\s+/g, ""),
		}));

		const autoSaveData = localStorage.getItem("autoSaveProject");
		const parsedData = JSON.parse(autoSaveData);
		const categoryNames = new Set(parsedData.categories.map((cat) => cat.name));
		const invalidEntries = [];
		const validParticipants = participants.filter((part) => {
			const categoryParts = part.category.split(".");
			let isValid = true;
			for (let i = 0; i < categoryParts.length; i++) {
				const categoryName = categoryParts.slice(0, i + 1).join(".");
				if (!categoryNames.has(categoryName)) {
					isValid = false;
					break;
				}
			}
			if (!isValid) {
				invalidEntries.push(part);
				return false;
			}
			return true;
		});

		if (invalidEntries.length > 0) {
			logEntries.push("Invalid Participants:\n");
			invalidEntries.forEach((entry) => {
				logEntries.push(`Name: ${entry.name}, Category: ${entry.category}\n`);
			});
		}

		if (logEntries.length > 0) {
			const logBlob = new Blob(logEntries, { type: "text/plain" });
			const logUrl = URL.createObjectURL(logBlob);
			const logLink = document.createElement("a");
			logLink.href = logUrl;
			logLink.download = "import_log.txt";
			logLink.innerText = "Download log file";
			document.body.appendChild(logLink);
			alert(
				`Some (${invalidEntries.length}) participants had invalid categories. Check the log file for details.`
			);
			logLink.click();
			document.body.removeChild(logLink);
		} else {
			processImportedParticipants(
				validParticipants,
				importCallbackRef,
				setError
			);
		}
	} catch (err) {
		alert("Error parsing file");
	}
};
