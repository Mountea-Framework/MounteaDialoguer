import React, { useState } from "react";

import { useNodesState, useEdgesState } from "reactflow";

import DialogueEditorTooblar from "./editorComponents/DialogueEditorToolbar";
import DialogueEditorDetails from "./editorComponents/DialogueEditorDetails";
import DialogueEditorCanvas from "./editorComponents/DialogueEditorCanvas";

import "../componentStyles/DialogueEditor.css";

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

function DialogueEditor() {
	const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
	const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

	return (
		<div className="dialogue-editor">
			<div className="dialogue-editor-toolbar-wrapper">
				<DialogueEditorTooblar />
				<div className="dialogue-editor-toolbar-spacer background-secondary"></div>
			</div>
			<div className="dialogue-editor-board">
				<DialogueEditorCanvas
					nodes={nodes}
					edges={edges}
					setNodes={setNodes}
					setEdges={setEdges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
				/>
				<DialogueEditorDetails setNodes={setNodes} />
			</div>
		</div>
	);
}

export default DialogueEditor;
