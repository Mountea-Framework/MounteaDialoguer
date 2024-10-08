import React from "react";
import BaseNode from "./baseNode";

const LeadNode = (props) => {
	const nodeData = {
		...props.data,
		customClassName: "lead-node",
		title: "Lead Node",
		sourceHandle: true,
		targetHandle: true,
		additionalInfo: {
			participant: props.data.additionalInfo?.participant || "NPC",
			dialogueRows: props.data.additionalInfo?.dialogueRows || [],
			displayName: props.data.additionalInfo?.displayName || "Selectable NPC Node",
		},
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default LeadNode;
