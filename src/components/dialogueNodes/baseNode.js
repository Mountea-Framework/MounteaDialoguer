import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Handle } from "reactflow";
import Title from "../objects/Title";

const BaseNode = ({ data }) => {
	const { customClassName, title, targetHandle, sourceHandle } = data;
	const [nodeId, setNodeId] = useState(data.nodeId || uuidv4());

	useEffect(() => {
		if (!data.nodeId) {
			data.nodeId = nodeId;
		}
	}, [data, nodeId]);

	return (
		<div className="custom-node-border">
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
