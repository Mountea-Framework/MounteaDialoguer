import React from "react";

import Modal from "../objects/Modal";
import Button from "../objects/Button";

// Define the map of logical names and display names for the nodes
const spawnNodeTypesMap = {
	leadNode: "Lead Node",
	answerNode: "Answer Node",
	closeDialogueNode: "Close Dialogue Node",
	jumpToNode: "Jump To Node",
};

const SpawnNewNode = ({ isOpen, onClose, nodeTypes, onSpawn }) => {
	const nodeTypeList = Object.keys(nodeTypes)
		.filter((key) => key !== "startNode" && spawnNodeTypesMap[key])
		.map((key) => ({
			name: key,
			displayName: spawnNodeTypesMap[key],
		}));

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
							onClick={() => onSpawn(nodeType.name)}
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
