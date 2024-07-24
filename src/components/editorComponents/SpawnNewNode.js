import React from "react";

import Modal from "../objects/Modal";
import Button from "../objects/Button";

const SpawnNewNode = ({ isOpen, onClose, nodeTypes, onSpawn }) => {
	const nodeTypeList = Object.keys(nodeTypes)
		.filter((key) => nodeTypes[key].canCreate)
		.map((key) => ({
			name: key,
		}));

	return (
		isOpen && (
			<Modal onClose={onClose} title="Create New Node">
				<div className="spawn-new-node">
					{nodeTypeList.map((nodeType) => (
						<Button
							key={nodeType.name}
							onClick={() => onSpawn(nodeType.name)}
							className="spawn-button"
						>
							{nodeType.name}
						</Button>
					))}
				</div>
			</Modal>
		)
	);
};

export default SpawnNewNode;
