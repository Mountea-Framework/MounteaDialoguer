import React from "react";
import BaseNode from "./baseNode";

const JumpToNode = (props) => {
	const nodeData = {
		...props.data,
		customClassName: "jump-to-node",
		title: "Jump to",
		targetHandle: true,
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default JumpToNode;
