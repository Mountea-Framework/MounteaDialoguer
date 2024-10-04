import React, {
	useState,
	useCallback,
	useContext,
	useRef,
	useEffect,
	useMemo,
} from "react";
import ReactFlow, {
	Controls,
	reconnectEdge,
	addEdge,
	SelectionMode,
	useReactFlow,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";

import { useSelection } from "../../contexts/SelectionContext";
import AppContext from "../../AppContext";
import { useAutoSave } from "../../hooks/useAutoSave";

import SpawnNewNode from "./SpawnNewNode";

import CustomEdge from "../dialogueEdges/baseEdge";

import StartNode from "../dialogueNodes/startNode";
import LeadNode from "../dialogueNodes/leadNode";
import AnswerNode from "../dialogueNodes/answerNode";
import CloseDialogueNode from "../dialogueNodes/closeDialogueNode";
import JumpToNode from "../dialogueNodes/jumpToNode";

import "reactflow/dist/style.css";
import "../../componentStyles/editorComponentStyles/DialogueEditorCanvas.css";
import "../../base/BaseNodesStyle.css";

const nodeTypes = {
	startNode: StartNode,
	leadNode: LeadNode,
	answerNode: AnswerNode,
	closeDialogueNode: CloseDialogueNode,
	jumpToNode: JumpToNode,
};

const edgeTypes = {
	customEdge: CustomEdge,
};

const panOnDrag = [1, 2];

const DialogueEditorCanvas = ({
	nodes,
	edges,
	setNodes,
	setEdges,
	onNodesChange,
	onEdgesChange,
}) => {
	const { getNode } = useReactFlow();
	const { name, categories, participants } = useContext(AppContext);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({
		x: 0,
		y: 0,
	});
	const [isDragging, setIsDragging] = useState(false);
	const { selectedNode, selectNode } = useSelection();

	const reactFlowWrapper = useRef(null);
	const { project } = useReactFlow();

	const onNodesDelete = useCallback(
		(nodesToDelete) => {
			setNodes((prevNodes) => {
				const updatedNodes = prevNodes.filter(
					(node) => !nodesToDelete.some((n) => n.id === node.id)
				);

				if (nodesToDelete.some((node) => node.id === selectedNode?.id)) {
					selectNode(null);
				}

				return updatedNodes;
			});
		},
		[setNodes, selectedNode, selectNode]
	);

	const handleNodesChange = useCallback(
		(changes) => {
			onNodesChange(changes);

			// After the changes are applied, check if the selected node still exists
			setNodes((currentNodes) => {
				if (
					selectedNode &&
					!currentNodes.some((node) => node.id === selectedNode.id)
				) {
					selectNode(null);
				}
				return currentNodes;
			});
		},
		[onNodesChange, selectedNode, selectNode, setNodes]
	);

	const handleNodeClick = useCallback(
		(event, node) => {
			if (selectedNode?.id !== node.id) {
				selectNode(node);
				setNodes((nds) => {
					const needsUpdate = nds.some(
						(n) =>
							(n.id === node.id && !n.data.selected) ||
							(n.id !== node.id && n.data.selected)
					);

					if (needsUpdate) {
						return nds.map((n) => ({
							...n,
							data: {
								...n.data,
								selected: n.id === node.id,
								isDragging,
							},
						}));
					}
					return nds;
				});
			}
		},
		[selectedNode, selectNode, setNodes, isDragging]
	);

	const handleNodeDoubleClick = useCallback(
		(event, node) => {
			selectNode(node);
			setNodes((nds) => {
				const needsUpdate = nds.some(
					(n) =>
						(n.id === node.id && !n.data.selected) ||
						(n.id !== node.id && n.data.selected)
				);

				if (needsUpdate) {
					return nds.map((n) => ({
						...n,
						data: {
							...n.data,
							selected: n.id === node.id,
							isDragging,
						},
					}));
				}
				return nds;
			});
		},
		[selectNode, setNodes, isDragging]
	);

	const handlePaneContextMenu = useCallback(
		(event) => {
			event.preventDefault();
			const { clientX, clientY } = event;
			setContextMenuPosition({ x: clientX, y: clientY });
			setIsModalOpen(true);
			selectNode(null);
		},
		[selectNode]
	);

	const handlePaneClick = useCallback(
		(event) => {
			if (event.target === event.currentTarget) {
				selectNode(null);
				setNodes((nds) =>
					nds.map((n) => ({
						...n,
						data: { ...n.data, selected: false, isDragging: false },
					}))
				);
			}
		},
		[selectNode, setNodes]
	);

	const handleDragNode = (event, node) => {
		setIsDragging(true); // Set dragging state
		if (node && selectedNode) {
			if (node.id === selectedNode.id) {
				return;
			}
		}
		if (node !== selectedNode) {
			selectNode(null);
			setNodes((nds) =>
				nds.map((n) => ({
					...n,
					data: { ...n.data, selected: false, isDragging: true },
				}))
			);
		}
	};

	const handleDragNodeEnd = (event, node) => {
		setIsDragging(false);
		if (selectedNode == null) {
			setNodes((nds) =>
				nds.map((n) => ({
					...n,
					data: { ...n.data, selected: false, isDragging: false },
				}))
			);
		}
	};

	const isValidConnection = useCallback((connection) => {
		return connection.source !== connection.target;
	}, []);

	const handleSpawnNode = (type, label) => {
		const projectedPosition = project(contextMenuPosition);
		const newNode = {
			id: uuidv4(),
			type: type,
			position: { x: projectedPosition.x, y: projectedPosition.y },
			data: {
				title: label, //`${type.charAt(0).toUpperCase() + type.slice(1)}`,
				setEdges: setEdges,
				selected: false,
				isDragging: false,
			},
		};
		setNodes((nds) => nds.concat(newNode));
		setIsModalOpen(false);
	};

	const onReconnect = useCallback(
		(oldEdge, newConnection) =>
			setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
		[setEdges]
	);

	const connectHandledRef = useRef(false);
	const connectStartRef = useRef(null);

	const onConnectStart = useCallback((_, { nodeId, handleType }) => {
		connectStartRef.current = { nodeId, handleType };
		connectHandledRef.current = false;
	}, []);

	const onConnect = useCallback(
		(connection) => {
			const edge = { ...connection, type: "customEdge" };
			setEdges((eds) => addEdge(edge, eds));
			connectHandledRef.current = true;
		},
		[setEdges]
	);

	const handleConnectEnd = useCallback(
		(event) => {
			const targetIsPane = event.target.classList.contains("react-flow__pane");
			const targetIsNode = event.target.classList.contains("react-flow__node");

			if (targetIsPane && !connectHandledRef.current) {
				handlePaneContextMenu(event);
			} else if (targetIsNode && !connectHandledRef.current) {
				const targetNodeId = event.target.dataset.id;
				const sourceNodeId = connectStartRef.current?.nodeId;
				console.log(targetNodeId);
				if (
					sourceNodeId &&
					targetNodeId &&
					isValidConnection(sourceNodeId, targetNodeId)
				) {
					const sourceNode = getNode(sourceNodeId);
					const targetNode = getNode(targetNodeId);

					if (sourceNode && targetNode) {
						const newConnection = {
							id: `e${sourceNodeId}-${targetNodeId}`,
							source: sourceNodeId,
							target: targetNodeId,
							sourceHandle: connectStartRef.current.handleType,
							targetHandle: "target",
						};
						onConnect(newConnection);
					}
				}
			}

			connectStartRef.current = null;
			connectHandledRef.current = false;
		},
		[handlePaneContextMenu, isValidConnection, getNode, onConnect]
	);

	useAutoSave(name, categories, participants, nodes, edges);

	useEffect(() => {
		const handleContextMenu = (event) => {
			event.preventDefault();
		};

		const currentWrapper = reactFlowWrapper.current;
		currentWrapper.addEventListener("contextmenu", handleContextMenu);

		return () => {
			currentWrapper.removeEventListener("contextmenu", handleContextMenu);
		};
	}, []);

	// Memoize nodeTypes to prevent unnecessary re-renders
	const memoizedNodeTypes = useMemo(() => {
		return Object.fromEntries(
			Object.entries(nodeTypes).map(([key, value]) => [key, value])
		);
	}, []);

	const [nodeVersion, setNodeVersion] = useState({});

	const forceNodeUpdate = useCallback((nodeId) => {
		setNodeVersion((prev) => ({
			...prev,
			[nodeId]: (prev[nodeId] || 0) + 1,
		}));
	}, []);

	const memoizedNodes = useMemo(() => {
		return nodes.map((node) => ({
			...node,
			data: {
				...node.data,
				isDragging,
				version: nodeVersion[node.id] || 0,
				forceNodeUpdate,
			},
		}));
	}, [nodes, isDragging, nodeVersion, forceNodeUpdate]);

	return (
		<div
			className="dialogue-editor-canvas background-transparent-primary"
			ref={reactFlowWrapper}
			onContextMenu={handlePaneContextMenu}
			onClick={handlePaneClick}
		>
			<ReactFlow
				nodes={memoizedNodes}
				edges={edges}
				onNodesChange={handleNodesChange}
				onEdgesChange={onEdgesChange}
				onNodesDelete={onNodesDelete}
				isValidConnection={isValidConnection}
				onConnect={onConnect}
				onConnectEnd={handleConnectEnd}
				onConnectStart={onConnectStart}
				snapToGrid
				snapGrid={[10, 10]}
				onReconnect={onReconnect}
				nodeTypes={memoizedNodeTypes}
				edgeTypes={edgeTypes}
				maxZoom={1.75}
				minZoom={0.25}
				fitView
				selectionOnDrag
				panOnDrag={panOnDrag}
				zoomOnDoubleClick={false}
				onDoubleClick={handlePaneContextMenu}
				selectionMode={SelectionMode.Partial}
				onNodeDoubleClick={handleNodeDoubleClick}
				onNodeClick={handleNodeClick}
				onPaneClick={handlePaneClick}
				onNodeDragStart={handleDragNode}
				onNodeDragStop={handleDragNodeEnd}
			>
				<p className="dialogue-editor-canvas-version">Alpha Version</p>
				<Controls />
			</ReactFlow>
			<SpawnNewNode
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				nodeTypes={memoizedNodeTypes}
				onSpawn={handleSpawnNode}
			/>
		</div>
	);
};

export default DialogueEditorCanvas;
