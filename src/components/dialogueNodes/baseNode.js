import React, { useEffect, useState } from "react";
import { Handle, useReactFlow } from "reactflow";

import { v4 as uuidv4 } from "uuid";

import Title from "../objects/Title";
import Button from "../objects/Button";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";
import "../../componentStyles/dialogueNodes/customNode.css";

const BaseNode = ({ id, data }) => {
	const { customClassName, title, targetHandle, sourceHandle, canDelete = true  } = data;
	const [nodeId, setNodeId] = useState(data.nodeId || uuidv4());
	const { setNodes } = useReactFlow();

	useEffect(() => {
		if (!data.nodeId) {
			data.nodeId = nodeId;
		}
	}, [data, nodeId]);

	return (
		<div className="custom-node-border">
			{canDelete && (
				<Button
					className="circle-button nodrag nopan node-button-delete"
					onClick={() => {
						setNodes((nds) => nds.filter((node) => node.id !== id));
					}}
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
