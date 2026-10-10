import dagre from 'dagre';

export const START_NODE_ID = '00000000-0000-0000-0000-000000000001';
export const START_NODE_ANCHOR_POSITION = { x: 0, y: 0 };

export const DEFAULT_NODE_SIZE_BY_TYPE = {
	startNode: { width: 200, height: 88 },
	leadNode: { width: 250, height: 124 },
	answerNode: { width: 250, height: 124 },
	returnNode: { width: 250, height: 110 },
	openChildGraphNode: { width: 250, height: 110 },
	completeNode: { width: 250, height: 124 },
	delayNode: { width: 250, height: 100 },
	placeholderNode: { width: 160, height: 72 },
};

const parseSize = (value) => {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

export const getNodeSize = (node) => {
	const measuredWidth = parseSize(node?.measured?.width);
	const measuredHeight = parseSize(node?.measured?.height);
	const nodeWidth = parseSize(node?.width);
	const nodeHeight = parseSize(node?.height);
	const styleWidth = parseSize(node?.style?.width);
	const styleHeight = parseSize(node?.style?.height);
	const fallback = DEFAULT_NODE_SIZE_BY_TYPE[node?.type] || { width: 250, height: 120 };

	return {
		width: measuredWidth || nodeWidth || styleWidth || fallback.width,
		height: measuredHeight || nodeHeight || styleHeight || fallback.height,
	};
};

// Auto-layout function using dagre
export const getLayoutedElements = (nodes, edges, direction = 'TB') => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));

	dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

	nodes.forEach((node) => {
		const { width, height } = getNodeSize(node);
		dagreGraph.setNode(node.id, { width, height });
	});

	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	const rawLayoutedNodes = nodes.map((node) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		const { width, height } = getNodeSize(node);

		if (!nodeWithPosition) {
			return node;
		}

		return {
			...node,
			position: {
				x: nodeWithPosition.x - width / 2,
				y: nodeWithPosition.y - height / 2,
			},
		};
	});

	const layoutedStartNode = rawLayoutedNodes.find((node) => node.id === START_NODE_ID);
	const anchorDelta = layoutedStartNode
		? {
				x: START_NODE_ANCHOR_POSITION.x - layoutedStartNode.position.x,
				y: START_NODE_ANCHOR_POSITION.y - layoutedStartNode.position.y,
			}
		: { x: 0, y: 0 };

	const layoutedNodes = rawLayoutedNodes.map((node) => ({
		...node,
		position: {
			x: node.position.x + anchorDelta.x,
			y: node.position.y + anchorDelta.y,
		},
	}));

	return { nodes: layoutedNodes, edges };
};
