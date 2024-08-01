import React from "react";

import { useSelection } from "../../contexts/SelectionContext";

import Title from "../objects/Title";

import "../../componentStyles/editorComponentStyles/DialogueEditorDetails.css";

function DialogueEditorDetails() {
	const { selectedNode } = useSelection();

	return (
		<div className="dialogue-editor-details background-secondary">
			<Title
				level="3"
				children="Details"
				className="tertiary-heading"
				classState={"tertiary"}
			/>
			<div>
				{selectedNode ? (
					<div>
						<p>
							<strong>Node ID:</strong> {selectedNode.id}
						</p>
						<p>
							<strong>Node Title:</strong> {selectedNode.data.title}
						</p>
						<p>
							<strong>Additional Info:</strong>{" "}
							{JSON.stringify(selectedNode.data.additionalInfo)}
						</p>
					</div>
				) : (
					<p>No node selected</p>
				)}
			</div>
		</div>
	);
}

export default DialogueEditorDetails;
