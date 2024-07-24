import React from "react";
import Modal from "../objects/Modal";
import Button from "../objects/Button";

const SpawnNewNode = ({
	isOpen,
	onClose,
	nodeTypes,
	onSpawn,
	canvasTransform,
}) => {
	const nodeTypeList = Object.keys(nodeTypes).map((key) => ({
		name: key,
	}));

	const transformStyle = {
		transform: `translate(${canvasTransform[0] / 2}px, ${
			canvasTransform[1] / 2
		}px) scale(${canvasTransform[2]})`,
	};

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
