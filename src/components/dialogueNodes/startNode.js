import React from "react";
import BaseNode from "./baseNode";

const StartNode = (props) => {
	const nodeData = {
		...props.data,
		customClassName: "start-node",
		title: props.data.title || "Start Node",
		sourceHandle: true,
		canDelete: false,
		canCreate: false,
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default StartNode;
