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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
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
	Circle,
	Settings,
	User,
	CheckCircle2,
	CornerUpLeft,
	Heart,
	X,
	Tag,
	Volume2,
	Trash2,
	Check,
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

// Custom Node Components
import StartNode from '@/components/dialogue/nodes/StartNode';
import LeadNode from '@/components/dialogue/nodes/LeadNode';
import AnswerNode from '@/components/dialogue/nodes/AnswerNode';
import ReturnNode from '@/components/dialogue/nodes/ReturnNode';
import CompleteNode from '@/components/dialogue/nodes/CompleteNode';
import { DialogueRowsPanel } from '@/components/dialogue/DialogueRowsPanel';
import { DecoratorsPanel } from '@/components/dialogue/DecoratorsPanel';
import { CollapsibleSection } from '@/components/dialogue/CollapsibleSection';
import { SaveIndicator } from '@/components/ui/save-indicator';
import { OnboardingTour, useOnboarding } from '@/components/ui/onboarding-tour';
import { celebrateSuccess } from '@/lib/confetti';
import { SimpleTooltip } from '@/components/ui/tooltip';

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
			await saveDialogueGraph(dialogueId, nodes, edges, viewport);
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
			// Save first to ensure we export the latest version
			await saveDialogueGraph(dialogueId, nodes, edges, viewport);
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
			{/* Onboarding Tour */}
			<OnboardingTour
				run={runTour}
				onFinish={finishTour}
				tourType="editor"
			/>

			{/* Header */}
			<header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-6 md:px-12 py-4 flex items-center justify-between" data-tour="editor-header">
				<div className="flex items-center gap-4">
					<Link to="/projects/$projectId" params={{ projectId }}>
						<SimpleTooltip content="Back to project" side="bottom">
							<Button variant="ghost" size="icon" className="rounded-full">
								<ArrowLeft className="h-5 w-5" />
							</Button>
						</SimpleTooltip>
					</Link>
					<div className="flex items-center gap-4">
						<div>
							<h1 className="text-2xl font-bold tracking-tight">{dialogue.name}</h1>
							<p className="text-sm text-muted-foreground">{project.name}</p>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-4">
					<SaveIndicator
						status={saveStatus}
						lastSaved={lastSaved}
						className="hidden md:flex"
					/>
					<SimpleTooltip content="Support Mountea Framework" side="bottom">
						<Button
							variant="outline"
							size="icon"
							onClick={() =>
								window.open(
									'https://github.com/sponsors/Mountea-Framework',
									'_blank'
								)
							}
							className="rounded-full"
						>
							<Heart className="h-4 w-4" />
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} side="bottom">
						<Button
							variant="outline"
							size="icon"
							onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
							className="rounded-full"
						>
							{theme === 'dark' ? (
								<Sun className="h-4 w-4" />
							) : (
								<Moon className="h-4 w-4" />
							)}
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content="Undo (Ctrl+Z)" side="bottom">
						<Button
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={handleUndo}
							disabled={historyIndex === 0}
						>
							<Undo2 className="h-4 w-4" />
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content="Redo (Ctrl+Y)" side="bottom">
						<Button
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={handleRedo}
							disabled={historyIndex === history.length - 1}
						>
							<Redo2 className="h-4 w-4" />
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content="Save dialogue (Ctrl+S)" side="bottom">
						<Button
							onClick={handleSave}
							variant={saveSuccess ? 'default' : 'outline'}
							className="gap-2"
							disabled={isSaving}
							data-tour="save-button"
						>
							{saveSuccess ? (
								<Check className="h-4 w-4" />
							) : (
								<Save className="h-4 w-4" />
							)}
							{isSaving
								? t('common.saving')
								: saveSuccess
								? 'Saved!'
								: t('common.save')}
						</Button>
					</SimpleTooltip>
					<SimpleTooltip content="Export dialogue to file" side="bottom">
						<Button
							onClick={handleExport}
							variant="outline"
							className="gap-2"
						>
							<Download className="h-4 w-4" />
							Export
						</Button>
					</SimpleTooltip>
					<Link
						to="/projects/$projectId/dialogue/$dialogueId/settings"
						params={{ projectId, dialogueId }}
					>
						<SimpleTooltip content="Dialogue settings" side="bottom">
							<Button variant="outline" size="icon" className="rounded-full">
								<Settings className="h-4 w-4" />
							</Button>
						</SimpleTooltip>
					</Link>
				</div>
			</header>

			{/* Main Content */}
			<div className="flex-1 flex overflow-hidden">
				{/* ReactFlow Canvas */}
				<div
					className="flex-1 relative"
					onDrop={onDrop}
					onDragOver={onDragOver}
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
					>
						<Background />
				<Panel position="bottom-left">
						<ZoomSlider className="!bg-card !border !border-border !rounded-lg !shadow-lg" />
					</Panel>
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
					</ReactFlow>
				</div>

				{/* Right Sidebar - Node Properties */}
				{selectedNode && (
					<div className="w-96 border-l bg-card overflow-y-auto">
						<div className="p-6 space-y-6">
							{/* Header */}
							<div className="flex items-center justify-between">
								<h3 className="text-lg font-bold">{(selectedNode.type?.replace('Node', '')?.replace(/^./, c => c.toUpperCase()) || 'default') + ' ' + t('editor.nodeDetails')}</h3>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => setSelectedNode(null)}
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
				</div>
				<div className="flex items-center gap-4 text-sm text-muted-foreground">
					<span>
						{nodes.length} {t('dialogues.nodes')} • {edges.length}{' '}
						{t('dialogues.edges')}
					</span>
					<span className="text-xs">
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
		</div>
	);
}
