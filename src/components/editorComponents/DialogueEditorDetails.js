import React from "react";

import { useSelection } from "../../contexts/SelectionContext";

import Title from "../objects/Title";
import TextInput from "../objects/TextInput";
import ReadOnlyText from "../objects/ReadOnlyText";

import "../../componentStyles/editorComponentStyles/DialogueEditorDetails.css";

function DialogueEditorDetails({ setNodes }) {
	const { selectedNode } = useSelection();

	const handleInputChange = (name, value) => {
		if (selectedNode) {
			setNodes((nds) =>
				nds.map((node) =>
					node.id === selectedNode.id
						? { ...node, data: { ...node.data, title: value } }
						: node
				)
			);
		}
	};

	return (
		<div className="dialogue-editor-details background-secondary">
			<Title
				level="3"
				children="Details"
				className="tertiary-heading"
				classState={"tertiary"}
			/>
			<div className="node-details">
				{selectedNode ? (
					<div className="node-details-generic">
						<div className="node-details-c1">
							<Title
								level="4"
								children="Node Title"
								className="tertiary-heading"
								classState={"tertiary"}
							/>
							<div />
							<Title
								level="4"
								children="Node Info"
								className="tertiary-heading"
								classState={"tertiary"}
							/>
						</div>
						<div className="node-details-c2">
							<TextInput
								title="Node Title"
								placeholder={selectedNode.data.title}
								name="nodeTitle"
								value={selectedNode.data.title}
								onChange={(name, value) => handleInputChange(name, value)}
								maxLength={32}
							/>
						</div>
					</div>
				) : (
					<ReadOnlyText value={"No node selected"} />
				)}
			</div>
		</div>
	);
}

export default DialogueEditorDetails;
