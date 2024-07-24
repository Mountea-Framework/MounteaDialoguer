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

import AppContext from "../../AppContext";
import useAutoSaveNodesAndEdges from "../../hooks/useAutoSaveNodesAndEdges";
import useAutoSave from "../../hooks/useAutoSave";

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
		position: { x: 250, y: 0 },
		data: {
			title: "Start Node",
			nodeId: "00000000-0000-0000-0000-000000000001",
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

	const reactFlowWrapper = useRef(null);
	const { project } = useReactFlow();

	const handlePaneContextMenu = (event) => {
		event.preventDefault();
		const { clientX, clientY } = event;
		console.log(`Right-click at position: X=${clientX}, Y=${clientY}`);
		setContextMenuPosition({ x: clientX, y: clientY });
		setIsModalOpen(true);
	};

	const handleSpawnNode = (type) => {
		const projectedPosition = project(contextMenuPosition);
		const newNode = {
			id: uuidv4(),
			type: type,
			position: { x: projectedPosition.x, y: projectedPosition.y },
			data: {
				title: `${type.charAt(0).toUpperCase() + type.slice(1)} Node`,
				nodeId: uuidv4(),
				setEdges: setEdges,
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
			Object.entries(nodeTypes).map(([key, value]) => [
				key,
				value,
			])
		);
	}, []);

	return (
		<div
			className="dialogue-editor-canvas background-transparent-primary"
			ref={reactFlowWrapper}
			onContextMenu={handlePaneContextMenu}
		>
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				onConnect={onConnect}
				onConnectStart={(event, params) =>
					console.log("connect start", event, params)
				}
				onConnectStop={(event) => console.log("connect stop", event)}
				onConnectEnd={(event) => console.log("connect end", event)}
				isValidConnection={isValidConnection}
				snapToGrid
				onReconnect={onReconnect}
				nodeTypes={memoizedNodeTypes}
				edgeTypes={edgeTypes}
				maxZoom={1.75}
				minZoom={0.25}
				fitView
				selectionOnDrag
				panOnDrag={panOnDrag}
				selectionMode={SelectionMode.Partial}
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
