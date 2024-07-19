import React from "react";
import BaseNode from "./baseNode";

const answerNode = ({ data }) => {
  const nodeData = {
    customClassName: " answer-node",
    title: "Answer Node",
    sourceHandle: true,
    targetHandle: true,
  };

  return (
    <BaseNode data={nodeData} />
  );
};

export default answerNode;
