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
            participant: "NPC",
            dialogueRows: [],
        },
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default LeadNode;
