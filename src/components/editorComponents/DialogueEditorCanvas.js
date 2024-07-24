import React, { useState, useCallback, useContext } from "react";
import ReactFlow, {
	useNodesState,
	useEdgesState,
	Controls,
	reconnectEdge,
	addEdge,
	SelectionMode,
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
	const [canvasTransform, setCanvasTransform] = useState([1, 0, 0]);

	const handlePaneContextMenu = (event) => {
		event.preventDefault();
		setIsModalOpen(true);
	};

	const handleTransform = useCallback((transform) => {
		setCanvasTransform(transform);
	}, []);

	const handleSpawnNode = (type) => {
		console.log(type);
		const newNode = {
			id: uuidv4(),
			type: type,
			position: { x: 0, y: 0 },
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

	const handleMouseDown = (event) => {
		if (event.button === 2) {
			// Right click
			if (event.detail === 1) {
				console.log("Single right-click");
			} else if (event.detail > 1) {
				console.log("Right-click and hold");
			}
		} else if (event.button === 0) {
			// Left click
			if (event.detail === 1) {
				// Single click
				// Handle left-click (open add node menu) logic here
				handlePaneContextMenu(event);
			} else if (event.detail > 1) {
				// Click and hold
				// Handle left-click and hold (enable moving around canvas) logic here
				console.log("Left-click and hold");
			}
		}
	};

	useAutoSaveNodesAndEdges(nodes, edges);
	useAutoSave(name, categories, participants);

	return (
		<div
			className="dialogue-editor-canvas background-transparent-primary"
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
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				maxZoom={1.75}
				minZoom={0.25}
				fitView
				onMoveEnd={handleTransform}
				selectionOnDrag
				panOnDrag={panOnDrag}
				selectionMode={SelectionMode.Partial}
			>
				<Controls />
			</ReactFlow>
			<SpawnNewNode
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				nodeTypes={nodeTypes}
				onSpawn={handleSpawnNode}
				canvasTransform={canvasTransform}
			/>
		</div>
	);
};

export default DialogueEditorCanvas;
