import React from "react";
import BaseNode from "./baseNode";

const CloseDialogueAutomaticNode = (props) => {
	const nodeData = {
		...props.data,
		customClassName: "close-dialogue-automatic-node",
		title: "Auto Close",
		targetHandle: true,
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default CloseDialogueAutomaticNode;
