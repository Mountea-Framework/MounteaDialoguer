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
import { useAutoSaveNodesAndEdges } from "../../hooks/useAutoSaveNodesAndEdges";
import { useAutoSave } from "../../hooks/useAutoSave";

import SpawnNewNode from "./SpawnNewNode";

import CustomEdge from "../dialogueEdges/baseEdge";

import StartNode from "../dialogueNodes/startNode";
import LeadNode from "../dialogueNodes/leadNode";
import AnswerNode from "../dialogueNodes/answerNode";
import CloseDialogueNode from "../dialogueNodes/closeDialogueNode";
import CloseDialogueAutomaticNode from "../dialogueNodes/closeDialogueAutomaticNode";
import JumpToNode from "../dialogueNodes/jumpToNode";

import "reactflow/dist/style.css";
import "../../componentStyles/editorComponentStyles/DialogueEditorCanvas.css";
import "../../base/BaseNodesStyle.css";

const nodeTypes = {
	startNode: StartNode,
	leadNode: LeadNode,
	answerNode: AnswerNode,
	closeDialogueNode: CloseDialogueNode,
	closeDialogueAutomaticNode: CloseDialogueAutomaticNode,
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
	const { name, categories, participants } = useContext(AppContext);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({
		x: 0,
		y: 0,
	});
	const [isDragging, setIsDragging] = useState(false); // Add dragging state
	const { selectedNode, selectNode } = useSelection();

	const reactFlowWrapper = useRef(null);
	const { project } = useReactFlow();

	const onNodesDelete = useCallback(
		(nodesToDelete) => {
			setNodes((prevNodes) => {
				const updatedNodes = prevNodes.filter(
					(node) => !nodesToDelete.some((n) => n.id === node.id)
				);

				// Check if the deleted node was selected
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

	const handleNodeClick = (event, node) => {
		if (selectedNode?.id !== node.id) {
			selectNode(node);
			setNodes((nds) =>
				nds.map((n) =>
					n.id === node.id
						? { ...n, data: { ...n.data, selected: true, isDragging } }
						: { ...n, data: { ...n.data, selected: false, isDragging } }
				)
			);
		}
	};

	const handleNodeDoubleClick = (event, node) => {
		selectNode(node);
		setNodes((nds) =>
			nds.map((n) =>
				n.id === node.id
					? { ...n, data: { ...n.data, selected: true, isDragging } }
					: { ...n, data: { ...n.data, selected: false, isDragging } }
			)
		);
	};

	const handlePaneContextMenu = (event) => {
		event.preventDefault();
		const { clientX, clientY } = event;
		setContextMenuPosition({ x: clientX, y: clientY });
		setIsModalOpen(true);
		selectNode(null);
	};

	const handlePaneClick = (event) => {
		if (event.target === event.currentTarget) {
			selectNode(null);
			setNodes((nds) =>
				nds.map((n) => ({
					...n,
					data: { ...n.data, selected: false, isDragging },
				}))
			);
		}
	};

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

	const handleSpawnNode = (type) => {
		const projectedPosition = project(contextMenuPosition);
		const newNode = {
			id: uuidv4(),
			type: type,
			position: { x: projectedPosition.x, y: projectedPosition.y },
			data: {
				title: `${type.charAt(0).toUpperCase() + type.slice(1)}`,
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

	const onConnect = useCallback(
		(connection) => {
			const edge = { ...connection, type: "customEdge" };
			setEdges((eds) => addEdge(edge, eds));
		},
		[setEdges]
	);

	const isValidConnection = (connection) => {
		return connection.source !== connection.target;
	};

	useAutoSaveNodesAndEdges(nodes, edges);
	useAutoSave(name, categories, participants);

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

	return (
		<div
			className="dialogue-editor-canvas background-transparent-primary"
			ref={reactFlowWrapper}
			onContextMenu={handlePaneContextMenu}
			onClick={handlePaneClick}
		>
			<ReactFlow
				nodes={nodes.map((node) => ({
					...node,
					data: { ...node.data, isDragging },
				}))}
				edges={edges}
				onNodesChange={handleNodesChange}
				onEdgesChange={onEdgesChange}
				onNodesDelete={onNodesDelete}
				onConnect={onConnect}
				isValidConnection={isValidConnection}
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
				selectionMode={SelectionMode.Partial}
				onNodeDoubleClick={handleNodeDoubleClick}
				onNodeClick={handleNodeClick}
				onPaneClick={handlePaneClick}
				onNodeDragStart={handleDragNode}
				onNodeDragStop={handleDragNodeEnd}
			>
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
