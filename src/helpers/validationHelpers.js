// validationHelpers.js

export const validateCategories = (categories) => {
	if (!Array.isArray(categories)) {
		throw new Error("Categories must be an array");
	}
	if (categories.length === 0) {
		throw new Error("Categories cannot be empty");
	}

	const categoryNames = new Set(categories.map((cat) => cat.name));
	const invalidEntries = [];
	const parentMap = {};

	// First pass: build parentMap and check for basic validity
	categories.forEach((cat) => {
		if (!cat.name || typeof cat.name !== "string" || cat.name.trim() === "") {
			invalidEntries.push(cat);
		} else {
			parentMap[cat.name] = cat.parent ? cat.parent : "";
		}
	});

	// Second pass: validate hierarchical structure
	const validCategories = categories.filter((cat) => {
		if (invalidEntries.includes(cat)) return false;

		if (cat.parent) {
			const parentParts = cat.parent.split(".");
			const immediateParent = parentParts[parentParts.length - 1];
			if (!categoryNames.has(immediateParent)) {
				invalidEntries.push(cat);
				return false;
			}
		}
		return true;
	});

	// Build composite parents
	validCategories.forEach((cat) => {
		if (cat.parent) {
			const compositeParent = cat.parent;
			parentMap[cat.name] = compositeParent;
		} else {
			parentMap[cat.name] = cat.name;
		}
	});

	if (invalidEntries.length > 0) {
		throw new Error(
			`Invalid categories found: ${JSON.stringify(invalidEntries)}`
		);
	}

	return validCategories.map((cat) => ({
		name: cat.name,
		parent: parentMap[cat.name],
	}));
};

export const validateParticipants = (participants, categories) => {
	if (!Array.isArray(participants)) {
		throw new Error("Participants must be an array");
	}
	if (participants.length === 0) {
		throw new Error("Participants cannot be empty");
	}

	const categoryNames = new Set(categories.map((cat) => cat.name));
	const invalidEntries = [];
	const validParticipants = participants.filter((part) => {
		if (
			!part.name ||
			typeof part.name !== "string" ||
			part.name.trim() === ""
		) {
			invalidEntries.push(part);
			return false;
		}
		if (!part.category || typeof part.category !== "string") {
			invalidEntries.push(part);
			return false;
		}
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
		throw new Error(
			`Invalid participants found: ${JSON.stringify(invalidEntries)}`
		);
	}

	return validParticipants;
};

export const validateNodes = (nodes) => {
	if (!Array.isArray(nodes)) {
		throw new Error("Nodes must be an array");
		return false;
	}

	const invalidEntries = [];
	const validNodes = [];

	// First pass
	nodes.forEach((node) => {
		if (!node.id || node.id === "00000000-0000-0000-0000-000000000000" || node.id === "" || !node.type) {
			invalidEntries.push(node);
		} else {
			validNodes.push(node);
		}
	});

	return true;
	// Add more specific node validations here
};

export const validateEdges = (edges) => {
	if (!Array.isArray(edges)) {
		throw new Error("Edges must be an array");
		return false;
	}
	return true;
	// Add more specific edge validations here
};

export const validateDialogueRows = (dialogueRows) => {
	if (!Array.isArray(dialogueRows)) {
		throw new Error("DialogueRows must be an array");
		return false;
	}
	return true;
	// Add more specific dialogue row validations here
};

export const validateAudioFolder = (folderPath) => {
    return true;
}