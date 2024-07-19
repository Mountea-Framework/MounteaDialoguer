import React from "react";
import BaseNode from "./baseNode";

const LeadNode = ({ data }) => {
  const nodeData = {
    customClassName: "lead-node",
    title: "Lead Node",
    sourceHandle: true,
    targetHandle: true,
  };

  return (
    <BaseNode data={nodeData} />
  );
};

export default LeadNode;
