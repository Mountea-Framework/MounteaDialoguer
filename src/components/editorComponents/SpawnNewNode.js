import React from "react";

import Modal from "../objects/Modal";
import Button from "../objects/Button";

// Define the map of logical names and display names for the nodes
const spawnNodeTypesMap = {
	leadNode: { title: "Lead Node", displayTitle: "Lead Node" },
	answerNode: { title: "Answer Node", displayTitle: "Answer Node" },
	closeDialogueNode: { title: "Close Dialogue Node", displayTitle: "Close" },
	jumpToNode: { title: "Jump to node", displayTitle: "Jump To" },
};

const SpawnNewNode = ({ isOpen, onClose, nodeTypes, onSpawn }) => {
	const nodeTypeList = Object.keys(nodeTypes)
		.filter((key) => key !== "startNode" && spawnNodeTypesMap[key])
		.map((key) => ({
			name: key,
			displayName: spawnNodeTypesMap[key].title,
		}));

	const handleNodeTypeSelected = (nodeType) => {
		onSpawn(nodeType, spawnNodeTypesMap[nodeType].displayTitle);
	};

	return (
		isOpen && (
			<Modal
				onClose={onClose}
				className={"modal-spawn-node"}
				title="Create New Node"
			>
				<div className="spawn-new-node">
					{nodeTypeList.map((nodeType) => (
						<Button
							key={nodeType.name}
							onClick={() => handleNodeTypeSelected(nodeType.name)}
							className="spawn-button"
						>
							{nodeType.displayName}
						</Button>
					))}
				</div>
			</Modal>
		)
	);
};

export default SpawnNewNode;
