import React, { useState, useCallback, useContext } from "react";
import ReactFlow, {
	useNodesState,
	useEdgesState,
	Controls,
	reconnectEdge,
	addEdge,
} from "reactflow";
import AppContext from "../../AppContext";
import useAutoSaveNodesAndEdges from "../../hooks/useAutoSaveNodesAndEdges";
import useAutoSave from "../../hooks/useAutoSave";

import "reactflow/dist/style.css";
import "../../componentStyles/editorComponentStyles/DialogueEditorCanvas.css";
import "../../base/BaseNodesStyle.css";

import StartNode from "../dialogueNodes/startNode";
import LeadNode from "../dialogueNodes/leadNode";
import AnswerNode from "../dialogueNodes/answerNode";
import CloseDialogueNode from "../dialogueNodes/closeDialogueNode";
import CloseDialogueAutomaticNode from "../dialogueNodes/closeDialogueAutomaticNode";
import JumpToNode from "../dialogueNodes/jumpToNode";

const nodeTypes = {
	startNode: StartNode,
	leadNode: LeadNode,
	answerNode: AnswerNode,
	closeDialogueNode: CloseDialogueNode,
	closeDialogueAutomaticNode: CloseDialogueAutomaticNode,
	jumpToNode: JumpToNode,
};

const initialNodes = [
	{
		id: "0",
		type: "startNode",
		position: { x: 250, y: 0 },
		data: { title: "Start Node", nodeId: "00000000-0000-0000-0000-000000000001" },
	}
];

const initialEdges = [];

const DialogueEditorCanvas = () => {
	const { name, categories, participants } = useContext(AppContext);
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	const onReconnect = useCallback(
		(oldEdge, newConnection) =>
			setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
		[]
	);
	const onConnect = useCallback(
		(params) => setEdges((els) => addEdge(params, els)),
		[]
	);

	useAutoSaveNodesAndEdges(nodes, edges);
	useAutoSave(name, categories, participants);

	return (
		<div className="dialogue-editor-canvas background-transparent-primary">
			<ReactFlow
				nodes={nodes}
				edges={edges}
				onNodesChange={onNodesChange}
				onEdgesChange={onEdgesChange}
				snapToGrid
				onReconnect={onReconnect}
				onConnect={onConnect}
				nodeTypes={nodeTypes}
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
