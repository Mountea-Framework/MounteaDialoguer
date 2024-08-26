import React, { useEffect, useState, useRef, useCallback } from "react";
import { Handle, useReactFlow } from "reactflow";
import { Tooltip } from "react-tooltip";
import { useKeyPress } from "@reactflow/core";
import { getDB } from "../../indexedDB";

import Title from "../objects/Title";
import Button from "../objects/Button";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";

import "../../componentStyles/dialogueNodes/customNode.css";

const BaseNode = ({ id, data, selected }) => {
	
	const nodeRef = useRef(null);
	const {
		customClassName,
		targetHandle,
		sourceHandle,
		canDelete = true,
		isDragging,
		version,
	} = data;
	const [nodeTitle, setNodeTitle] = useState(data.title);
	const { setNodes, setEdges } = useReactFlow();
	const deleteKeyPressed = useKeyPress("Delete");

	const handleDeleteNode = useCallback(() => {
		if (canDelete) {
			setNodes((nds) => nds.filter((node) => node.id !== id));
			setEdges((eds) =>
				eds.filter((edge) => edge.source !== id && edge.target !== id)
			);
			return true;
		}
		return false;
	}, [canDelete, id, setNodes, setEdges]);

	useEffect(() => {
		setNodeTitle(data.title);
	}, [data.title, version]);

	useEffect(() => {
		if (deleteKeyPressed && selected && canDelete) {
			handleDeleteNode();
		}
	}, [deleteKeyPressed, selected, canDelete, handleDeleteNode]);

	useEffect(() => {
		const updateNodeFromIndexedDB = async () => {
			const db = await getDB();
			const tx = db.transaction("projects", "readonly");
			const guid = sessionStorage.getItem("project-guid");
			const project = await tx.objectStore("projects").get(guid);

			const updatedNode = project.nodes.find((node) => node.id === id);
			if (updatedNode && updatedNode.data.title !== nodeTitle) {
				setNodeTitle(updatedNode.data.title);
			}
		};

		updateNodeFromIndexedDB();
	}, [id, nodeTitle]);

	const handleDeleteButtonClick = (event) => {
		event.stopPropagation();
		handleDeleteNode();
	};

	return (
		<div
			ref={nodeRef}
			className={`custom-node-border ${selected ? "highlight" : ""}`}
			data-tooltip-id={`tooltip-${id}`}
			data-tooltip-content={`Node title: ${nodeTitle}`}
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

export default React.memo(BaseNode);
