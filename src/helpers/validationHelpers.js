import { validate as uuidValidate } from "uuid";

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
	}

	const invalidEntries = [];
	const validNodes = [];
	const nodeIds = new Set();

	nodes.forEach((node) => {
		const { id, type } = node;

		// Check if ID is valid and unique but ignore StartNode
		if (
			!id ||
			(!uuidValidate(id) && id !== "00000000-0000-0000-0000-000000000001")
		) {
			invalidEntries.push({ node, error: "Invalid or missing ID" });
			return;
		}

		if (nodeIds.has(id)) {
			invalidEntries.push({ node, error: "Duplicate ID" });
			return;
		}
		nodeIds.add(id);

		// Check if type is a valid string
		if (!type || typeof type !== "string") {
			invalidEntries.push({ node, error: "Invalid or missing type" });
			return;
		}

		// If all checks pass, add to validNodes
		validNodes.push(node);
	});

	if (invalidEntries.length > 0) {
		throw new Error(`Invalid nodes found: ${JSON.stringify(invalidEntries)}`);
	}

	return validNodes;
};

export const validateEdges = (edges, nodes) => {
	if (!Array.isArray(edges)) {
		throw new Error("Edges must be an array");
	}

	const invalidEntries = [];
	const validEdges = [];
	const edgeIds = new Set();
	const nodeIds = new Set(nodes.map((node) => node.id)); // Collect all valid node IDs

	edges.forEach((edge) => {
		const { id, source, target, type } = edge;

		// Check if ID is valid and unique
		if (!id) {
			invalidEntries.push({ edge, error: "Invalid or missing ID" });
			return;
		}

		if (edgeIds.has(id)) {
			invalidEntries.push({ edge, error: "Duplicate ID" });
			return;
		}
		edgeIds.add(id);

		// Check if source exists in nodes
		if (!source || !nodeIds.has(source)) {
			invalidEntries.push({ edge, error: "Invalid or missing source" });
			return;
		}

		// Check if target exists in nodes
		if (!target || !nodeIds.has(target)) {
			invalidEntries.push({ edge, error: "Invalid or missing target" });
			return;
		}

		// Check if type is a valid string
		if (!type || typeof type !== "string") {
			invalidEntries.push({ edge, error: "Invalid or missing type" });
			return;
		}

		// If all checks pass, add to validEdges
		validEdges.push(edge);
	});

	if (invalidEntries.length > 0) {
		throw new Error(`Invalid edges found: ${JSON.stringify(invalidEntries)}`);
	}

	return validEdges;
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
};
