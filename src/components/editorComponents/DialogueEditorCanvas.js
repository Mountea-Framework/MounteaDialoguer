import React, {
	useState,
	useCallback,
	useContext,
	useRef,
	useEffect,
	useMemo,
} from "react";
import ReactFlow, {
	useNodesState,
	useEdgesState,
	Controls,
	reconnectEdge,
	addEdge,
	SelectionMode,
	useReactFlow,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";

import { useSelection } from "../../contexts/SelectionContext";
import AppContext from "../../AppContext";
import useAutoSaveNodesAndEdges from "../../hooks/useAutoSaveNodesAndEdges";
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

const initialNodes = [
	{
		id: "00000000-0000-0000-0000-000000000001",
		type: "startNode",
		position: { x: 0, y: 0 },
		data: {
			title: "Start Node",
		},
	},
];

const initialEdges = [];

const panOnDrag = [1, 2];

const DialogueEditorCanvas = () => {
	const { name, categories, participants } = useContext(AppContext);
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [contextMenuPosition, setContextMenuPosition] = useState({
		x: 0,
		y: 0,
	});
	const { selectedNode, selectNode } = useSelection();

	const reactFlowWrapper = useRef(null);
	const { project } = useReactFlow();

	const handleNodeClick = (event, node) => {
		if (selectedNode?.id !== node.id) {
			selectNode(node);
			setNodes((nds) =>
				nds.map((n) =>
					n.id === node.id
						? { ...n, data: { ...n.data, selected: true } }
						: { ...n, data: { ...n.data, selected: false } }
				)
			);
		}
	};

	const handleNodeDoubleClick = (event, node) => {
		selectNode(node);
		setNodes((nds) =>
			nds.map((n) =>
				n.id === node.id
					? { ...n, data: { ...n.data, selected: true } }
					: { ...n, data: { ...n.data, selected: false } }
			)
		);
	};

	const handlePaneContextMenu = (event) => {
		event.preventDefault();
		const { clientX, clientY } = event;
		setContextMenuPosition({ x: clientX, y: clientY });
		setIsModalOpen(true);
	};

	const handlePaneClick = (event) => {
		if (event.target === event.currentTarget) {
			selectNode(null);
			setNodes((nds) =>
				nds.map((n) => ({ ...n, data: { ...n.data, selected: false } }))
			);
		}
	};

	const handleDragNode = (event, node) => {
		if (node && selectedNode) {
			if (node.id === selectedNode.id) {
				return;
			}
		}
		if (node !== selectedNode) {
			selectNode(null);
			setNodes((nds) =>
				nds.map((n) => ({ ...n, data: { ...n.data, selected: false } }))
			);
		}
	};

	const handleDragNodeEnd = (event, node) => {
		console.log(node, selectedNode);
		if (selectedNode == null) {
			setNodes((nds) =>
				nds.map((n) => ({ ...n, data: { ...n.data, selected: false } }))
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
			},
		};
		setNodes((nds) => nds.concat(newNode));
		setIsModalOpen(false);
	};

	const onReconnect = useCallback(
		(oldEdge, newConnection) =>
			setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
		[]
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
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
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
				onPaneScroll={handlePaneClick}
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
