import React from "react";
import BaseNode from "./baseNode";

const CloseDialogueNode = (props) => {
	const nodeData = {
		...props.data,
		customClassName: "close-dialogue-node",
		title: "Close",
		sourceHandle: true,
		targetHandle: true,
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default CloseDialogueNode;
