import React, { useEffect, useState, useRef } from "react";
import { Handle, useReactFlow } from "reactflow";
import { Tooltip } from "react-tooltip";

import Title from "../objects/Title";
import Button from "../objects/Button";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";

import "../../componentStyles/dialogueNodes/customNode.css";

const BaseNode = ({ id, data, selected }) => {
	const [nodeTitle, setNodeTitle] = useState(data.title);
	const nodeRef = useRef(null);
	const {
		customClassName,
		targetHandle,
		sourceHandle,
		canDelete = true,
		canCreate = true,
		additionalInfo,
		isDragging,
	} = data;
	const { setNodes, setEdges } = useReactFlow();

	console.log(canCreate);
	console.log(additionalInfo);

	useEffect(() => {
		setNodeTitle(data.title);
	}, [data.title]);

	const handleDeleteButtonClick = (event) => {
		event.stopPropagation(); // Prevent the click event from bubbling up
		handleDeleteNode();
	};

	const handleDeleteNode = () => {
		setNodes((nds) => nds.filter((node) => node.id !== id));
		setEdges((eds) =>
			eds.filter((edge) => edge.source !== id && edge.target !== id)
		);
		data.onDeleteNode(id);
	};

	return (
		<div
			ref={nodeRef}
			className={`custom-node-border ${selected ? "highlight" : ""}`}
			data-tooltip-id={`tooltip-${id}`} // Add a unique id for the tooltip
			data-tooltip-content={`Node title: ${data.title}`} // Add content for the tooltip
		>
			{canDelete && (
				<Button
					abbrTitle={"Delete selected Node"}
					className="circle-button nodrag nopan node-button-delete"
					onClick={handleDeleteButtonClick}
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
			{!isDragging && (
				<Tooltip
					id={`tooltip-${id}`}
					place="top"
					type="dark"
					effect="float"
					delayShow={600}
				/>
			)}
		</div>
	);
};

export default BaseNode;
