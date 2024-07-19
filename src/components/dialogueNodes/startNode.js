import React from "react";
import BaseNode from "./baseNode";

const StartNode = ({ data }) => {
  const nodeData = {
    customClassName: "start-node",
    title: "Start Node",
    sourceHandle: true,
  };

  return (
    <BaseNode data={nodeData} />
  );
};

export default StartNode;
