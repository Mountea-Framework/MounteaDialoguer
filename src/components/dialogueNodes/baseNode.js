import React from "react";
import { Handle, useReactFlow } from "reactflow";

import Title from "../objects/Title";
import Button from "../objects/Button";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";

import "../../componentStyles/dialogueNodes/customNode.css";

const BaseNode = ({ id, data, selected }) => {
	const {
		customClassName,
		title,
		targetHandle,
		sourceHandle,
		canDelete = true,
		canCreate = true,
		additionalInfo,
	} = data;
	const { setNodes, setEdges } = useReactFlow();

	const handleDeleteNode = () => {
		setNodes((nds) => nds.filter((node) => node.id !== id));
		setEdges((eds) =>
			eds.filter((edge) => edge.source !== id && edge.target !== id)
		);
	};

	return (
		<div className={`custom-node-border ${selected ? "highlight" : ""}`}>
			{canDelete && (
				<Button
					className="circle-button nodrag nopan node-button-delete"
					onClick={handleDeleteNode}
				>
					<RemoveIcon
						style={{
							pointerEvents: "none",
						}}
					/>
				</Button>
			)}
			<div className={`custom-node ${customClassName || ""}`}>
				<Title
					level="4"
					children={title || ""}
					className="tertiary-heading"
					classState={"tertiary"}
				/>
				{targetHandle && <Handle type="target" position="top" id="b" />}
				{sourceHandle && <Handle type="source" position="bottom" id="a" />}
			</div>
		</div>
	);
};

export default BaseNode;
