import React from "react";
import BaseNode from "./baseNode";

const AnswerNode = (props) => {
	const nodeData = {
		...props.data,
		customClassName: "answer-node",
		title: "Answer Node",
		sourceHandle: true,
		targetHandle: true,
		additionalInfo: {
			participant: props.data.additionalInfo?.participant || "Player",
			dialogueRows: props.data.additionalInfo?.dialogueRows || [],
		},
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default AnswerNode;
