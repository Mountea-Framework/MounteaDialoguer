import React from "react";
import BaseNode from "./baseNode";

const CloseDialogueNode = (props) => {
	const nodeData = {
		...props.data,
		customClassName: "close-dialogue-node",
		title: "Close",
		targetHandle: true,
		additionalInfo: {
			participant: props.data.additionalInfo?.participant || "Player",
			dialogueRows: props.data.additionalInfo?.dialogueRows || [],
			displayName: props.data.additionalInfo?.displayName || "Selectable Close Node",
		},
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default CloseDialogueNode;
