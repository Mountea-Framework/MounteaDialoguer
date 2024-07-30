import { saveProjectToLocalStorage } from "../hooks/useAutoSave";

export const processImportedCategories = (
	importedCategories,
	importCallbackRef,
	setError
) => {
	const autoSaveData = localStorage.getItem("autoSaveProject");
	if (!autoSaveData) {
		setError("No data found in local storage.");
		return;
	}

	const parsedData = JSON.parse(autoSaveData);
	const existingCategories = parsedData.categories || [];

	const mergedCategories = [...existingCategories, ...importedCategories];
	const uniqueCategories = Array.from(
		new Set(mergedCategories.map((cat) => JSON.stringify(cat)))
	).map((str) => JSON.parse(str));

	saveProjectToLocalStorage({ ...parsedData, categories: uniqueCategories });

	if (importCallbackRef.current) {
		importCallbackRef.current(uniqueCategories);
	}

	alert("Categories imported and merged successfully.");
};

export const importCategories = async (e, importCallbackRef, setError) => {
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
			categories = data.categories;
		} else if (file.type === "application/xml" || file.type === "text/xml") {
			const parser = new DOMParser();
			const xmlDoc = parser.parseFromString(fileContent, "application/xml");
			const xmlCategories = xmlDoc.getElementsByTagName("category");
			if (xmlCategories.length === 0) {
				alert("Invalid XML format: No categories found");
				return;
			}
			for (let i = 0; i < xmlCategories.length; i++) {
				const name = xmlCategories[i].getElementsByTagName("name")[0];
				const parent = xmlCategories[i].getElementsByTagName("parent")[0];
				if (!name || name.textContent.trim() === "") {
					alert("Invalid XML format: Each category must have a name");
					return;
				}
				categories.push({
					name: name.textContent.trim(),
					parent: parent ? parent.textContent.trim() : "",
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
			if (!headers.includes("name") || !headers.includes("parent")) {
				alert("Invalid CSV format: Missing 'name' or 'parent' columns");
				return;
			}
			const nameIndex = headers.indexOf("name");
			const parentIndex = headers.indexOf("parent");
			const csvCategories = rows.slice(1).filter((row) => row.length > 1);
			if (csvCategories.length === 0) {
				alert("Invalid CSV format: No categories found");
				return;
			}
			for (let i = 0; i < csvCategories.length; i++) {
				const name = csvCategories[i][nameIndex];
				const parent = csvCategories[i][parentIndex];
				if (!name || name.trim() === "") {
					alert("Invalid CSV format: Each category must have a name");
					return;
				}
				categories.push({ name: name.trim(), parent: parent.trim() });
			}
		}

		categories = categories.map((cat) => ({
			name: cat.name.replace(/\s+/g, ""),
			parent: cat.parent.replace(/\s+/g, ""),
		}));

		const categoryNames = new Set(categories.map((cat) => cat.name));
		const invalidEntries = [];
		const validCategories = categories.filter((cat) => {
			if (cat.parent && !categoryNames.has(cat.parent)) {
				invalidEntries.push(cat);
				return false;
			}
			return true;
		});

		if (invalidEntries.length > 0) {
			logEntries.push("Invalid Categories:\n");
			invalidEntries.forEach((entry) => {
				logEntries.push(`Name: ${entry.name}, Parent: ${entry.parent}\n`);
			});
		}

		const parentMap = {};
		validCategories.forEach((cat) => {
			if (cat.parent) {
				const compositeParent = parentMap[cat.parent]
					? parentMap[cat.parent]
					: cat.parent;
				parentMap[cat.name] = `${compositeParent}.${cat.name}`;
				cat.parent = compositeParent;
			} else {
				parentMap[cat.name] = cat.name;
			}
		});

		if (logEntries.length > 0) {
			const logBlob = new Blob(logEntries, { type: "text/plain" });
			const logUrl = URL.createObjectURL(logBlob);
			const logLink = document.createElement("a");
			logLink.href = logUrl;
			logLink.download = "import_log.txt";
			logLink.innerText = "Download log file";
			document.body.appendChild(logLink);
			alert(
				`Some (${invalidEntries.length}) categories had invalid parents. Check the log file for details.`
			);
			logLink.click();
			document.body.removeChild(logLink);
		} else {
			processImportedCategories(validCategories, importCallbackRef, setError);
		}
	} catch (err) {
		alert("Error parsing file");
	}
};
