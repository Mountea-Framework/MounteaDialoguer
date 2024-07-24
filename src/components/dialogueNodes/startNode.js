import React from "react";
import BaseNode from "./baseNode";

const StartNode = (props) => {
	const nodeData = {
		...props.data,
		customClassName: "start-node",
		title: "Start Node",
		sourceHandle: true,
	};

	return <BaseNode {...props} data={nodeData} />;
};

export default StartNode;
