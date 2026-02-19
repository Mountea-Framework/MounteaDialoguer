export const PREVIEW_START_NODE_ID = '00000000-0000-0000-0000-000000000001';

const PREVIEW_TERMINAL_TYPES = new Set(['completeNode', 'openChildGraphNode']);

export const getPreviewNodesAndEdges = (nodes = [], edges = []) => {
	const regularNodes = Array.isArray(nodes)
		? nodes.filter((node) => node?.type !== 'placeholderNode')
		: [];
	const regularEdges = Array.isArray(edges)
		? edges.filter((edge) => !edge?.data?.isPlaceholder)
		: [];

	return { regularNodes, regularEdges };
};

export const validatePreviewGraph = (nodes = [], edges = [], { maxNodes = 100 } = {}) => {
	const { regularNodes, regularEdges } = getPreviewNodesAndEdges(nodes, edges);
	const nodeMap = new Map(regularNodes.map((node) => [node.id, node]));
	const startNode = nodeMap.get(PREVIEW_START_NODE_ID);

	if (!startNode) {
		return { valid: false, reason: 'missing_start' };
	}

	if (regularNodes.length === 0) {
		return { valid: false, reason: 'empty_graph' };
	}

	if (regularNodes.length > maxNodes) {
		return {
			valid: false,
			reason: 'too_many_nodes',
			details: { maxNodes, count: regularNodes.length },
		};
	}

	const invalidEdge = regularEdges.find(
		(edge) => !edge?.source || !edge?.target || !nodeMap.has(edge.source) || !nodeMap.has(edge.target)
	);
	if (invalidEdge) {
		return { valid: false, reason: 'broken_edges' };
	}

	const outgoing = buildOutgoingMap(regularEdges);
	const reachable = new Set();
	const queue = [PREVIEW_START_NODE_ID];

	while (queue.length > 0) {
		const nodeId = queue.shift();
		if (reachable.has(nodeId)) continue;
		reachable.add(nodeId);
		(outgoing.get(nodeId) || []).forEach((nextId) => {
			if (!reachable.has(nextId)) queue.push(nextId);
		});
	}

	if (reachable.size <= 1) {
		return { valid: false, reason: 'no_playable_path' };
	}

	return {
		valid: true,
		graph: {
			nodeMap,
			outgoing,
			regularNodes,
			regularEdges,
		},
	};
};

export const buildOutgoingMap = (edges = []) => {
	const outgoing = new Map();
	edges.forEach((edge) => {
		if (!edge?.source || !edge?.target) return;
		if (!outgoing.has(edge.source)) outgoing.set(edge.source, []);
		outgoing.get(edge.source).push(edge.target);
	});
	return outgoing;
};

export const getReachablePreviewNodeIds = (nodes = [], edges = []) => {
	const { regularNodes, regularEdges } = getPreviewNodesAndEdges(nodes, edges);
	const nodeMap = new Map(regularNodes.map((node) => [node.id, node]));
	if (!nodeMap.has(PREVIEW_START_NODE_ID)) return [];

	const outgoing = buildOutgoingMap(regularEdges);
	const visited = new Set();
	const queue = [PREVIEW_START_NODE_ID];

	while (queue.length > 0) {
		const nodeId = queue.shift();
		if (visited.has(nodeId)) continue;
		if (!nodeMap.has(nodeId)) continue;
		visited.add(nodeId);

		(outgoing.get(nodeId) || []).forEach((nextId) => {
			if (!visited.has(nextId)) queue.push(nextId);
		});
	}

	return Array.from(visited);
};

export const getDialogueRowsForPreview = (node) => {
	if (!node?.data) return [];

	const rows = Array.isArray(node.data.dialogueRows) ? node.data.dialogueRows : [];
	if (rows.length > 0) return rows;

	if (typeof node.data.text === 'string' && node.data.text.trim().length > 0) {
		return [{ id: `${node.id}:legacy`, text: node.data.text, duration: 3.0 }];
	}

	return [];
};

export const getSpeakerForPreview = (node, t) => {
	if (!node) return '';
	if (node.data?.participant) return node.data.participant;
	if (node.data?.displayName) return node.data.displayName;
	if (node.data?.label) return node.data.label;

	switch (node.type) {
		case 'leadNode':
			return t('editor.nodes.npc');
		case 'answerNode':
			return t('editor.nodes.player');
		case 'completeNode':
			return t('editor.nodes.complete');
		case 'delayNode':
			return t('editor.nodes.delay');
		case 'returnNode':
			return t('editor.nodes.return');
		case 'openChildGraphNode':
			return t('editor.nodes.openChildGraph');
		default:
			return t('editor.nodes.start');
	}
};

export const isTerminalPreviewNode = (node) => PREVIEW_TERMINAL_TYPES.has(node?.type);

const stableStringifyObject = (value) => {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return '{}';
	const sorted = Object.keys(value)
		.sort()
		.reduce((acc, key) => {
			acc[key] = value[key];
			return acc;
		}, {});
	return JSON.stringify(sorted);
};

export const getPreviewConditionRuleKey = (rule) => {
	if (!rule || !rule.id) return '';
	const valuesKey = stableStringifyObject(rule.values);
	return `${rule.id}:${valuesKey}`;
};

export const collectPreviewScenarioRules = (edges = []) => {
	const seen = new Set();
	const collected = [];

	edges.forEach((edge) => {
		const rules = edge?.data?.conditions?.rules;
		if (!Array.isArray(rules)) return;

		rules.forEach((rule) => {
			const key = getPreviewConditionRuleKey(rule);
			if (!key || seen.has(key)) return;
			seen.add(key);
			collected.push({
				key,
				id: rule.id,
				name: rule.name || rule.id,
				values: rule.values || {},
			});
		});
	});

	return collected;
};

export const evaluatePreviewEdgeConditions = (edge, scenarioContext = {}) => {
	const conditionGroup = edge?.data?.conditions;
	const rules = Array.isArray(conditionGroup?.rules) ? conditionGroup.rules : [];
	if (rules.length === 0) return true;

	const mode = conditionGroup?.mode === 'any' ? 'any' : 'all';
	const evaluations = rules.map((rule) => {
		const key = getPreviewConditionRuleKey(rule);
		const rawResult = key && Object.prototype.hasOwnProperty.call(scenarioContext, key)
			? Boolean(scenarioContext[key])
			: true;
		return rule?.negate ? !rawResult : rawResult;
	});

	return mode === 'any'
		? evaluations.some(Boolean)
		: evaluations.every(Boolean);
};

export const resolvePreviewAudioSource = (row) => {
	const audio = row?.audioFile;
	if (!audio) return null;

	if (audio.blob) {
		return {
			url: URL.createObjectURL(audio.blob),
			revokeOnCleanup: true,
		};
	}

	if (typeof audio.url === 'string' && audio.url.trim().length > 0) {
		return { url: audio.url, revokeOnCleanup: false };
	}

	if (typeof audio.dataUrl === 'string' && audio.dataUrl.trim().length > 0) {
		return { url: audio.dataUrl, revokeOnCleanup: false };
	}

	return null;
};
