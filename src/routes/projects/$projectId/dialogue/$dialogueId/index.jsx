import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
	ReactFlow,
	Background,
	MiniMap,
	addEdge,
	useNodesState,
	useEdgesState,
	MarkerType,
	Panel,
	useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from 'dagre';
import { ZoomSlider } from '@/components/dialogue/ZoomSlider';
import {
	ArrowLeft,
	Save,
	Download,
	Undo2,
	Redo2,
	Sun,
	Moon,
	MessageCircle,
	Settings,
	User,
	CheckCircle2,
	CornerUpLeft,
	Heart,
	X,
	HelpCircle,
	Network,
	Menu,
	Trash2,
	PanelRightOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/contexts/ThemeProvider';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParticipantStore } from '@/stores/participantStore';
import { useDecoratorStore } from '@/stores/decoratorStore';
import { v4 as uuidv4 } from 'uuid';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';

// Custom Node Components
import StartNode from '@/components/dialogue/nodes/StartNode';
import LeadNode from '@/components/dialogue/nodes/LeadNode';
import AnswerNode from '@/components/dialogue/nodes/AnswerNode';
import ReturnNode from '@/components/dialogue/nodes/ReturnNode';
import CompleteNode from '@/components/dialogue/nodes/CompleteNode';
import PlaceholderNode from '@/components/dialogue/nodes/PlaceholderNode';
import { DialogueRowsPanel } from '@/components/dialogue/DialogueRowsPanel';
import { DecoratorsPanel } from '@/components/dialogue/DecoratorsPanel';
import { CollapsibleSection } from '@/components/dialogue/CollapsibleSection';
import { SaveIndicator } from '@/components/ui/save-indicator';
import { OnboardingTour, useOnboarding } from '@/components/ui/onboarding-tour';
import { celebrateSuccess } from '@/lib/confetti';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { NodeTypeSelectionModal } from '@/components/dialogue/NodeTypeSelectionModal';
import { getDeviceType } from '@/lib/deviceDetection';

export const Route = createFileRoute(
	'/projects/$projectId/dialogue/$dialogueId/'
)({
	component: DialogueEditorPage,
});

// Initial nodes and edges for new dialogues
const initialNodes = [
	{
		id: '00000000-0000-0000-0000-000000000001',
		type: 'startNode',
		data: {
			label: 'Dialogue entry point',
			displayName: 'Start',
		},
		position: { x: 250, y: 100 },
		deletable: false,
	},
];

const initialEdges = [];

// Node type definitions
const nodeTypes = {
	startNode: StartNode,
	leadNode: LeadNode,
	answerNode: AnswerNode,
	returnNode: ReturnNode,
	completeNode: CompleteNode,
	placeholderNode: PlaceholderNode,
};

// Auto-layout function using dagre
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));

	const nodeWidth = 250;
	const nodeHeight = 100;

	const isHorizontal = direction === 'LR';
	dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 100 });

	nodes.forEach((node) => {
		dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	});

	edges.forEach((edge) => {
		dagreGraph.setEdge(edge.source, edge.target);
	});

	dagre.layout(dagreGraph);

	const layoutedNodes = nodes.map((node) => {
		const nodeWithPosition = dagreGraph.node(node.id);
		return {
			...node,
			position: {
				x: nodeWithPosition.x - nodeWidth / 2,
				y: nodeWithPosition.y - nodeHeight / 2,
			},
		};
	});

	return { nodes: layoutedNodes, edges };
};

function DialogueEditorPage() {
	const { t } = useTranslation();
	const { theme, setTheme } = useTheme();
	const { projectId, dialogueId } = Route.useParams();
	const { projects, loadProjects } = useProjectStore();
	const { dialogues, loadDialogues, saveDialogueGraph, loadDialogueGraph, exportDialogue } =
		useDialogueStore();
	const { participants, loadParticipants } = useParticipantStore();
	const { decorators, loadDecorators } = useDecoratorStore();

	const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// Prevent deletion of Start Node
	const onNodesChange = useCallback((changes) => {
		const filteredChanges = changes.filter((change) => {
			if (change.type === 'remove' && change.id === '00000000-0000-0000-0000-000000000001') {
				return false; // Prevent Start Node deletion
			}
			return true;
		});
		onNodesChangeBase(filteredChanges);
	}, [onNodesChangeBase]);
	const [selectedNode, setSelectedNode] = useState(null);
	const [selectedEdge, setSelectedEdge] = useState(null);
	const [isSaving, setIsSaving] = useState(false);
	const [saveSuccess, setSaveSuccess] = useState(false);
	const [saveStatus, setSaveStatus] = useState('saved');
	const [lastSaved, setLastSaved] = useState(null);
	const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });
	const [reactFlowInstance, setReactFlowInstance] = useState(null);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	// Onboarding tour
	const { runTour, finishTour, resetTour } = useOnboarding('dialogue-editor');

	// Device detection
	const [deviceType, setDeviceType] = useState('desktop');
	const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState(false);
	const [pendingPlaceholderData, setPendingPlaceholderData] = useState(null);
	const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);

	// Detect device type on mount and window resize
	useEffect(() => {
		const updateDeviceType = () => {
			setDeviceType(getDeviceType());
		};
		updateDeviceType();
		window.addEventListener('resize', updateDeviceType);
		return () => window.removeEventListener('resize', updateDeviceType);
	}, []);

	// History for undo/redo
	const [history, setHistory] = useState([
		{ nodes: initialNodes, edges: initialEdges },
	]);
	const [historyIndex, setHistoryIndex] = useState(0);

	// Load data
	useEffect(() => {
		loadProjects();
		loadDialogues(projectId);
		loadParticipants(projectId);
		loadDecorators(projectId);
	}, [loadProjects, loadDialogues, loadParticipants, loadDecorators, projectId]);

	// Track if viewport was loaded from save
	const [hasLoadedViewport, setHasLoadedViewport] = useState(false);

	// Load dialogue graph when dialogue changes
	useEffect(() => {
		const loadGraph = async () => {
			if (dialogueId) {
				try {
					const result = await loadDialogueGraph(dialogueId);
					const { nodes: loadedNodes, edges: loadedEdges, viewport: loadedViewport } = result;

					if (loadedNodes.length > 0 || loadedEdges.length > 0) {
						setNodes(loadedNodes);
						setEdges(loadedEdges);
						setHistory([{ nodes: loadedNodes, edges: loadedEdges }]);
						setHistoryIndex(0);
					}

					// Restore viewport if saved and ReactFlow instance is available
					if (loadedViewport && reactFlowInstance) {
						reactFlowInstance.setViewport(loadedViewport, { duration: 0 });
						setHasLoadedViewport(true);
					}
				} catch (error) {
					console.error('Failed to load dialogue graph:', error);
				}
			}
		};
		loadGraph();
	}, [dialogueId, loadDialogueGraph, setNodes, setEdges, reactFlowInstance]);

	// Sync selected node with nodes state to reflect updates
	useEffect(() => {
		if (selectedNode) {
			const updatedNode = nodes.find((n) => n.id === selectedNode.id);
			if (updatedNode) {
				setSelectedNode(updatedNode);
			}
		}
	}, [nodes]);

	// Auto-focus on start node when graph loads (both mobile and desktop)
	// Only if no saved viewport was loaded
	const [hasInitialFocus, setHasInitialFocus] = useState(false);
	useEffect(() => {
		if (reactFlowInstance && nodes.length > 0 && !hasInitialFocus && !hasLoadedViewport) {
			const startNode = nodes.find((n) => n.id === '00000000-0000-0000-0000-000000000001');
			if (startNode) {
				// Center on the start node
				setTimeout(() => {
					reactFlowInstance.setCenter(
						startNode.position.x + 100, // Offset to center of node
						startNode.position.y + 50,
						{ zoom: 1, duration: 300 }
					);
					setHasInitialFocus(true);
				}, 100);
			}
		}
	}, [reactFlowInstance, nodes.length, hasInitialFocus, hasLoadedViewport]);


	// Save to history for undo/redo
	const saveToHistory = useCallback(
		(newNodes, newEdges) => {
			setHistory((prev) => {
				const newHistory = prev.slice(0, historyIndex + 1);
				newHistory.push({ nodes: newNodes, edges: newEdges });
				// Keep only last 50 states to avoid memory issues
				if (newHistory.length > 50) {
					newHistory.shift();
					setHistoryIndex(newHistory.length - 1);
					return newHistory;
				}
				setHistoryIndex(newHistory.length - 1);
				return newHistory;
			});
		},
		[historyIndex]
	);

	// Save to history when selected node changes (user clicked away after editing)
	const prevSelectedNodeRef = useRef(selectedNode);
	useEffect(() => {
		const prevNode = prevSelectedNodeRef.current;
		if (prevNode && prevNode !== selectedNode) {
			// User switched to a different node or deselected, save current state
			saveToHistory(nodes, edges);
			setHasUnsavedChanges(true);
			setSaveStatus('unsaved');
		}
		prevSelectedNodeRef.current = selectedNode;
	}, [selectedNode, nodes, edges, saveToHistory]);

	// Warn before leaving with unsaved changes
	useEffect(() => {
		const handleBeforeUnload = (e) => {
			if (hasUnsavedChanges) {
				e.preventDefault();
				e.returnValue = '';
				return '';
			}
		};

		window.addEventListener('beforeunload', handleBeforeUnload);
		return () => window.removeEventListener('beforeunload', handleBeforeUnload);
	}, [hasUnsavedChanges]);

	const project = projects.find((p) => p.id === projectId);
	const dialogue = dialogues.find((d) => d.id === dialogueId);

	// Handle edge connection
	const onConnect = useCallback(
		(params) => {
			const newEdge = {
				...params,
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			};
			setEdges((eds) => {
				const updatedEdges = addEdge(newEdge, eds);
				saveToHistory(nodes, updatedEdges);
				return updatedEdges;
			});
		},
		[setEdges, nodes, saveToHistory]
	);

	// Handle node click
	const onNodeClick = useCallback((event, node) => {
		// Skip placeholder nodes
		if (node.type === 'placeholderNode') return;

		setSelectedNode(node);
		setSelectedEdge(null); // Deselect edge when node is selected
	}, []);

	// Handle edge click
	const onEdgeClick = useCallback((event, edge) => {
		setSelectedEdge(edge);
		setSelectedNode(null); // Deselect node when edge is selected
	}, []);

	// Handle pane click (deselect all)
	const onPaneClick = useCallback(() => {
		setSelectedNode(null);
		setSelectedEdge(null);
	}, []);

	// Delete selected node
	const deleteSelectedNode = useCallback(() => {
		if (selectedNode && selectedNode.id !== '00000000-0000-0000-0000-000000000001') {
			setNodes((nds) => {
				const updatedNodes = nds.filter((n) => n.id !== selectedNode.id);
				// Also remove edges connected to this node
				setEdges((eds) => {
					const updatedEdges = eds.filter(
						(e) => e.source !== selectedNode.id && e.target !== selectedNode.id
					);
					saveToHistory(updatedNodes, updatedEdges);
					return updatedEdges;
				});
				return updatedNodes;
			});
			setSelectedNode(null);
		}
	}, [selectedNode, setNodes, setEdges, saveToHistory]);

	// Handle keyboard events
	useEffect(() => {
		const handleKeyDown = (event) => {
			// Don't delete if user is typing in an input field
			const target = event.target;
			const isTyping =
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable;

			if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping) {
				event.preventDefault();

				// Delete selected node
				if (selectedNode && selectedNode.id !== '00000000-0000-0000-0000-000000000001') {
					deleteSelectedNode();
				}
				// Delete selected edge
				else if (selectedEdge) {
					setEdges((eds) => {
						const updatedEdges = eds.filter((e) => e.id !== selectedEdge.id);
						saveToHistory(nodes, updatedEdges);
						return updatedEdges;
					});
					setSelectedEdge(null);
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [selectedNode, selectedEdge, deleteSelectedNode, setEdges, nodes, saveToHistory]);

	// Update node data (without saving to history on every keystroke)
	const updateNodeData = useCallback(
		(nodeId, newData) => {
			setNodes((nds) =>
				nds.map((node) =>
					node.id === nodeId
						? { ...node, data: { ...node.data, ...newData } }
						: node
				)
			);
		},
		[setNodes]
	);

	// Add decorator to node
	const addDecoratorToNode = useCallback(
		(nodeId, decoratorDef) => {
			setNodes((nds) => {
				const updatedNodes = nds.map((node) => {
					if (node.id === nodeId) {
						// Create decorator instance with default values
						const decoratorInstance = {
							id: decoratorDef.id,
							name: decoratorDef.name,
							values: {},
						};

						// Populate default values from decorator properties
						if (decoratorDef.properties && decoratorDef.properties.length > 0) {
							decoratorDef.properties.forEach((prop) => {
								decoratorInstance.values[prop.name] = prop.defaultValue || '';
							});
						}

						return {
							...node,
							data: {
								...node.data,
								decorators: [...(node.data.decorators || []), decoratorInstance],
							},
						};
					}
					return node;
				});
				saveToHistory(updatedNodes, edges);
				return updatedNodes;
			});
		},
		[setNodes, edges, saveToHistory]
	);

	// Remove decorator from node
	const removeDecoratorFromNode = useCallback(
		(nodeId, decoratorIndex) => {
			setNodes((nds) => {
				const updatedNodes = nds.map((node) =>
					node.id === nodeId
						? {
								...node,
								data: {
									...node.data,
									decorators: node.data.decorators.filter(
										(_, idx) => idx !== decoratorIndex
									),
								},
						  }
						: node
				);
				saveToHistory(updatedNodes, edges);
				return updatedNodes;
			});
		},
		[setNodes, edges, saveToHistory]
	);

	// Add new node based on type
	const addNode = useCallback(
		(nodeType, position) => {
			const typeNames = {
				leadNode: 'NPC',
				answerNode: 'Player',
				returnNode: 'Return',
				completeNode: 'Complete',
			};

			const newNode = {
				id: uuidv4(),
				type: nodeType,
				data: {
					label: `New ${nodeType}`,
					displayName: typeNames[nodeType] || 'Node',
					text: '',
					participant: '',
					decorators: [],
					dialogueRows: [],
					selectionTitle: '',
					hasAudio: false,
				},
				position: position || {
					x: Math.random() * 400 + 100,
					y: Math.random() * 400 + 100,
				},
			};
			setNodes((nds) => {
				const updatedNodes = [...nds, newNode];
				saveToHistory(updatedNodes, edges);
				return updatedNodes;
			});
		},
		[setNodes, edges, saveToHistory]
	);


	// Handle placeholder node click (mobile)
	const handlePlaceholderClick = useCallback((placeholderId, position, parentNodeId) => {
		setPendingPlaceholderData({ placeholderId, position, parentNodeId });
		setIsNodeTypeModalOpen(true);
	}, []);

	// Handle node type selection from modal (mobile)
	const handleNodeTypeSelect = useCallback((nodeType) => {
		if (!pendingPlaceholderData) return;

		const { placeholderId, position, parentNodeId } = pendingPlaceholderData;

		// Create the new node with complete data structure
		const newNodeId = uuidv4();
		const typeNames = {
			leadNode: 'NPC',
			answerNode: 'Player',
			returnNode: 'Return',
			completeNode: 'Complete',
		};

		const newNode = {
			id: newNodeId,
			type: nodeType,
			position: position,
			data: {
				label: `New ${nodeType}`,
				displayName: typeNames[nodeType] || 'Node',
				text: '',
				participant: '',
				decorators: [],
				dialogueRows: [],
				selectionTitle: '',
				hasAudio: false,
			},
		};

		// Check if parent is the Start Node
		const isStartNode = parentNodeId === '00000000-0000-0000-0000-000000000001';
		const canHaveOutputs = nodeType !== 'returnNode' && nodeType !== 'completeNode';
		const newPlaceholderId = canHaveOutputs ? uuidv4() : null;

		setNodes((nds) => {
			let updatedNodes = [...nds];

			// If parent is Start Node, remove its placeholder (Start can only have one output)
			if (isStartNode) {
				updatedNodes = updatedNodes.filter((n) => n.id !== placeholderId);
			}
			// Otherwise keep the placeholder (node can have multiple branches)

			// Add the new node
			updatedNodes.push(newNode);

			// Add a placeholder below the new node (only if it can have outputs)
			if (canHaveOutputs) {
				updatedNodes.push({
					id: newPlaceholderId,
					type: 'placeholderNode',
					data: {
						label: 'Add Node',
						onClick: handlePlaceholderClick,
						parentNodeId: newNodeId,
					},
					position: {
						x: position.x,
						y: position.y + 250,
					},
				});
			}

			return updatedNodes;
		});

		// Update edges
		setEdges((eds) => {
			let updatedEdges = [...eds];

			// If parent is Start Node, remove the placeholder edge
			if (isStartNode) {
				updatedEdges = updatedEdges.filter((e) => e.id !== `${parentNodeId}-${placeholderId}`);
			}

			// Add edge from parent to new node
			const newEdge = {
				id: `${parentNodeId}-${newNodeId}`,
				source: parentNodeId,
				target: newNodeId,
				type: 'default',
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			};
			updatedEdges = addEdge(newEdge, updatedEdges);

			// Add edge from new node to its placeholder (only if it can have outputs)
			if (canHaveOutputs) {
				updatedEdges.push({
					id: `${newNodeId}-${newPlaceholderId}`,
					source: newNodeId,
					target: newPlaceholderId,
					type: 'default',
					style: {
						strokeWidth: 1,
						stroke: '#94a3b8',
						strokeDasharray: '5,5'
					},
					data: { isPlaceholder: true },
				});
			}

			return updatedEdges;
		});

		// Close modal and clear pending data
		setIsNodeTypeModalOpen(false);
		setPendingPlaceholderData(null);
	}, [pendingPlaceholderData, setNodes, setEdges, handlePlaceholderClick]);

	// Add placeholders to nodes on mobile
	useEffect(() => {
		if (deviceType !== 'mobile' || nodes.length === 0) return;

		const regularNodes = nodes.filter((n) => n.type !== 'placeholderNode');
		const placeholderNodes = nodes.filter((n) => n.type === 'placeholderNode');
		const newPlaceholders = [];
		const newEdges = [];

		regularNodes.forEach((node) => {
			// Skip nodes that cannot have outputs (Return and Complete nodes)
			if (node.type === 'returnNode' || node.type === 'completeNode') {
				return;
			}

			// Check if this node already has a placeholder
			const hasPlaceholder = placeholderNodes.some((p) => p.data?.parentNodeId === node.id);

			if (!hasPlaceholder) {
				const placeholderId = uuidv4();

				// For Start Node, only add placeholder if it has no children
				if (node.id === '00000000-0000-0000-0000-000000000001') {
					const hasChildren = edges.some((e) => e.source === node.id && !e.data?.isPlaceholder);
					if (!hasChildren) {
						newPlaceholders.push({
							id: placeholderId,
							type: 'placeholderNode',
							data: {
								label: 'Add Node',
								onClick: handlePlaceholderClick,
								parentNodeId: node.id,
							},
							position: {
								x: node.position.x,
								y: node.position.y + 250,
							},
						});

						// Add edge from parent to placeholder (thin dashed line)
						newEdges.push({
							id: `${node.id}-${placeholderId}`,
							source: node.id,
							target: placeholderId,
							type: 'default',
							style: {
								strokeWidth: 1,
								stroke: '#94a3b8',
								strokeDasharray: '5,5'
							},
							data: { isPlaceholder: true },
						});
					}
				} else {
					// For Lead and Answer nodes, always add a placeholder
					newPlaceholders.push({
						id: placeholderId,
						type: 'placeholderNode',
						data: {
							label: 'Add Node',
							onClick: handlePlaceholderClick,
							parentNodeId: node.id,
						},
						position: {
							x: node.position.x,
							y: node.position.y + 250,
						},
					});

					// Add edge from parent to placeholder (thin dashed line)
					newEdges.push({
						id: `${node.id}-${placeholderId}`,
						source: node.id,
						target: placeholderId,
						type: 'default',
						style: {
							strokeWidth: 1,
							stroke: '#94a3b8',
							strokeDasharray: '5,5'
						},
						data: { isPlaceholder: true },
					});
				}
			}
		});

		if (newPlaceholders.length > 0) {
			setNodes((nds) => [...nds, ...newPlaceholders]);
			setEdges((eds) => [...eds, ...newEdges]);
		}
	}, [deviceType, nodes, edges, handlePlaceholderClick, setNodes, setEdges]);

	// Auto-layout handler
	const onLayout = useCallback(() => {
		const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
			nodes,
			edges
		);

		setNodes(layoutedNodes);
		setEdges(layoutedEdges);
		saveToHistory(layoutedNodes, layoutedEdges);
		setHasUnsavedChanges(true);
	}, [nodes, edges, setNodes, setEdges, saveToHistory]);

	// Auto-apply layout on mobile when nodes change
	const [lastLayoutNodeCount, setLastLayoutNodeCount] = useState(0);
	const [hasInitialLayout, setHasInitialLayout] = useState(false);

	useEffect(() => {
		if (deviceType !== 'mobile') return;

		const regularNodeCount = nodes.filter((n) => n.type !== 'placeholderNode').length;

		// Run initial layout after dialogue loads (including placeholders)
		if (!hasInitialLayout && nodes.length > 0 && regularNodeCount > 0) {
			const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
				nodes,
				edges
			);
			setNodes(layoutedNodes);
			setEdges(layoutedEdges);
			setLastLayoutNodeCount(regularNodeCount);
			setHasInitialLayout(true);
			return;
		}

		// Only run layout if regular node count changed (user added a node)
		if (hasInitialLayout && regularNodeCount > 0 && regularNodeCount !== lastLayoutNodeCount) {
			const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
				nodes,
				edges
			);
			setNodes(layoutedNodes);
			setEdges(layoutedEdges);
			setLastLayoutNodeCount(regularNodeCount);
		}
	}, [deviceType, nodes.length, edges.length]);

	// Undo
	const handleUndo = useCallback(() => {
		if (historyIndex > 0) {
			const newIndex = historyIndex - 1;
			const { nodes: prevNodes, edges: prevEdges } = history[newIndex];
			setNodes(prevNodes);
			setEdges(prevEdges);
			setHistoryIndex(newIndex);
		}
	}, [historyIndex, history, setNodes, setEdges]);

	// Redo
	const handleRedo = useCallback(() => {
		if (historyIndex < history.length - 1) {
			const newIndex = historyIndex + 1;
			const { nodes: nextNodes, edges: nextEdges } = history[newIndex];
			setNodes(nextNodes);
			setEdges(nextEdges);
			setHistoryIndex(newIndex);
		}
	}, [historyIndex, history, setNodes, setEdges]);

	// Handle viewport change
	const onMove = useCallback((event, newViewport) => {
		setViewport(newViewport);
	}, []);

	// Handle drag start for node spawning
	const onDragStart = useCallback((event, nodeType) => {
		event.dataTransfer.setData('application/reactflow', nodeType);
		event.dataTransfer.effectAllowed = 'move';
	}, []);

	// Handle drop on canvas to spawn node
	const onDrop = useCallback(
		(event) => {
			event.preventDefault();

			const nodeType = event.dataTransfer.getData('application/reactflow');
			if (!nodeType || !reactFlowInstance) return;

			// Get the drop position in flow coordinates
			const position = reactFlowInstance.screenToFlowPosition({
				x: event.clientX,
				y: event.clientY,
			});

			// Create the node at the drop position
			addNode(nodeType, position);
		},
		[reactFlowInstance, addNode]
	);

	// Allow drop on canvas
	const onDragOver = useCallback((event) => {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
	}, []);

	// Handle save
	const handleSave = async () => {
		setIsSaving(true);
		setSaveSuccess(false);
		setSaveStatus('saving');
		try {
			// Filter out placeholder nodes and their edges before saving
			const regularNodes = nodes.filter((n) => n.type !== 'placeholderNode');
			const regularEdges = edges.filter((e) => !e.data?.isPlaceholder);

			await saveDialogueGraph(dialogueId, regularNodes, regularEdges, viewport);
			const now = new Date();
			setLastSaved(now);
			setSaveSuccess(true);
			setSaveStatus('saved');
			setHasUnsavedChanges(false);
			celebrateSuccess();
			setTimeout(() => setSaveSuccess(false), 2000);
		} catch (error) {
			console.error('Failed to save dialogue:', error);
			setSaveStatus('error');
			setTimeout(() => setSaveStatus('unsaved'), 3000);
		} finally {
			setIsSaving(false);
		}
	};

	// Handle export
	const handleExport = async () => {
		try {
			// Filter out placeholder nodes and their edges before saving
			const regularNodes = nodes.filter((n) => n.type !== 'placeholderNode');
			const regularEdges = edges.filter((e) => !e.data?.isPlaceholder);

			// Save first to ensure we export the latest version
			await saveDialogueGraph(dialogueId, regularNodes, regularEdges, viewport);
			// Then export
			await exportDialogue(dialogueId);
		} catch (error) {
			console.error('Failed to export dialogue:', error);
		}
	};

	if (!dialogue || !project) {
		return (
			<div className="h-screen flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col overflow-hidden">
			{/* Onboarding Tour - Desktop only */}
			{deviceType !== 'mobile' && (
				<OnboardingTour
					run={runTour}
					onFinish={finishTour}
					tourType="editor"
				/>
			)}

			{/* Header */}
			<header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-4 md:px-12 py-3 md:py-4 flex items-center justify-between" data-tour="editor-header">
				<div className="flex items-center gap-2 md:gap-4 min-w-0">
					<Link to="/projects/$projectId" params={{ projectId }}>
						<Button variant="ghost" size="icon" className="rounded-full shrink-0">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div className="min-w-0">
						<h1 className="text-sm md:text-2xl font-bold tracking-tight truncate">{dialogue.name}</h1>
						<p className="text-xs md:text-sm text-muted-foreground truncate">{project.name}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<SaveIndicator
						status={saveStatus}
						lastSaved={lastSaved}
						className="hidden md:flex"
					/>

					{/* Single Menu with all actions */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="outline"
								size="icon"
								className="rounded-full"
								data-tour="save-button"
							>
								<Menu className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-56">
							{/* File Section */}
							<DropdownMenuLabel>File</DropdownMenuLabel>
							<DropdownMenuItem
								onClick={handleSave}
								disabled={isSaving}
							>
								<Save className="h-4 w-4 mr-2" />
								{isSaving ? t('common.saving') : t('common.save')}
								<span className="ml-auto text-xs text-muted-foreground">Ctrl+S</span>
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleExport}>
								<Download className="h-4 w-4 mr-2" />
								Export
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							{/* Edit Section */}
							<DropdownMenuLabel>Edit</DropdownMenuLabel>
							<DropdownMenuItem
								onClick={handleUndo}
								disabled={historyIndex === 0}
							>
								<Undo2 className="h-4 w-4 mr-2" />
								Undo
								<span className="ml-auto text-xs text-muted-foreground">Ctrl+Z</span>
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={handleRedo}
								disabled={historyIndex === history.length - 1}
							>
								<Redo2 className="h-4 w-4 mr-2" />
								Redo
								<span className="ml-auto text-xs text-muted-foreground">Ctrl+Y</span>
							</DropdownMenuItem>

							<DropdownMenuSeparator />

							{/* View Section */}
							<DropdownMenuLabel>View</DropdownMenuLabel>
							<DropdownMenuItem
								onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
							>
								{theme === 'dark' ? (
									<Sun className="h-4 w-4 mr-2" />
								) : (
									<Moon className="h-4 w-4 mr-2" />
								)}
								{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
							</DropdownMenuItem>
							{deviceType !== 'mobile' && (
								<DropdownMenuItem onClick={resetTour}>
									<HelpCircle className="h-4 w-4 mr-2" />
									Show Tour
								</DropdownMenuItem>
							)}

							<DropdownMenuSeparator />

							{/* Settings & Support */}
							<Link
								to="/projects/$projectId/dialogue/$dialogueId/settings"
								params={{ projectId, dialogueId }}
							>
								<DropdownMenuItem>
									<Settings className="h-4 w-4 mr-2" />
									Settings
								</DropdownMenuItem>
							</Link>
							<DropdownMenuItem
								onClick={() =>
									window.open(
										'https://github.com/sponsors/Mountea-Framework',
										'_blank'
									)
								}
							>
								<Heart className="h-4 w-4 mr-2" />
								Support Mountea
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</header>

			{/* Main Content */}
			<div className="flex-1 flex overflow-hidden">
				{/* ReactFlow Canvas */}
				<div
					className="flex-1 relative"
					onDrop={deviceType !== 'mobile' ? onDrop : undefined}
					onDragOver={deviceType !== 'mobile' ? onDragOver : undefined}
					data-tour="canvas"
				>
					<ReactFlow
						nodes={nodes}
						edges={edges.map((edge) => ({
							...edge,
							animated: selectedEdge?.id === edge.id,
							style: {
								...edge.style,
								stroke: selectedEdge?.id === edge.id ? '#3b82f6' : undefined,
								strokeWidth: selectedEdge?.id === edge.id ? 3 : 2,
							},
						}))}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onNodeClick={onNodeClick}
						onEdgeClick={onEdgeClick}
						onPaneClick={onPaneClick}
						onMove={onMove}
						onInit={setReactFlowInstance}
				nodeTypes={nodeTypes}
				className="bg-grid"
				proOptions={{ hideAttribution: true }}
				// Mobile: Disable node dragging but allow manual panning via drag
				nodesDraggable={deviceType !== 'mobile'}
				panOnDrag={true}
				panOnScroll={false}
				zoomOnScroll={false}
				zoomOnPinch={false}
				zoomOnDoubleClick={false}
				nodesConnectable={deviceType !== 'mobile'}
				elementsSelectable={true}
				minZoom={0.5}
				maxZoom={2}
			>
				<Background />
				<Panel position="bottom-left">
					<ZoomSlider className="!bg-card !border !border-border !rounded-lg !shadow-lg" />
				</Panel>
				{deviceType !== 'mobile' && (
					<MiniMap
						nodeColor={(node) => {
							switch (node.type) {
								case 'startNode':
									return '#22c55e';
								case 'leadNode':
									return '#3b82f6';
								case 'answerNode':
									return '#8b5cf6';
								case 'returnNode':
									return '#f97316';
								case 'completeNode':
									return '#10b981';
								default:
									return '#6b7280';
							}
						}}
						className="!bg-card !border !border-border !rounded-lg !shadow-lg"
						maskColor="rgb(0, 0, 0, 0.1)"
						data-tour="minimap"
					/>
				)}
			</ReactFlow>
			</div>

			{/* Mobile Node Action Bar */}
			{deviceType === 'mobile' && selectedNode && (
				<div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-card border rounded-full shadow-lg px-4 py-2">
					<span className="text-sm font-medium truncate max-w-32">
						{selectedNode.data.displayName || selectedNode.type?.replace('Node', '')}
					</span>
					<div className="h-4 w-px bg-border" />
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => setIsMobilePanelOpen(true)}
					>
						<PanelRightOpen className="h-4 w-4" />
					</Button>
					{selectedNode.id !== '00000000-0000-0000-0000-000000000001' && (
						<Button
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
							onClick={deleteSelectedNode}
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => setSelectedNode(null)}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>
			)}

			{/* Mobile Panel Overlay */}
			{deviceType === 'mobile' && isMobilePanelOpen && (
				<div
					className="fixed inset-0 bg-black/50 z-30"
					onClick={() => setIsMobilePanelOpen(false)}
				/>
			)}

			{/* Right Sidebar - Node Properties */}
			{selectedNode && (deviceType !== 'mobile' || isMobilePanelOpen) && (
					<div className={`${deviceType === 'mobile' ? 'fixed inset-y-0 right-0 z-40 w-80' : 'w-96'} border-l bg-card overflow-y-auto`}>
						<div className="p-6 space-y-6">
							{/* Header */}
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-bold">{(selectedNode.type?.replace('Node', '')?.replace(/^./, c => c.toUpperCase()) || 'default') + ' ' + t('editor.nodeDetails')}</h3>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => {
										if (deviceType === 'mobile') {
											setIsMobilePanelOpen(false);
										} else {
											setSelectedNode(null);
										}
									}}
									className="h-8 w-8"
								>
									<X className="h-4 w-4" />
								</Button>
							</div>

							{/* Node Data Section */}
							<CollapsibleSection title={t('editor.sections.nodeData')} defaultOpen={true}>
								{/* Display Name */}
								<div className="grid gap-2">
									<Label htmlFor="displayName">{t('editor.sections.displayName')}</Label>
									<Input
										id="displayName"
										value={selectedNode.data.displayName || ''}
										onChange={(e) =>
											updateNodeData(selectedNode.id, {
												displayName: e.target.value,
											})
										}
										placeholder={t('editor.sections.displayNamePlaceholder')}
									/>
								</div>

								{/* Participant Selection (for Lead, Answer, Complete nodes) */}
								{(selectedNode.type === 'leadNode' ||
									selectedNode.type === 'answerNode' ||
									selectedNode.type === 'completeNode') && (
									<div className="space-y-2">
										<Label htmlFor="participant">{t('editor.sections.participant')}</Label>
										<Select
											value={selectedNode.data.participant || ''}
											onValueChange={(value) =>
												updateNodeData(selectedNode.id, { participant: value })
											}
										>
											<SelectTrigger>
												<SelectValue placeholder={t('editor.sections.participantPlaceholder')} />
											</SelectTrigger>
											<SelectContent>
												{participants.map((participant) => (
													<SelectItem key={participant.id} value={participant.name}>
														{participant.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>
								)}

								{/* Node ID */}
								<div>
									<Label className="text-xs text-muted-foreground">{t('editor.sections.nodeId')}</Label>
									<code className="text-xs font-mono bg-muted px-2 py-1 rounded block mt-1">
										{selectedNode.id}
									</code>
								</div>
							</CollapsibleSection>

							{/* Dialogue Details Section (for Lead, Answer, Complete nodes) */}
							{(selectedNode.type === 'leadNode' ||
								selectedNode.type === 'answerNode' ||
								selectedNode.type === 'completeNode') && (
								<CollapsibleSection title={t('editor.sections.dialogueDetails')} defaultOpen={true}>
									{/* Selection Title */}
									<div className="grid gap-2">
										<Label htmlFor="selectionTitle">{t('editor.sections.selectionTitle')}</Label>
										<Input
											id="selectionTitle"
											value={selectedNode.data.selectionTitle || ''}
											onChange={(e) =>
												updateNodeData(selectedNode.id, {
													selectionTitle: e.target.value,
												})
											}
											placeholder={t('editor.sections.selectionTitlePlaceholder')}
										/>
									</div>

									{/* Dialogue Rows */}
									<div className="space-y-2">
										<DialogueRowsPanel
											dialogueRows={selectedNode.data.dialogueRows || []}
											onChange={(newRows) =>
												updateNodeData(selectedNode.id, { dialogueRows: newRows })
											}
											participants={participants}
										/>
									</div>
								</CollapsibleSection>
							)}

							{/* Return Target Section (for Return nodes) */}
							{selectedNode.type === 'returnNode' && (
								<CollapsibleSection title={t('editor.sections.dialogueDetails')} defaultOpen={true}>
									<div className="space-y-2">
										<Label htmlFor="targetNode">{t('editor.sections.targetNode')}</Label>
										<Select
											value={selectedNode.data.targetNode || ''}
											onValueChange={(value) =>
												updateNodeData(selectedNode.id, { targetNode: value })
											}
										>
											<SelectTrigger>
												<SelectValue placeholder={t('editor.sections.targetNodePlaceholder')} />
											</SelectTrigger>
											<SelectContent>
												{nodes
													.filter((n) => n.id !== selectedNode.id)
													.map((node) => (
														<SelectItem key={node.id} value={node.id}>
															{node.data.displayName || node.data.label || node.id}
														</SelectItem>
													))}
											</SelectContent>
										</Select>
									</div>
								</CollapsibleSection>
							)}

							{/* Node Decorators Section (for Lead, Answer, Complete nodes) */}
							{(selectedNode.type === 'leadNode' ||
								selectedNode.type === 'answerNode' ||
								selectedNode.type === 'completeNode') && (
								<CollapsibleSection title={t('editor.sections.nodeDecorators')} defaultOpen={false}>
									<DecoratorsPanel
										decorators={selectedNode.data.decorators || []}
										availableDecorators={decorators}
										onAddDecorator={(decoratorDef) =>
											addDecoratorToNode(selectedNode.id, decoratorDef)
										}
										onRemoveDecorator={(index) =>
											removeDecoratorFromNode(selectedNode.id, index)
										}
										onUpdateDecorator={(index, newValues) => {
											const updatedDecorators = [...selectedNode.data.decorators];
											updatedDecorators[index] = {
												...updatedDecorators[index],
												values: newValues,
											};
											updateNodeData(selectedNode.id, {
												decorators: updatedDecorators,
											});
										}}
									/>
								</CollapsibleSection>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Bottom Toolbar */}
			<div className="border-t bg-card px-6 py-3 flex items-center justify-between" data-tour="node-toolbar">
				<div className="flex items-center gap-2">
					{/* Only show Auto Layout on desktop/tablet */}
					{deviceType !== 'mobile' && (
						<>
							<SimpleTooltip content="Auto-layout nodes using dagre algorithm" side="top">
								<Button
									variant="outline"
									size="sm"
									className="gap-2"
									onClick={onLayout}
								>
									<Network className="h-4 w-4" />
									Auto Layout
								</Button>
							</SimpleTooltip>
							<div className="h-6 w-px bg-border mx-1"></div>
							<SimpleTooltip content="Add NPC node - drag to canvas or click" side="top">
								<Button
									variant="outline"
									size="sm"
									className="gap-2 cursor-move"
									draggable
									onDragStart={(e) => onDragStart(e, 'leadNode')}
									onClick={() => addNode('leadNode')}
								>
									<MessageCircle className="h-4 w-4" />
									NPC
								</Button>
							</SimpleTooltip>
							<SimpleTooltip content="Add Player node - drag to canvas or click" side="top">
								<Button
									variant="outline"
									size="sm"
									className="gap-2 cursor-move"
									draggable
									onDragStart={(e) => onDragStart(e, 'answerNode')}
									onClick={() => addNode('answerNode')}
								>
									<User className="h-4 w-4" />
									Player
								</Button>
							</SimpleTooltip>
							<SimpleTooltip content="Add Return node - drag to canvas or click" side="top">
								<Button
									variant="outline"
									size="sm"
									className="gap-2 cursor-move"
									draggable
									onDragStart={(e) => onDragStart(e, 'returnNode')}
									onClick={() => addNode('returnNode')}
								>
									<CornerUpLeft className="h-4 w-4" />
									Return
								</Button>
							</SimpleTooltip>
							<SimpleTooltip content="Add Complete node - drag to canvas or click" side="top">
								<Button
									variant="outline"
									size="sm"
									className="gap-2 cursor-move"
									draggable
									onDragStart={(e) => onDragStart(e, 'completeNode')}
									onClick={() => addNode('completeNode')}
								>
									<CheckCircle2 className="h-4 w-4" />
									Complete
								</Button>
							</SimpleTooltip>
						</>
					)}
					{/* Mobile: Show instructions */}
					{deviceType === 'mobile' && (
						<span className="text-sm text-muted-foreground">
							Tap the placeholder node to add new nodes
						</span>
					)}
				</div>
				<div className="flex items-center gap-4 text-sm text-muted-foreground">
					<span>
						{nodes.length} {t('dialogues.nodes')} • {edges.length}{' '}
						{t('dialogues.edges')}
					</span>
					<span className="text-xs hidden md:block">
						Powered by{' '}
						<a
							href="https://reactflow.dev"
							target="_blank"
							rel="noopener noreferrer"
							className="hover:text-primary transition-colors"
						>
							React Flow
						</a>
					</span>
				</div>
			</div>

			{/* Node Type Selection Modal (Mobile) */}
			<NodeTypeSelectionModal
				open={isNodeTypeModalOpen}
				onOpenChange={setIsNodeTypeModalOpen}
				onSelectType={handleNodeTypeSelect}
			/>
		</div>
	);
}
