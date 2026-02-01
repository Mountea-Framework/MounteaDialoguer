import React from "react";

import { useNodesState, useEdgesState } from "@xyflow/react";

import DialogueEditorTooblar from "./editorComponents/DialogueEditorToolbar";
import DialogueEditorDetails from "./editorComponents/DialogueEditorDetails";
import DialogueEditorCanvas from "./editorComponents/DialogueEditorCanvas";

import Title from "./objects/Title";

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

function DialogueEditor({ projectData }) {
	const safeProjectData = projectData || {
		name: "Untitled Project",
		nodes: initialNodes,
		edges: initialEdges,
	};

	const [nodes, setNodes, onNodesChange] = useNodesState(
		projectData?.nodes || initialNodes
	);
	const [edges, setEdges, onEdgesChange] = useEdgesState(
		projectData?.edges || initialEdges
	);

	return (
		<div className="dialogue-editor">
			<div className="dialogue-editor-toolbar-wrapper">
				<DialogueEditorTooblar />
				<abbr className="dialogue-editor-toolbar-spacer background-secondary" title="Project Title">
					<Title
						level="2"
						className="secondary-heading project-title"
						children={
							safeProjectData.name || safeProjectData.dialogueName || "Untitled"
						}
					/>
				</abbr>
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
