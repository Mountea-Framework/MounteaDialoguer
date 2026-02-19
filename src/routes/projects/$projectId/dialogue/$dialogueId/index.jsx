import { createFileRoute, useBlocker } from '@tanstack/react-router';
import { useEffect, useState, useCallback, useRef, useLayoutEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
	ExternalLink,
	Heart,
	X,
	HelpCircle,
	Network,
	Menu,
	Trash2,
	PanelRightOpen,
	Clock,
	PlayCircle,
	Crosshair,
	LocateFixed,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/contexts/ThemeProvider';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useProjectStore } from '@/stores/projectStore';
import { useParticipantStore } from '@/stores/participantStore';
import { useDecoratorStore } from '@/stores/decoratorStore';
import { useConditionStore } from '@/stores/conditionStore';
import { useCategoryStore } from '@/stores/categoryStore';
import { v4 as uuidv4 } from 'uuid';
import { NativeSelect } from '@/components/ui/native-select';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useCommandPaletteStore } from '@/stores/commandPaletteStore';
import { useToast, toast as toastStandalone, clearToasts } from '@/components/ui/toaster';
import { useSettingsCommandStore } from '@/stores/settingsCommandStore';

// Custom Node Components
import StartNode from '@/components/dialogue/nodes/StartNode';
import LeadNode from '@/components/dialogue/nodes/LeadNode';
import AnswerNode from '@/components/dialogue/nodes/AnswerNode';
import ReturnNode from '@/components/dialogue/nodes/ReturnNode';
import OpenChildGraphNode from '@/components/dialogue/nodes/OpenChildGraphNode';
import CompleteNode from '@/components/dialogue/nodes/CompleteNode';
import PlaceholderNode from '@/components/dialogue/nodes/PlaceholderNode';
import DelayNode from '@/components/dialogue/nodes/DelayNode';
import ConditionEdge from '@/components/dialogue/edges/ConditionEdge';
import { EdgeConditionsPanel } from '@/components/dialogue/EdgeConditionsPanel';
import { DialogueRowsPanel } from '@/components/dialogue/DialogueRowsPanel';
import { DecoratorsPanel } from '@/components/dialogue/DecoratorsPanel';
import { CollapsibleSection } from '@/components/dialogue/CollapsibleSection';
import { SaveIndicator } from '@/components/ui/save-indicator';
import { OnboardingTour, useOnboarding } from '@/components/ui/onboarding-tour';
import { celebrateSuccess } from '@/lib/confetti';
import { SimpleTooltip } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/ui/app-header';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { NodeTypeSelectionModal } from '@/components/dialogue/NodeTypeSelectionModal';
import { DialoguePreviewOverlay } from '@/components/dialogue/DialoguePreviewOverlay';
import { getDeviceType } from '@/lib/deviceDetection';
import { validatePreviewGraph } from '@/lib/dialoguePreviewEngine';
import {
	getNodeDefinition,
	getNodeDefaultData,
} from '@/config/dialogueNodes';

export const Route = createFileRoute(
	'/projects/$projectId/dialogue/$dialogueId/'
)({
	component: DialogueEditorPage,
});

const startNodeDefinition = getNodeDefinition('startNode');
const startNodeDefaults = getNodeDefaultData('startNode');

// Initial nodes and edges for new dialogues
const getInitialNodes = (t) => [
	{
		id: '00000000-0000-0000-0000-000000000001',
		type: 'startNode',
		data: {
			...startNodeDefaults,
			label:
				startNodeDefaults.label ||
				startNodeDefinition?.description ||
				t('editor.nodes.startDescription'),
			displayName:
				startNodeDefaults.displayName ||
				startNodeDefinition?.label ||
				t('editor.nodes.start'),
		},
		position: { x: 0, y: 0 },
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
	openChildGraphNode: OpenChildGraphNode,
	completeNode: CompleteNode,
	delayNode: DelayNode,
	placeholderNode: PlaceholderNode,
};
const edgeTypes = {
	conditionEdge: ConditionEdge,
};

const DEFAULT_NODE_SIZE_BY_TYPE = {
	startNode: { width: 200, height: 88 },
	leadNode: { width: 250, height: 124 },
	answerNode: { width: 250, height: 124 },
	returnNode: { width: 250, height: 110 },
	openChildGraphNode: { width: 250, height: 110 },
	completeNode: { width: 250, height: 124 },
	delayNode: { width: 250, height: 100 },
	placeholderNode: { width: 160, height: 72 },
};
const START_NODE_ID = '00000000-0000-0000-0000-000000000001';
const START_NODE_ANCHOR_POSITION = { x: 0, y: 0 };
const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 };

const parseSize = (value) => {
	if (typeof value === 'number') return value;
	if (typeof value === 'string') {
		const parsed = parseFloat(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	return undefined;
};

const getNodeSize = (node) => {
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

const hasMeaningfulSavedViewport = (viewport) => {
	if (!viewport || typeof viewport !== 'object') return false;

	const x = Number(viewport.x);
	const y = Number(viewport.y);
	const zoom = Number(viewport.zoom);
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(zoom)) return false;

	return (
		Math.abs(x - DEFAULT_VIEWPORT.x) > 0.01 ||
		Math.abs(y - DEFAULT_VIEWPORT.y) > 0.01 ||
		Math.abs(zoom - DEFAULT_VIEWPORT.zoom) > 0.01
	);
};

// Auto-layout function using dagre
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
	const dagreGraph = new dagre.graphlib.Graph();
	dagreGraph.setDefaultEdgeLabel(() => ({}));

	const isHorizontal = direction === 'LR';
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

function DialogueEditorPage() {
	const { t } = useTranslation();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const { projectId, dialogueId } = Route.useParams();
	const { projects, loadProjects } = useProjectStore();
	const { dialogues, loadDialogues, saveDialogueGraph, loadDialogueGraph, exportDialogue } =
		useDialogueStore();
	const { participants, loadParticipants } = useParticipantStore();
	const { decorators, loadDecorators } = useDecoratorStore();
	const { conditions, loadConditions } = useConditionStore();
	const { categories, loadCategories } = useCategoryStore();

	const [nodes, setNodes, onNodesChangeBase] = useNodesState(getInitialNodes(t));
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
	const markUnsaved = useCallback(() => {
		setHasUnsavedChanges(true);
		setSaveStatus((prev) => (prev === 'saving' ? prev : 'unsaved'));
	}, []);

	// Onboarding tour
	const { runTour, finishTour, resetTour } = useOnboarding('dialogue-editor');
	const { dismiss } = useToast();
	const openSettingsCommand = useSettingsCommandStore((state) => state.openWithContext);
	const openCommandPalette = useCommandPaletteStore((state) => state.openWithActions);

	// Device detection
	const [deviceType, setDeviceType] = useState('desktop');
	const [isNodeTypeModalOpen, setIsNodeTypeModalOpen] = useState(false);
	const [pendingPlaceholderData, setPendingPlaceholderData] = useState(null);
	const [isMobilePanelOpen, setIsMobilePanelOpen] = useState(false);
	const [isCascadeDeleteOpen, setIsCascadeDeleteOpen] = useState(false);
	const [isPreviewOpen, setIsPreviewOpen] = useState(false);
	const [previewActiveNodeId, setPreviewActiveNodeId] = useState(null);
	const headerRef = useRef(null);
	const bodyOverflowRef = useRef(null);
	const mobileLoaderStartedAtRef = useRef(null);

	// Detect device type on mount and window resize
	useEffect(() => {
		const updateDeviceType = () => {
			setDeviceType(getDeviceType());
		};
		updateDeviceType();
		window.addEventListener('resize', updateDeviceType);
		return () => window.removeEventListener('resize', updateDeviceType);
	}, []);

	useLayoutEffect(() => {
		if (!headerRef.current) return undefined;

		const updateHeaderHeight = () => {
			const height = headerRef.current.getBoundingClientRect().height;
			document.documentElement.style.setProperty('--app-header-height', `${height}px`);
		};

		updateHeaderHeight();
		const observer = new ResizeObserver(updateHeaderHeight);
		observer.observe(headerRef.current);
		window.addEventListener('resize', updateHeaderHeight);

		return () => {
			observer.disconnect();
			window.removeEventListener('resize', updateHeaderHeight);
		};
	}, []);

	useEffect(() => {
		if (deviceType !== 'mobile') {
			if (bodyOverflowRef.current !== null) {
				document.body.style.overflow = bodyOverflowRef.current;
				bodyOverflowRef.current = null;
			}
			return undefined;
		}

		// On mobile, lock page scroll for the graph editor. Only the right panel should scroll.
		if (bodyOverflowRef.current === null) {
			bodyOverflowRef.current = document.body.style.overflow;
		}
		document.body.style.overflow = 'hidden';

		return () => {
			if (bodyOverflowRef.current !== null) {
				document.body.style.overflow = bodyOverflowRef.current;
				bodyOverflowRef.current = null;
			}
		};
	}, [deviceType, isMobilePanelOpen]);

	// History for undo/redo
	const [history, setHistory] = useState([
		{ nodes: getInitialNodes(t), edges: initialEdges },
	]);
	const [historyIndex, setHistoryIndex] = useState(0);

	// Load data
	useEffect(() => {
		loadProjects();
		loadDialogues(projectId);
		loadParticipants(projectId);
		loadDecorators(projectId);
		loadConditions(projectId);
		loadCategories(projectId);
	}, [
		loadProjects,
		loadDialogues,
		loadParticipants,
		loadDecorators,
		loadConditions,
		loadCategories,
		projectId,
	]);

	// Track if viewport was loaded from save
	const [hasLoadedViewport, setHasLoadedViewport] = useState(false);
	const [hasGraphInitialized, setHasGraphInitialized] = useState(false);
	const [lastLayoutRegularNodeCount, setLastLayoutRegularNodeCount] = useState(0);
	const [lastLayoutPlaceholderCount, setLastLayoutPlaceholderCount] = useState(0);
	const [hasInitialLayout, setHasInitialLayout] = useState(false);
	const [hasInitialFocus, setHasInitialFocus] = useState(false);
	const [mobileLoadProgress, setMobileLoadProgress] = useState(0);
	const [showMobileGraphLoader, setShowMobileGraphLoader] = useState(false);
	const [showDesktopGraphLoader, setShowDesktopGraphLoader] = useState(false);

	// Load dialogue graph when dialogue changes
	useEffect(() => {
		const loadGraph = async () => {
			if (dialogueId) {
				setHasGraphInitialized(false);
				setHasLoadedViewport(false);
				setHasInitialLayout(false);
				setHasInitialFocus(false);
				setLastLayoutRegularNodeCount(0);
				setLastLayoutPlaceholderCount(0);
				setMobileLoadProgress(0);
				setShowMobileGraphLoader(getDeviceType() === 'mobile');
				setShowDesktopGraphLoader(getDeviceType() !== 'mobile');

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
					const shouldRestoreViewport = getDeviceType() !== 'mobile';
					const hasSavedViewport = hasMeaningfulSavedViewport(loadedViewport);
					if (hasSavedViewport && reactFlowInstance && shouldRestoreViewport) {
						reactFlowInstance.setViewport(loadedViewport, { duration: 0 });
						setHasLoadedViewport(true);
					}
				} catch (error) {
					console.error('Failed to load dialogue graph:', error);
				} finally {
					setHasGraphInitialized(true);
				}
			}
		};
		loadGraph();
	}, [dialogueId, loadDialogueGraph, setNodes, setEdges, reactFlowInstance]);

	const isMobileGraphLoading =
		deviceType === 'mobile' &&
		(!hasGraphInitialized || (!hasLoadedViewport && (!hasInitialLayout || !hasInitialFocus)));

	useEffect(() => {
		if (deviceType !== 'mobile') {
			setShowMobileGraphLoader(false);
			setMobileLoadProgress(100);
			mobileLoaderStartedAtRef.current = null;
			return;
		}

		if (isMobileGraphLoading) {
			setShowMobileGraphLoader(true);
			if (mobileLoaderStartedAtRef.current === null) {
				mobileLoaderStartedAtRef.current = Date.now();
			}
		}
	}, [deviceType, isMobileGraphLoading]);

	useEffect(() => {
		if (deviceType !== 'mobile') return;

		let target = 15;
		if (hasGraphInitialized) target = 55;
		if (hasGraphInitialized && hasInitialLayout) target = 85;
		if (hasLoadedViewport || hasInitialFocus) target = 100;

		setMobileLoadProgress((prev) => (target > prev ? target : prev));
	}, [deviceType, hasGraphInitialized, hasInitialLayout, hasLoadedViewport, hasInitialFocus]);

	useEffect(() => {
		if (deviceType !== 'mobile') return;

		if (!isMobileGraphLoading) {
			setMobileLoadProgress(100);
			const startedAt = mobileLoaderStartedAtRef.current ?? Date.now();
			const elapsed = Date.now() - startedAt;
			const remaining = Math.max(2000 - elapsed, 0);
			const timeout = setTimeout(() => {
				setShowMobileGraphLoader(false);
				mobileLoaderStartedAtRef.current = null;
			}, remaining);
			return () => clearTimeout(timeout);
		}

		const interval = setInterval(() => {
			setMobileLoadProgress((prev) => Math.min(prev + 1, 96));
		}, 70);
		return () => clearInterval(interval);
	}, [deviceType, isMobileGraphLoading]);

	useEffect(() => {
		if (deviceType === 'mobile') {
			setShowDesktopGraphLoader(false);
			return;
		}

		if (!hasGraphInitialized) {
			setShowDesktopGraphLoader(true);
			return;
		}

		const ready = hasLoadedViewport || hasInitialFocus;
		if (ready) {
			const timeout = setTimeout(() => setShowDesktopGraphLoader(false), 220);
			return () => clearTimeout(timeout);
		}

		setShowDesktopGraphLoader(true);
	}, [deviceType, hasGraphInitialized, hasLoadedViewport, hasInitialFocus]);

	// Sync selected node with nodes state to reflect updates
	useEffect(() => {
		if (selectedNode) {
			const updatedNode = nodes.find((n) => n.id === selectedNode.id);
			if (updatedNode) {
				setSelectedNode(updatedNode);
			}
		}
	}, [nodes]);

	// Sync selected edge with edges state to reflect updates
	useEffect(() => {
		if (selectedEdge) {
			const updatedEdge = edges.find((e) => e.id === selectedEdge.id);
			if (updatedEdge) {
				setSelectedEdge(updatedEdge);
			}
		}
	}, [edges, selectedEdge]);

	// Keep visual save status in sync with navigation guard state.
	useEffect(() => {
		if (hasUnsavedChanges && saveStatus === 'saved') {
			setSaveStatus('unsaved');
		}
	}, [hasUnsavedChanges, saveStatus]);

	// Auto-focus on start node when graph loads (both mobile and desktop)
	// Only if no saved viewport was loaded
	const focusStartNode = useCallback(() => {
		if (!reactFlowInstance) return;

		const startNode = nodes.find((n) => n.id === '00000000-0000-0000-0000-000000000001');
		if (!startNode) return;

		const { width, height } = getNodeSize(startNode);
		reactFlowInstance.setCenter(
			startNode.position.x + width / 2,
			startNode.position.y + height / 2,
			{ zoom: 1, duration: 300 }
		);
		setHasInitialFocus(true);
	}, [reactFlowInstance, nodes]);

	const queueMobileStartFocus = useCallback((layoutedNodes) => {
		if (!reactFlowInstance) return;

		const startNode = layoutedNodes.find(
			(n) => n.id === '00000000-0000-0000-0000-000000000001'
		);
		if (!startNode) return;

		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				try {
					reactFlowInstance.fitView({
						nodes: [{ id: startNode.id }],
						padding: 0.45,
						duration: 320,
						minZoom: 0.7,
						maxZoom: 1.15,
					});
				} catch (error) {
					const { width, height } = getNodeSize(startNode);
					reactFlowInstance.setCenter(
						startNode.position.x + width / 2,
						startNode.position.y + height / 2,
						{ zoom: 1, duration: 320 }
					);
				}
				setHasInitialFocus(true);
			});
		});
	}, [reactFlowInstance]);

	useEffect(() => {
		if (deviceType === 'mobile') return;
		if (!hasGraphInitialized) return;

		if (reactFlowInstance && nodes.length > 0 && !hasInitialFocus && !hasLoadedViewport) {
			const timer = setTimeout(() => {
				focusStartNode();
			}, 120);
			return () => clearTimeout(timer);
		}
	}, [
		hasGraphInitialized,
		deviceType,
		reactFlowInstance,
		nodes.length,
		hasInitialFocus,
		hasLoadedViewport,
		focusStartNode,
	]);


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
			markUnsaved();
		}
		prevSelectedNodeRef.current = selectedNode;
	}, [selectedNode, nodes, edges, saveToHistory, markUnsaved]);

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

	const blocker = useBlocker({
		shouldBlockFn: () => hasUnsavedChanges,
		enableBeforeUnload: true,
		withResolver: true,
	});

	useEffect(() => {
		if (blocker.status !== 'blocked') return;
		const confirmed = window.confirm(
			`${t('editor.validation.unsavedLeaveTitle')}\n${t(
				'editor.validation.unsavedLeaveDescription'
			)}`
		);
		if (confirmed) {
			blocker.proceed();
		} else {
			blocker.reset();
		}
	}, [blocker, t]);

	// Clear toasts only after a successful leave (unmount)
	useEffect(() => {
		return () => {
			clearToasts();
		};
	}, []);

	const project = projects.find((p) => p.id === projectId);
	const dialogue = dialogues.find((d) => d.id === dialogueId);
	const availableConditionDefinitions = conditions.filter((condition) => condition.projectId === projectId);
	const selectedNodeDefinition = selectedNode
		? getNodeDefinition(selectedNode.type)
		: null;
	const projectCategories = categories.filter((c) => c.projectId === projectId);

	const renderNodeField = (field) => {
		if (!selectedNode) return null;

		const label = field.labelKey ? t(field.labelKey) : field.label || '';
		const requiredLabel = field.required ? `${label} *` : label;

		switch (field.type) {
			case 'text':
				return (
					<div className="grid gap-2" key={field.id}>
						<Label htmlFor={field.id}>{requiredLabel}</Label>
						<Input
							id={field.id}
							value={selectedNode.data[field.id] || ''}
							onChange={(e) =>
				updateNodeData(selectedNode.id, {
					[field.id]: e.target.value,
				})
			}
							placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
							maxLength={field.maxLength}
						/>
					</div>
				);
			case 'select':
				if (field.options === 'participants') {
					const groups = new Map();
					const getCategoryPath = (categoryName) => {
						const category = projectCategories.find((c) => c.name === categoryName);
						if (!category) return categoryName;
						const path = [];
						let current = category;
						while (current) {
							path.unshift(current.name);
							current = projectCategories.find(
								(c) => c.id === current.parentCategoryId
							);
						}
						return path.join(' > ');
					};
					participants.forEach((participant) => {
						const categoryName = participant.category || t('categories.title');
						const categoryPath = getCategoryPath(categoryName);
						const root = categoryPath.split(' > ')[0] || categoryName;
						if (!groups.has(root)) {
							groups.set(root, []);
						}
						groups.get(root).push({
							id: participant.id,
							name: participant.name,
							label: `${categoryPath} · ${participant.name}`,
						});
					});
					const groupedParticipants = Array.from(groups.entries())
						.map(([label, options]) => ({
							label,
							options: options.sort((a, b) => a.label.localeCompare(b.label)),
						}))
						.sort((a, b) => a.label.localeCompare(b.label));

					return (
						<div className="space-y-2" key={field.id}>
							<Label htmlFor={field.id}>{requiredLabel}</Label>
							<NativeSelect
								id={field.id}
								value={selectedNode.data[field.id] || ''}
								onChange={(e) =>
									updateNodeData(selectedNode.id, { [field.id]: e.target.value })
								}
							>
								<option value="" disabled>
									{field.placeholderKey ? t(field.placeholderKey) : undefined}
								</option>
								{groupedParticipants.map((group) => (
									<optgroup key={group.label} label={group.label}>
										{group.options.map((option) => (
											<option key={option.id} value={option.name}>
												{option.label}
											</option>
										))}
									</optgroup>
								))}
							</NativeSelect>
						</div>
					);
				}
				if (field.options === 'nodes') {
					const groups = new Map();
					nodes
						.filter((n) => n.id !== selectedNode.id)
						.forEach((node) => {
							const nodeLabel =
								getNodeDefinition(node.type)?.label || node.type || 'Node';
							if (!groups.has(nodeLabel)) {
								groups.set(nodeLabel, []);
							}
							groups.get(nodeLabel).push({
								id: node.id,
								label: node.data.displayName || node.data.label || node.id,
							});
						});
					const groupedNodes = Array.from(groups.entries())
						.map(([label, options]) => ({
							label,
							options: options.sort((a, b) => a.label.localeCompare(b.label)),
						}))
						.sort((a, b) => a.label.localeCompare(b.label));

					return (
						<div className="space-y-2" key={field.id}>
							<Label htmlFor={field.id}>{requiredLabel}</Label>
							<NativeSelect
								id={field.id}
								value={selectedNode.data[field.id] || ''}
								onChange={(e) =>
									updateNodeData(selectedNode.id, { [field.id]: e.target.value })
								}
							>
								<option value="" disabled>
									{field.placeholderKey ? t(field.placeholderKey) : undefined}
								</option>
								{groupedNodes.map((group) => (
									<optgroup key={group.label} label={group.label}>
										{group.options.map((option) => (
											<option key={option.id} value={option.id}>
												{option.label}
											</option>
										))}
									</optgroup>
								))}
							</NativeSelect>
						</div>
					);
				}
				if (field.options === 'dialogues') {
					const availableDialogues = dialogues
						.filter((item) => item.projectId === projectId && item.id !== dialogueId)
						.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

					return (
						<div className="space-y-2" key={field.id}>
							<Label htmlFor={field.id}>{requiredLabel}</Label>
							<NativeSelect
								id={field.id}
								value={selectedNode.data[field.id] || ''}
								onChange={(e) =>
									updateNodeData(selectedNode.id, { [field.id]: e.target.value })
								}
							>
								<option value="" disabled>
									{field.placeholderKey ? t(field.placeholderKey) : undefined}
								</option>
								{availableDialogues.map((item) => (
									<option key={item.id} value={item.id}>
										{item.name || item.id}
									</option>
								))}
							</NativeSelect>
						</div>
					);
				}
				return null;
			case 'dialogueRows':
				return (
					<div className="space-y-2" key={field.id}>
						<DialogueRowsPanel
							dialogueRows={selectedNode.data.dialogueRows || []}
							onChange={(newRows) =>
								updateNodeData(selectedNode.id, { dialogueRows: newRows })
							}
							participants={participants}
						/>
					</div>
				);
			case 'decorators':
				return (
					<DecoratorsPanel
						key={field.id}
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
				);
			case 'slider':
				return (
					<div className="space-y-2" key={field.id}>
						<div className="flex items-center justify-between">
							<Label htmlFor={field.id}>{requiredLabel}</Label>
							<span className="text-xs text-muted-foreground">
								{selectedNode.data[field.id] ?? field.min}
								{field.unit ? ` ${field.unit}` : ''}
							</span>
						</div>
						<Input
							id={field.id}
							type="range"
							min={field.min}
							max={field.max}
							step={field.step}
							value={selectedNode.data[field.id] ?? field.min}
							onChange={(e) =>
								updateNodeData(selectedNode.id, {
									[field.id]: parseFloat(e.target.value),
								})
							}
						/>
					</div>
				);
			case 'nodeId':
				return (
					<div key={field.id}>
						<Label className="text-xs text-muted-foreground">
							{requiredLabel}
						</Label>
						<code className="text-xs font-mono bg-muted px-2 py-1 rounded block mt-1">
							{selectedNode.id}
						</code>
					</div>
				);
			default:
				return null;
		}
	};

	const openEdgeDetails = useCallback(
		(edgeId) => {
			const edge = edges.find((candidate) => candidate.id === edgeId);
			if (!edge) return;
			setSelectedNode(null);
			setSelectedEdge(edge);
			if (deviceType === 'mobile') {
				setIsMobilePanelOpen(true);
			}
		},
		[edges, deviceType]
	);

	const updateEdgeData = useCallback(
		(edgeId, newData) => {
			setEdges((eds) => {
				const updatedEdges = eds.map((edge) =>
					edge.id === edgeId
						? {
								...edge,
								data: {
									...(edge.data || {}),
									...newData,
								},
						  }
						: edge
				);
				saveToHistory(nodes, updatedEdges);
				markUnsaved();
				return updatedEdges;
			});
		},
		[setEdges, saveToHistory, nodes, markUnsaved]
	);

	const isConnectionAllowed = useCallback(
		(connection, existingEdges = edges) => {
			const sourceId = connection?.source;
			const targetId = connection?.target;
			if (!sourceId || !targetId) return false;

			// Limit Start node to exactly one non-placeholder outgoing child.
			if (sourceId !== START_NODE_ID) return true;

			const existingStartOutgoing = existingEdges.filter(
				(edge) => edge.source === START_NODE_ID && !edge?.data?.isPlaceholder
			);

			if (existingStartOutgoing.length === 0) return true;

			// Keep same-target reconnects permissive; duplicate prevention is handled by addEdge.
			return existingStartOutgoing.some((edge) => edge.target === targetId);
		},
		[edges]
	);


	// Handle edge connection
	const onConnect = useCallback(
		(params) => {
			if (!isConnectionAllowed(params)) return;

			const newEdge = {
				...params,
				type: 'conditionEdge',
				data: {
					conditions: {
						mode: 'all',
						rules: [],
					},
				},
				markerEnd: {
					type: MarkerType.ArrowClosed,
				},
			};
			setEdges((eds) => {
				if (!isConnectionAllowed(params, eds)) return eds;
				const updatedEdges = addEdge(newEdge, eds);
				saveToHistory(nodes, updatedEdges);
				markUnsaved();
				return updatedEdges;
			});
		},
		[setEdges, nodes, saveToHistory, markUnsaved, isConnectionAllowed]
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
		if (deviceType === 'mobile') {
			setIsMobilePanelOpen(true);
		}
	}, [deviceType]);

	// Handle pane click (deselect all)
	const onPaneClick = useCallback(() => {
		setSelectedNode(null);
		setSelectedEdge(null);
	}, []);

	// Delete selected node
	const deleteSelectedNode = useCallback(() => {
		if (selectedNode && selectedNode.id !== '00000000-0000-0000-0000-000000000001') {
			setNodes((nds) => {
				const placeholderIdsToRemove = nds
					.filter(
						(n) =>
							n.type === 'placeholderNode' &&
							n.data?.parentNodeId === selectedNode.id
					)
					.map((n) => n.id);

				const updatedNodes = nds.filter(
					(n) => n.id !== selectedNode.id && !placeholderIdsToRemove.includes(n.id)
				);

				// Also remove edges connected to this node or its placeholders
				setEdges((eds) => {
					const updatedEdges = eds.filter(
						(e) =>
							e.source !== selectedNode.id &&
							e.target !== selectedNode.id &&
							!placeholderIdsToRemove.includes(e.source) &&
							!placeholderIdsToRemove.includes(e.target)
					);
					saveToHistory(updatedNodes, updatedEdges);
					markUnsaved();
					return updatedEdges;
				});
				return updatedNodes;
			});
			setSelectedNode(null);
		}
	}, [selectedNode, setNodes, setEdges, saveToHistory, markUnsaved]);

	const deleteSelectedNodeCascade = useCallback(() => {
		if (!selectedNode || selectedNode.id === '00000000-0000-0000-0000-000000000001') {
			return;
		}

		const nodeIdsToRemove = new Set([selectedNode.id]);
		const queue = [selectedNode.id];

		while (queue.length > 0) {
			const currentId = queue.shift();
			edges.forEach((edge) => {
				if (edge.source === currentId && !nodeIdsToRemove.has(edge.target)) {
					nodeIdsToRemove.add(edge.target);
					queue.push(edge.target);
				}
			});
		}

		setNodes((nds) => {
			const placeholderIdsToRemove = nds
				.filter(
					(n) =>
						n.type === 'placeholderNode' &&
						nodeIdsToRemove.has(n.data?.parentNodeId)
				)
				.map((n) => n.id);

			placeholderIdsToRemove.forEach((id) => nodeIdsToRemove.add(id));

			const updatedNodes = nds.filter((n) => !nodeIdsToRemove.has(n.id));

			setEdges((eds) => {
				const updatedEdges = eds.filter(
					(e) =>
						!nodeIdsToRemove.has(e.source) && !nodeIdsToRemove.has(e.target)
				);
				saveToHistory(updatedNodes, updatedEdges);
				markUnsaved();
				return updatedEdges;
			});

			return updatedNodes;
		});

		setSelectedNode(null);
	}, [selectedNode, edges, setNodes, setEdges, saveToHistory, markUnsaved]);

	const getMissingRequiredNodes = useCallback(() => {
		const missingNodes = new Map();

		nodes.forEach((node) => {
			if (node.type === 'placeholderNode') return;
			const definition = getNodeDefinition(node.type);
			if (!definition?.sections) return;

			const missingFields = [];

			definition.sections.forEach((section) => {
				section.fields?.forEach((field) => {
					if (!field.required) return;
					const value = node.data?.[field.id];
					const isEmpty =
						value === null ||
						value === undefined ||
						(typeof value === 'string' && value.trim() === '');

					if (isEmpty) {
						missingFields.push(field.id);
					}
				});
			});

			if (missingFields.length > 0) {
				missingNodes.set(node.id, {
					node,
					missingFields,
				});
			}
		});

		return missingNodes;
	}, [nodes]);

	const logMissingRequiredNodes = useCallback(() => {
		const missingRequiredNodes = getMissingRequiredNodes();
		if (missingRequiredNodes.size === 0) {
			console.info('[validation] No missing required fields.');
			return;
		}

		console.warn('[validation] Missing required fields:');
		for (const [nodeId, payload] of missingRequiredNodes.entries()) {
			const node = payload.node;
			const nodeName =
				node.data?.displayName ||
				node.data?.label ||
				getNodeDefinition(node.type)?.label ||
				node.type;
			console.warn(`- ${nodeName} (${nodeId})`, payload.missingFields);
		}
	}, [getMissingRequiredNodes]);

	const showValidationToasts = useCallback((missingRequiredNodes) => {
		if (missingRequiredNodes.size === 0) return;
		for (const [nodeId, payload] of missingRequiredNodes.entries()) {
			const node = payload.node;
			const nodeName =
				node.data?.displayName ||
				node.data?.label ||
				getNodeDefinition(node.type)?.label ||
				node.type;

			const toastId = toastStandalone({
				variant: 'warning',
				title: t('editor.validation.nodeMissingTitle'),
				description: t('editor.validation.nodeMissingDescription', {
					name: nodeName,
				}),
				duration: 8000,
				action: {
					label: t('editor.validation.focusNode'),
					onClick: () => {
						setSelectedNode(node);
						setSelectedEdge(null);
						if (deviceType === 'mobile') {
							setIsMobilePanelOpen(true);
						}
					},
				},
			});
			console.log('[validation] toast', toastId, nodeId);
		}
	}, [t, deviceType]);

	const handlePreviewStop = useCallback(() => {
		setIsPreviewOpen(false);
		setPreviewActiveNodeId(null);
	}, []);

	const handlePreviewNodeFocus = useCallback((nodeId) => {
		if (!reactFlowInstance || !nodeId) return;

		try {
			reactFlowInstance.fitView({
				nodes: [{ id: nodeId }],
				padding: 0.45,
				duration: 280,
				minZoom: 0.7,
				maxZoom: 1.3,
			});
		} catch (error) {
			const node = nodes.find((candidate) => candidate.id === nodeId);
			if (!node) return;
			const { width, height } = getNodeSize(node);
			reactFlowInstance.setCenter(
				node.position.x + width / 2,
				node.position.y + height / 2,
				{ zoom: 1, duration: 280 }
			);
		}
	}, [reactFlowInstance, nodes]);

	const handleStartPreview = useCallback(() => {
		if (deviceType === 'mobile') return;

		const missingRequiredNodes = getMissingRequiredNodes();
		if (missingRequiredNodes.size > 0) {
			const firstMissingNode = missingRequiredNodes.values().next().value?.node;
			if (firstMissingNode) {
				setSelectedNode(firstMissingNode);
				setSelectedEdge(null);
				setIsMobilePanelOpen(false);
			}

			toastStandalone({
				variant: 'error',
				title: t('editor.preview.invalidGraphTitle'),
				description: t('editor.preview.invalidRequiredFieldsDescription', {
					count: missingRequiredNodes.size,
				}),
			});
			return;
		}

		const validationResult = validatePreviewGraph(nodes, edges, { maxNodes: 100 });
		if (!validationResult.valid) {
			const reasonKeyMap = {
				missing_start: 'editor.preview.invalidMissingStart',
				empty_graph: 'editor.preview.invalidEmptyGraph',
				too_many_nodes: 'editor.preview.invalidTooManyNodes',
				broken_edges: 'editor.preview.invalidBrokenEdges',
				no_playable_path: 'editor.preview.invalidNoPlayablePath',
			};
			const reasonKey = reasonKeyMap[validationResult.reason] || 'editor.preview.invalidGeneric';

			toastStandalone({
				variant: 'error',
				title: t('editor.preview.invalidGraphTitle'),
				description:
					validationResult.reason === 'too_many_nodes'
						? t(reasonKey, {
								count: validationResult.details?.count || 0,
								max: validationResult.details?.maxNodes || 100,
						  })
						: t(reasonKey),
			});
			return;
		}

		setSelectedNode(null);
		setSelectedEdge(null);
		setIsMobilePanelOpen(false);
		setPreviewActiveNodeId(null);
		setIsPreviewOpen(true);
	}, [deviceType, getMissingRequiredNodes, nodes, edges, t]);

	// Handle save
	const handleSave = useCallback(async () => {
		setIsSaving(true);
		setSaveSuccess(false);
		setSaveStatus('saving');
		try {
			clearToasts();
			// Filter out placeholder nodes and their edges before saving
			const regularNodes = nodes.filter((n) => n.type !== 'placeholderNode');
			const regularEdges = edges.filter((e) => !e.data?.isPlaceholder);

			const missingRequiredNodes = getMissingRequiredNodes();
			logMissingRequiredNodes();
			showValidationToasts(missingRequiredNodes);

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
	}, [
		edges,
		nodes,
		viewport,
		dialogueId,
		saveDialogueGraph,
		getMissingRequiredNodes,
		logMissingRequiredNodes,
		showValidationToasts,
		clearToasts,
		setIsSaving,
		setSaveSuccess,
		setSaveStatus,
		setHasUnsavedChanges,
		setLastSaved,
		deviceType,
	]);

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
				markUnsaved();
				return updatedNodes;
			});
		},
		[setNodes, edges, saveToHistory, markUnsaved]
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
				markUnsaved();
				return updatedNodes;
			});
		},
		[setNodes, edges, saveToHistory, markUnsaved]
	);

	// Add new node based on type
	const addNode = useCallback(
		(nodeType, position) => {
			const nodeDefinition = getNodeDefinition(nodeType);
			const nodeDefaults = getNodeDefaultData(nodeType);
			const baseLabel = nodeDefinition?.label || 'Node';
			const label = nodeDefaults.label || `New ${baseLabel}`;
			const displayName = nodeDefaults.displayName || baseLabel;

			const newNode = {
				id: uuidv4(),
				type: nodeType,
				data: {
					...nodeDefaults,
					label,
					displayName,
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
			markUnsaved();
			const missingRequiredNodes = getMissingRequiredNodes();
			logMissingRequiredNodes();
			showValidationToasts(missingRequiredNodes);
		},
		[
			setNodes,
			edges,
			saveToHistory,
			markUnsaved,
			logMissingRequiredNodes,
			getMissingRequiredNodes,
			showValidationToasts,
		]
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
		const nodeDefinition = getNodeDefinition(nodeType);
		const nodeDefaults = getNodeDefaultData(nodeType);
		const baseLabel = nodeDefinition?.label || 'Node';
		const label = nodeDefaults.label || `New ${baseLabel}`;
		const displayName = nodeDefaults.displayName || baseLabel;

		const newNode = {
			id: newNodeId,
			type: nodeType,
			position: position,
			data: {
				...nodeDefaults,
				label,
				displayName,
			},
		};

		// Check if parent is the Start Node
		const isStartNode = parentNodeId === '00000000-0000-0000-0000-000000000001';
		const canHaveOutputs = nodeDefinition?.canHaveOutputs ?? true;
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
		markUnsaved();
		const missingRequiredNodes = getMissingRequiredNodes();
		logMissingRequiredNodes();
		showValidationToasts(missingRequiredNodes);

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
	}, [
		pendingPlaceholderData,
		setNodes,
		setEdges,
		handlePlaceholderClick,
			markUnsaved,
			logMissingRequiredNodes,
			getMissingRequiredNodes,
			showValidationToasts,
	]);

	// Add placeholders to nodes on mobile
	useEffect(() => {
		if (deviceType !== 'mobile' || nodes.length === 0) return;

		const regularNodes = nodes.filter((n) => n.type !== 'placeholderNode');
		const placeholderNodes = nodes.filter((n) => n.type === 'placeholderNode');
		const newPlaceholders = [];
		const newEdges = [];

		regularNodes.forEach((node) => {
			// Skip nodes that cannot have outputs
			const nodeDefinition = getNodeDefinition(node.type);
			if (nodeDefinition && nodeDefinition.canHaveOutputs === false) {
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
		markUnsaved();
	}, [nodes, edges, setNodes, setEdges, saveToHistory, markUnsaved]);

	const handleRecenterGraph = useCallback(() => {
		if (!reactFlowInstance) return;
		const regularNodes = nodes.filter((n) => n.type !== 'placeholderNode');
		if (regularNodes.length === 0) return;

		try {
			reactFlowInstance.fitView({
				nodes: regularNodes.map((node) => ({ id: node.id })),
				padding: 0.18,
				duration: 300,
			});
		} catch (error) {
			reactFlowInstance.fitView({ padding: 0.18, duration: 300 });
		}
	}, [reactFlowInstance, nodes]);

	const handleFocusStartNode = useCallback(() => {
		focusStartNode();
	}, [focusStartNode]);

	// Auto-apply layout on mobile when nodes change
	useEffect(() => {
		if (deviceType !== 'mobile' || !hasGraphInitialized) return;

		const regularNodeCount = nodes.filter((n) => n.type !== 'placeholderNode').length;
		const placeholderCount = nodes.length - regularNodeCount;

		// Run initial layout after dialogue loads (including placeholders)
		if (!hasInitialLayout && nodes.length > 0 && regularNodeCount > 0) {
			const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
				nodes,
				edges
			);
			setNodes(layoutedNodes);
			setEdges(layoutedEdges);
			setLastLayoutRegularNodeCount(regularNodeCount);
			setLastLayoutPlaceholderCount(placeholderCount);
			setHasInitialLayout(true);

			if (!hasInitialFocus) {
				queueMobileStartFocus(layoutedNodes);
			}
			return;
		}

		// Run layout when mobile graph structure changes:
		// regular nodes (user adds node) or placeholders (post-processing pass).
		const graphShapeChanged =
			regularNodeCount !== lastLayoutRegularNodeCount ||
			placeholderCount !== lastLayoutPlaceholderCount;

		if (hasInitialLayout && regularNodeCount > 0 && graphShapeChanged) {
			const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
				nodes,
				edges
			);
			setNodes(layoutedNodes);
			setEdges(layoutedEdges);
			setLastLayoutRegularNodeCount(regularNodeCount);
			setLastLayoutPlaceholderCount(placeholderCount);

			if (!hasInitialFocus) {
				queueMobileStartFocus(layoutedNodes);
			}
		}
	}, [deviceType, hasGraphInitialized, nodes.length, edges.length, hasInitialLayout, hasInitialFocus, queueMobileStartFocus]);

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

	// Handle keyboard events
	useEffect(() => {
		const handleKeyDown = (event) => {
			if (isPreviewOpen) {
				return;
			}

			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
				event.preventDefault();
				handleSave();
				return;
			}

			// Don't delete if user is typing in an input field
			const target = event.target;
			const isTyping =
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable;

			// Undo/redo shortcuts (avoid interfering with text inputs)
			if (!isTyping && (event.ctrlKey || event.metaKey)) {
				const key = event.key.toLowerCase();
				if (key === 'z' && !event.shiftKey) {
					event.preventDefault();
					handleUndo();
					return;
				}
				if (key === 'y' || (key === 'z' && event.shiftKey)) {
					event.preventDefault();
					handleRedo();
					return;
				}
			}

			if ((event.key === 'Delete' || event.key === 'Backspace') && !isTyping) {
				event.preventDefault();

				// Delete selected node
				if (selectedNode && selectedNode.id !== '00000000-0000-0000-0000-000000000001') {
					deleteSelectedNode();
				}
				// Delete selected edge
				else if (selectedEdge && deviceType !== 'mobile') {
					setEdges((eds) => {
						const updatedEdges = eds.filter((e) => e.id !== selectedEdge.id);
						saveToHistory(nodes, updatedEdges);
						markUnsaved();
						return updatedEdges;
					});
					setSelectedEdge(null);
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [
		selectedNode,
		selectedEdge,
		deviceType,
		deleteSelectedNode,
		setEdges,
		nodes,
		saveToHistory,
		markUnsaved,
		handleSave,
		handleUndo,
		handleRedo,
		isPreviewOpen,
	]);

	// Handle viewport change
	const onMove = useCallback((event, newViewport) => {
		setViewport(newViewport);
	}, []);

	const getMinimapColor = useCallback((node) => {
		return getNodeDefinition(node.type)?.minimapColor || '#6b7280';
	}, []);

	const previewDisplayNodes = useMemo(
		() =>
			nodes.map((node) => ({
				...node,
				data: {
					...node.data,
					previewActive: node.id === previewActiveNodeId,
				},
			})),
		[nodes, previewActiveNodeId]
	);

	const previewDisplayEdges = useMemo(
		() =>
			edges.map((edge) => ({
				...edge,
				type: edge?.data?.isPlaceholder ? edge.type || 'default' : 'conditionEdge',
				data: {
					...edge.data,
					onOpenDetails: openEdgeDetails,
				},
				animated: selectedEdge?.id === edge.id,
				style: {
					...edge.style,
					stroke: selectedEdge?.id === edge.id ? '#3b82f6' : undefined,
					strokeWidth: selectedEdge?.id === edge.id ? 3 : 2,
				},
			})),
		[edges, selectedEdge, openEdgeDetails]
	);

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

	useEffect(() => {
		const handleCommandSave = (event) => {
			const detail = event?.detail;
			if (!detail || detail.dialogueId !== dialogueId) return;
			handleSave();
		};

		const handleCommandExport = (event) => {
			const detail = event?.detail;
			if (!detail || detail.dialogueId !== dialogueId) return;
			handleExport();
		};

		window.addEventListener('command:dialogue-save', handleCommandSave);
		window.addEventListener('command:dialogue-export', handleCommandExport);

		return () => {
			window.removeEventListener('command:dialogue-save', handleCommandSave);
			window.removeEventListener('command:dialogue-export', handleCommandExport);
		};
	}, [dialogueId, handleSave, handleExport]);

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
			<AppHeader
				ref={headerRef}
				data-tour="editor-header"
				left={
					<>
						<Link to="/projects/$projectId" params={{ projectId }}>
							<Button variant="ghost" size="icon" className="rounded-full shrink-0">
								<ArrowLeft className="h-5 w-5" />
							</Button>
						</Link>
						<div className="min-w-0">
							<h1 className="text-sm md:text-2xl font-bold tracking-tight truncate">{dialogue.name}</h1>
							<p className="text-xs md:text-sm text-muted-foreground truncate">{project.name}</p>
						</div>
					</>
				}
				right={
					<>
						<span className="hidden md:flex" data-header-mobile-hidden>
							<SaveIndicator
								status={saveStatus}
								lastSaved={lastSaved}
								className="hidden md:flex"
							/>
						</span>

						{/* Command Palette Trigger */}
						<Button
							variant="outline"
							size="icon"
							className="rounded-full"
							data-tour="save-button"
							onClick={() =>
								openCommandPalette({
									placeholder: t('common.search'),
									actions: [
										{
											group: t('editor.menu.file'),
											items: [
												{
													icon: Save,
													label: isSaving ? t('common.saving') : t('common.save'),
													shortcut: 'Ctrl+S',
													onSelect: handleSave,
												},
												{
													icon: Download,
													label: t('common.export'),
													shortcut: 'Ctrl+E',
													onSelect: handleExport,
												},
												...(deviceType !== 'mobile'
													? [
															{
																icon: PlayCircle,
																label: t('editor.preview.start'),
																shortcut: '',
																onSelect: handleStartPreview,
															},
													  ]
													: []),
											],
										},
										{
											group: t('editor.menu.edit'),
											items: [
												{
													icon: Undo2,
													label: t('editor.menu.undo'),
													shortcut: 'Ctrl+Z',
													onSelect: handleUndo,
												},
												{
													icon: Redo2,
													label: t('editor.menu.redo'),
													shortcut: 'Ctrl+Y',
													onSelect: handleRedo,
												},
											],
										},
										{
											group: t('editor.menu.view'),
											items: [
												{
													key: 'language-selector',
													render: () => (
														<div className="flex items-center gap-3">
															<span className="text-xs font-medium text-muted-foreground">
																{t('settings.language')}
															</span>
															<LanguageSelector />
														</div>
													),
												},
												{
													icon: resolvedTheme === 'dark' ? Sun : Moon,
													label:
														resolvedTheme === 'dark'
															? t('settings.lightMode')
															: t('settings.darkMode'),
													shortcut: '',
													onSelect: () =>
														setTheme(
															resolvedTheme === 'dark' ? 'light' : 'dark'
														),
												},
												{
													icon: Crosshair,
													label: t('editor.nodeToolbar.recenter'),
													shortcut: '',
													onSelect: handleRecenterGraph,
												},
												{
													icon: LocateFixed,
													label: t('editor.nodeToolbar.backToStart'),
													shortcut: '',
													onSelect: handleFocusStartNode,
												},
												...(deviceType !== 'mobile'
													? [
															{
																icon: HelpCircle,
																label: t('editor.menu.showTour'),
																shortcut: '',
																onSelect: resetTour,
															},
													  ]
													: []),
											],
										},
										{
											group: t('settings.title'),
											items: [
												{
													icon: Settings,
													label: t('settings.title'),
													shortcut: '',
													onSelect: () =>
														openSettingsCommand({
															context: {
																type: 'dialogue',
																name: dialogue.name,
																projectId,
																dialogueId,
															},
															mode: 'detail',
														}),
												},
												{
													icon: Heart,
													label: t('editor.menu.support'),
													shortcut: '',
													onSelect: () =>
														window.open(
															'https://github.com/sponsors/Mountea-Framework',
															'_blank'
														),
												},
											],
										},
									],
								})
							}
						>
							<Menu className="h-4 w-4" />
						</Button>
					</>
				}
			/>

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
						nodes={previewDisplayNodes}
						edges={previewDisplayEdges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onNodeClick={onNodeClick}
						onEdgeClick={onEdgeClick}
						onPaneClick={onPaneClick}
						onMove={onMove}
						onInit={setReactFlowInstance}
				isValidConnection={isConnectionAllowed}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
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
				<Panel position="bottom-left" className="mb-2">
					<div className="bg-card border border-border rounded-full shadow-lg px-2 py-2 absolute bottom-6 flex flex-col items-center gap-1">
						<SimpleTooltip content={t('editor.nodeToolbar.recenterTooltip')} side="top">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-full"
								onClick={handleRecenterGraph}
							>
								<Crosshair className="h-4 w-4" />
							</Button>
						</SimpleTooltip>
						<SimpleTooltip content={t('editor.nodeToolbar.startFocusTooltip')} side="top">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-full"
								onClick={handleFocusStartNode}
							>
								<LocateFixed className="h-4 w-4" />
							</Button>
						</SimpleTooltip>
						<div className="w-6 h-px bg-border my-1" />
						<ZoomSlider className="!p-0 !bg-transparent !border-0 !shadow-none " />
					</div>
				</Panel>
				{deviceType !== 'mobile' && (
					<MiniMap
						nodeColor={getMinimapColor}
						className="!bg-card !border !border-border !rounded-lg !shadow-lg"
						maskColor="rgb(0, 0, 0, 0.1)"
						data-tour="minimap"
					/>
				)}
			</ReactFlow>

					{deviceType !== 'mobile' && (
						<DialoguePreviewOverlay
							open={isPreviewOpen}
							nodes={nodes}
							edges={edges}
							onStop={handlePreviewStop}
							onNodeFocus={handlePreviewNodeFocus}
							onNodeChange={setPreviewActiveNodeId}
						/>
					)}

			</div>

			{/* Mobile Node Action Bar */}
			{deviceType === 'mobile' && selectedNode && (
				<div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-card border rounded-full shadow-lg px-4 py-2">
					<span className="text-sm font-medium truncate max-w-32">
						{selectedNode.data.displayName || selectedNode.type?.replace('Node', '')}
					</span>
					<div className="h-4 w-px bg-border" />
					<div className="flex items-center gap-1">
						<ButtonGroup>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-full"
								onClick={() => setIsMobilePanelOpen(true)}
							>
								<PanelRightOpen className="h-4 w-4" />
							</Button>
							{selectedNode.id !== '00000000-0000-0000-0000-000000000001' && (
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
									onClick={() => setIsCascadeDeleteOpen(true)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							)}
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 rounded-full"
								onClick={() => setSelectedNode(null)}
							>
								<X className="h-4 w-4" />
							</Button>
						</ButtonGroup>
					</div>					
				</div>
			)}

			{/* Mobile Cascade Delete Confirmation */}
			{deviceType === 'mobile' && (
				<AlertDialog open={isCascadeDeleteOpen} onOpenChange={setIsCascadeDeleteOpen}>
					<AlertDialogContent variant="destructive" size="sm">
						<AlertDialogHeader>
							<AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
								<Trash2 className="h-6 w-6" />
							</AlertDialogMedia>
							<AlertDialogTitle>{t('editor.deleteCascadeTitle')}</AlertDialogTitle>
							<AlertDialogDescription>
								{t('editor.deleteCascadeDescription')}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel variant="outline">{t('common.cancel')}</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => {
									setIsCascadeDeleteOpen(false);
									deleteSelectedNodeCascade();
								}}
							>
								{t('editor.deleteCascadeConfirm')}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}

			{/* Node Properties Drawer */}
			<Drawer
				open={
					deviceType === 'mobile'
						? Boolean((selectedNode || selectedEdge) && isMobilePanelOpen)
						: Boolean(selectedNode || selectedEdge)
				}
				onOpenChange={(open) => {
					if (open) return;
					if (deviceType === 'mobile') {
						setIsMobilePanelOpen(false);
					} else {
						setSelectedNode(null);
						setSelectedEdge(null);
					}
				}}
				direction={deviceType === 'mobile' ? 'bottom' : 'right'}
			>
				<DrawerContent
					side={deviceType === 'mobile' ? 'bottom' : 'right'}
					size={deviceType === 'mobile' ? 'md' : '2xl'}
					className={
						deviceType === 'mobile'
							? 'max-h-[82vh] overscroll-contain touch-pan-y'
							: null
					}
				>
					{selectedNode && (
						<div className="p-6 space-y-6 overflow-y-auto">
							<DrawerHeader className="p-0">
								<div className="flex items-center justify-between">
									<DrawerTitle className="text-lg font-bold">
										{(selectedNodeDefinition?.label || 'Node') +
											' ' +
											t('editor.nodeDetails')}
									</DrawerTitle>
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
							</DrawerHeader>

							{selectedNodeDefinition?.sections?.map((section) => (
								<CollapsibleSection
									key={section.id}
									title={t(section.titleKey)}
									defaultOpen={section.defaultOpen ?? true}
								>
									<div className="space-y-4">
										{section.fields.map((field) => renderNodeField(field))}
									</div>
								</CollapsibleSection>
							))}
						</div>
					)}
					{!selectedNode && selectedEdge && (
						<div className="p-6 space-y-6 overflow-y-auto">
							<DrawerHeader className="p-0">
								<div className="flex items-center justify-between">
									<DrawerTitle className="text-lg font-bold">
										{t('editor.edgeDetails')}
									</DrawerTitle>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => {
											if (deviceType === 'mobile') {
												setIsMobilePanelOpen(false);
											} else {
												setSelectedEdge(null);
											}
										}}
										className="h-8 w-8"
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							</DrawerHeader>

							<CollapsibleSection
								title={t('editor.sections.conditions')}
								defaultOpen={true}
							>
								<div className="space-y-4">
									<EdgeConditionsPanel
										conditionGroup={selectedEdge.data?.conditions}
										availableConditions={availableConditionDefinitions}
										onChange={(nextConditions) =>
											updateEdgeData(selectedEdge.id, {
												conditions: nextConditions,
											})
										}
									/>
									<div>
										<Label className="text-xs text-muted-foreground">
											{t('editor.sections.edgeId')}
										</Label>
										<code className="text-xs font-mono bg-muted px-2 py-1 rounded block mt-1">
											{selectedEdge.id}
										</code>
									</div>
								</div>
							</CollapsibleSection>
						</div>
					)}
				</DrawerContent>
			</Drawer>
			</div>

			{/* Bottom Toolbar - Hidden on mobile */}
			{deviceType !== 'mobile' && (
			<div
				className={`border-t bg-card px-6 py-3 flex items-center justify-between transition-opacity ${
					isPreviewOpen ? 'pointer-events-none opacity-40 select-none' : ''
				}`}
				data-tour="node-toolbar"
			>
				<div className="flex items-center gap-2">
					<SimpleTooltip content={t('editor.nodeToolbar.autoLayoutTooltip')} side="top">
						<Button
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={onLayout}
						>
							<Network className="h-4 w-4" />
							{t('editor.nodeToolbar.autoLayout')}
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content={t('editor.preview.startTooltip')} side="top">
						<Button
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={handleStartPreview}
						>
							<PlayCircle className="h-4 w-4" />
							{t('editor.preview.start')}
						</Button>
					</SimpleTooltip>
					<div className="h-6 w-px bg-border mx-1"></div>
					<SimpleTooltip content={t('editor.nodeToolbar.addNpcTooltip')} side="top">
						<Button
							variant="outline"
							size="sm"
							className="gap-2 cursor-move"
							draggable
							onDragStart={(e) => onDragStart(e, 'leadNode')}
							onClick={() => addNode('leadNode')}
						>
							<MessageCircle className="h-4 w-4" />
							{t('editor.nodeToolbar.npc')}
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content={t('editor.nodeToolbar.addPlayerTooltip')} side="top">
						<Button
							variant="outline"
							size="sm"
							className="gap-2 cursor-move"
							draggable
							onDragStart={(e) => onDragStart(e, 'answerNode')}
							onClick={() => addNode('answerNode')}
						>
							<User className="h-4 w-4" />
							{t('editor.nodeToolbar.player')}
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content={t('editor.nodeToolbar.addReturnTooltip')} side="top">
						<Button
							variant="outline"
							size="sm"
							className="gap-2 cursor-move"
							draggable
							onDragStart={(e) => onDragStart(e, 'returnNode')}
							onClick={() => addNode('returnNode')}
						>
							<CornerUpLeft className="h-4 w-4" />
							{t('editor.nodeToolbar.return')}
						</Button>
					</SimpleTooltip>
					<SimpleTooltip
						content={t('editor.nodeToolbar.addOpenChildGraphTooltip')}
						side="top"
					>
						<Button
							variant="outline"
							size="sm"
							className="gap-2 cursor-move"
							draggable
							onDragStart={(e) => onDragStart(e, 'openChildGraphNode')}
							onClick={() => addNode('openChildGraphNode')}
						>
							<ExternalLink className="h-4 w-4" />
							{t('editor.nodeToolbar.openChildGraph')}
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content={t('editor.nodeToolbar.addCompleteTooltip')} side="top">
						<Button
							variant="outline"
							size="sm"
							className="gap-2 cursor-move"
							draggable
							onDragStart={(e) => onDragStart(e, 'completeNode')}
							onClick={() => addNode('completeNode')}
						>
							<CheckCircle2 className="h-4 w-4" />
							{t('editor.nodeToolbar.complete')}
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content={t('editor.nodeToolbar.addDelayTooltip')} side="top">
						<Button
							variant="outline"
							size="sm"
							className="gap-2 cursor-move"
							draggable
							onDragStart={(e) => onDragStart(e, 'delayNode')}
							onClick={() => addNode('delayNode')}
						>
							<Clock className="h-4 w-4" />
							{t('editor.nodeToolbar.delay')}
						</Button>
					</SimpleTooltip>
				</div>
				<div className="flex items-center gap-4 text-sm text-muted-foreground">
					<span>
						{nodes.length} {t('dialogues.nodes')} • {edges.length}{' '}
						{t('dialogues.edges')}
					</span>
					<span className="text-xs hidden md:block">
						{t('editor.nodeToolbar.poweredBy')}{' '}
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
			)}

			{/* Node Type Selection Modal (Mobile) */}
			<NodeTypeSelectionModal
				open={isNodeTypeModalOpen}
				onOpenChange={setIsNodeTypeModalOpen}
				onSelectType={handleNodeTypeSelect}
			/>

			{showMobileGraphLoader &&
				deviceType === 'mobile' &&
				typeof document !== 'undefined' &&
				createPortal(
					<div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-2xl backdrop-saturate-150">
						<div className="w-[82%] max-w-xs rounded-xl border border-border/70 bg-card/95 p-4 shadow-2xl">
							<div className="mb-2 flex items-center justify-between text-sm">
								<span className="font-medium">{t('common.loading')}</span>
								<span className="text-muted-foreground">{mobileLoadProgress}%</span>
							</div>
							<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full bg-primary transition-all duration-300"
									style={{ width: `${mobileLoadProgress}%` }}
								/>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								Preparing dialogue graph...
							</p>
						</div>
					</div>,
					document.body
				)}

			{showDesktopGraphLoader &&
				deviceType !== 'mobile' &&
				typeof document !== 'undefined' &&
				createPortal(
					<div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/35 backdrop-blur-xl backdrop-saturate-125">
						<div className="w-[420px] max-w-[82%] rounded-xl border border-border/70 bg-card/95 p-4 shadow-2xl">
							<div className="mb-2 flex items-center justify-between text-sm">
								<span className="font-medium">{t('common.loading')}</span>
								<span className="text-muted-foreground">
									{hasLoadedViewport || hasInitialFocus ? '100%' : '65%'}
								</span>
							</div>
							<div className="h-2 w-full overflow-hidden rounded-full bg-muted">
								<div
									className="h-full bg-primary transition-all duration-300"
									style={{ width: hasLoadedViewport || hasInitialFocus ? '100%' : '65%' }}
								/>
							</div>
							<p className="mt-2 text-xs text-muted-foreground">
								Preparing dialogue graph...
							</p>
						</div>
					</div>,
					document.body
				)}
		</div>
	);
}
