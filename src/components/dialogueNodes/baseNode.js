import React, { useEffect, useState, useRef } from "react";
import { Handle, useReactFlow } from "reactflow";
import { Tooltip } from "react-tooltip"; // Import the Tooltip component

import Title from "../objects/Title";
import Button from "../objects/Button";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";

import "../../componentStyles/dialogueNodes/customNode.css";

const BaseNode = ({ id, data, selected }) => {
	const [nodeTitle, setNodeTitle] = useState(data.title);
	const [isDragging, setIsDragging] = useState(false);
	const nodeRef = useRef(null);
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

	useEffect(() => {
		const handleDragStart = () => {
			setIsDragging(true);
		};

		const handleDragEnd = () => {
			setIsDragging(false);
		};

		const parent = nodeRef.current?.parentElement;

		if (parent) {
			parent.addEventListener("dragstart", handleDragStart);
			parent.addEventListener("dragend", handleDragEnd);

			return () => {
				parent.removeEventListener("dragstart", handleDragStart);
				parent.removeEventListener("dragend", handleDragEnd);
			};
		}
	}, []);

	const handleDeleteNode = () => {
		setNodes((nds) => nds.filter((node) => node.id !== id));
		setEdges((eds) =>
			eds.filter((edge) => edge.source !== id && edge.target !== id)
		);
	};

	return (
		<div
			ref={nodeRef}
			className={`custom-node-border ${selected ? "highlight" : ""}`}
			data-tooltip-id={`tooltip-${id}`} // Add a unique id for the tooltip
			data-tooltip-content={`Node title: ${nodeTitle}`} // Add content for the tooltip
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
