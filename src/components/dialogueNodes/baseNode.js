import React, { useEffect, useState } from "react";
import { Handle, useReactFlow } from "reactflow";
import { Tooltip } from "react-tooltip"; // Import the Tooltip component

import Title from "../objects/Title";
import Button from "../objects/Button";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";

import "../../componentStyles/dialogueNodes/customNode.css";

const BaseNode = ({ id, data, selected }) => {
	const [nodeTitle, setNodeTitle] = useState(data.title);
	const {
		customClassName,
		targetHandle,
		sourceHandle,
		canDelete = true,
		canCreate = true,
		additionalInfo,
	} = data;
	const { setNodes, setEdges } = useReactFlow();

	useEffect(() => {
		setNodeTitle(data.title);
	}, [data.title]);

	const handleDeleteNode = () => {
		setNodes((nds) => nds.filter((node) => node.id !== id));
		setEdges((eds) =>
			eds.filter((edge) => edge.source !== id && edge.target !== id)
		);
	};

	return (
		<div>
			<div
				className={`custom-node-border ${selected ? "highlight" : ""}`}
				data-tooltip-id={`tooltip-${id}`} // Add a unique id for the tooltip
				data-tooltip-content={`Node title: ${nodeTitle}`}
			>
				{canDelete && (
					<Button
						className="circle-button nodrag nopan node-button-delete"
						onClick={handleDeleteNode}
					>
						<RemoveIcon style={{ pointerEvents: "none" }} />
					</Button>
				)}
				<div className={`custom-node ${customClassName || ""}`}>
					<Title
						level="4"
						children={nodeTitle || ""}
						className="tertiary-heading"
						classState={"tertiary"}
						maxLength={12}
					/>
					{targetHandle && <Handle type="target" position="top" id="b" />}
					{sourceHandle && <Handle type="source" position="bottom" id="a" />}
				</div>
			</div>
			<Tooltip id={`tooltip-${id}`} place="top" type="dark" effect="float" delayShow={600}/>
		</div>
	);
};

export default BaseNode;
