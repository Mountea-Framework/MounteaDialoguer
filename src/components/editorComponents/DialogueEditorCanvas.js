import React, { useState, useCallback, useContext } from "react";
import ReactFlow, {
	useNodesState,
	useEdgesState,
	Controls,
	reconnectEdge,
	addEdge,
} from "reactflow";
import { v4 as uuidv4 } from "uuid";

import AppContext from "../../AppContext";
import useAutoSaveNodesAndEdges from "../../hooks/useAutoSaveNodesAndEdges";
import useAutoSave from "../../hooks/useAutoSave";

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

// TODO: https://reactflow.dev/learn/layouting/layouting implement Vertical Layout

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
		id: "0",
		type: "startNode",
		position: { x: 250, y: 0 },
		data: { title: "Start Node", nodeId: uuidv4() },
	},
	{
		id: "1",
		type: "leadNode",
		position: { x: 250, y: 250 },
		data: {
			title: "Lead Node",
			nodeId: uuidv4(),
		},
	},
];

const initialEdges = [];

const DialogueEditorCanvas = () => {
	const { name, categories, participants } = useContext(AppContext);
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	// THIS IS FOR TESTING ONLY
	const handlePaneContextMenu = (event) => {
		event.preventDefault();
		const newNode = {
			id: `${nodes.length}`,
			type: "leadNode",
			position: { x: 0, y: 0 },
			data: { title: "New Node", nodeId: uuidv4() },
		};
		setNodes((nds) => nds.concat(newNode));
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

	return (
		<div className="dialogue-editor-canvas background-transparent-primary">
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
				onPaneContextMenu={handlePaneContextMenu}
				isValidConnection={isValidConnection}
				snapToGrid
				onReconnect={onReconnect}
				nodeTypes={nodeTypes}
				edgeTypes={edgeTypes}
				maxZoom={1.75}
				minZoom={0.25}
				fitView
			>
				<Controls />
			</ReactFlow>
		</div>
	);
};

export default DialogueEditorCanvas;
