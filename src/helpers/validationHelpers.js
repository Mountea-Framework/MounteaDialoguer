import { v5 as uuidv5, validate as uuidValidate } from "uuid";

const MY_NAMESPACE = "d9b2d63d-a233-4123-84c1-4390e2f0d11a";

export const convertToStandardGuid = (id) => {
	if (!id || typeof id !== "string") return null;

	try {
		// Remove any hyphens and convert to lowercase
		const cleanId = id.replace(/-/g, "").toLowerCase();

		// Check if it's a 32-character hex string
		if (/^[0-9a-f]{32}$/.test(cleanId)) {
			// Insert hyphens in correct positions
			const formattedId = [
				cleanId.slice(0, 8),
				cleanId.slice(8, 12),
				cleanId.slice(12, 16),
				cleanId.slice(16, 20),
				cleanId.slice(20),
			].join("-");

			// Convert to v5 UUID
			return uuidv5(formattedId, MY_NAMESPACE);
		}

		// If it's already a valid UUID, just return it
		if (uuidValidate(id)) {
			return id;
		}
	} catch (error) {
		console.error(`Failed to convert GUID: ${id}`, error);
	}

	return null;
};

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
		const originalNode = { ...node };
		let { id, type } = node;

		// Convert ID to standard format
		const standardizedId = convertToStandardGuid(id);

		if (!standardizedId) {
			invalidEntries.push({
				node: originalNode,
				error: "Invalid or missing ID",
			});
			return;
		}

		if (nodeIds.has(standardizedId)) {
			invalidEntries.push({ node: originalNode, error: "Duplicate ID" });
			return;
		}
		nodeIds.add(standardizedId);

		if (!type || typeof type !== "string") {
			invalidEntries.push({
				node: originalNode,
				error: "Invalid or missing type",
			});
			return;
		}

		// Add the node with standardized ID
		validNodes.push({
			...node,
			id: standardizedId,
		});
	});

	if (invalidEntries.length > 0) {
		throw new Error(`Invalid nodes found: ${JSON.stringify(invalidEntries)}`);
	}

	return validNodes;
};

export const validateDialogueRows = (dialogueRows, nodes) => {
	if (!Array.isArray(dialogueRows)) {
		throw new Error("DialogueRows must be an array");
	}

	if (!Array.isArray(nodes)) {
		throw new Error("Nodes must be an array");
	}

	const invalidEntries = [];
	const validDialogueRows = [];
	const dialogueRowIds = new Set();

	// Convert and collect all valid node IDs
	const nodeIds = new Set();
	nodes.forEach((node) => {
		const standardizedId = convertToStandardGuid(node.id);
		if (standardizedId) {
			nodeIds.add(standardizedId);
		}
	});

	dialogueRows.forEach((row) => {
		const originalRow = { ...row };
		let { id, nodeId } = row;

		// Convert both IDs to standard format
		const standardizedId = convertToStandardGuid(id);
		const standardizedNodeId = convertToStandardGuid(nodeId);

		if (!standardizedId) {
			invalidEntries.push({ row: originalRow, error: "Invalid or missing ID" });
			return;
		}

		if (dialogueRowIds.has(standardizedId)) {
			invalidEntries.push({ row: originalRow, error: "Duplicate ID" });
			return;
		}
		dialogueRowIds.add(standardizedId);

		if (!standardizedNodeId || !nodeIds.has(standardizedNodeId)) {
			invalidEntries.push({
				row: originalRow,
				error: "Invalid or missing nodeId",
			});
			return;
		}

		// Add the row with standardized IDs
		validDialogueRows.push({
			...row,
			id: standardizedId,
			nodeId: standardizedNodeId,
		});
	});

	if (invalidEntries.length > 0) {
		throw new Error(
			`Invalid dialogue rows found: ${JSON.stringify(invalidEntries)}`
		);
	}

	return validDialogueRows;
};

export const validateEdges = (edges, nodes) => {
	if (!Array.isArray(edges)) {
		throw new Error("Edges must be an array");
	}

	const invalidEntries = [];
	const validEdges = [];
	const edgeIds = new Set();

	// Convert and collect all valid node IDs
	const nodeIds = new Set();
	nodes.forEach((node) => {
		const standardizedId = convertToStandardGuid(node.id);
		if (standardizedId) {
			nodeIds.add(standardizedId);
		}
	});

	edges.forEach((edge) => {
		const originalEdge = { ...edge };
		let { id, source, target, type } = edge;

		// Convert IDs to standard format
		const standardizedId = convertToStandardGuid(id);
		const standardizedSource = convertToStandardGuid(source);
		const standardizedTarget = convertToStandardGuid(target);

		/*
		if (!standardizedId) {
			invalidEntries.push({
				edge: originalEdge,
				error: "Invalid or missing ID",
			});
			return;
		}
			*/

		if (edgeIds.has(standardizedId)) {
			invalidEntries.push({ edge: originalEdge, error: "Duplicate ID" });
			return;
		}
		edgeIds.add(standardizedId);

		// Check if source exists in nodes
		if (!standardizedSource || !nodeIds.has(standardizedSource)) {
			invalidEntries.push({
				edge: originalEdge,
				error: "Invalid or missing source",
			});
			return;
		}

		// Check if target exists in nodes
		if (!standardizedTarget || !nodeIds.has(standardizedTarget)) {
			invalidEntries.push({
				edge: originalEdge,
				error: "Invalid or missing target",
			});
			return;
		}

		// Check if type is a valid string
		if (!type || typeof type !== "string") {
			invalidEntries.push({
				edge: originalEdge,
				error: "Invalid or missing type",
			});
			return;
		}

		// Add the edge with standardized IDs
		validEdges.push({
			...edge,
			id: standardizedId,
			source: standardizedSource,
			target: standardizedTarget,
		});
	});

	if (invalidEntries.length > 0) {
		throw new Error(`Invalid edges found: ${JSON.stringify(invalidEntries)}`);
	}

	return validEdges;
};

export const validateAudioFolder = async (zip) => {
	const audioFolderPath = "audio/";

	// Get all file paths in the zip
	const files = Object.keys(zip.files);

	// Check if any file path starts with 'audio/' or if there's a placeholder for an empty directory
	const folderExists = files.some(
		(filePath) =>
			filePath === `${audioFolderPath}` ||
			filePath.startsWith(`${audioFolderPath}/`)
	);

	if (!folderExists) {
		throw new Error(
			`The folder "${audioFolderPath}" does not exist in the archive.`
		);
	}

	return true;
};
