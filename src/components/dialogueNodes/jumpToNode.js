import React from "react";
import BaseNode from "./baseNode";

const JumpToNode = ({ data }) => {
  const nodeData = {
    customClassName: "jump-to-node",
    title: "Jump to",
    targetHandle: true,
  };

  return (
    <BaseNode data={nodeData} />
  );
};

export default JumpToNode;
