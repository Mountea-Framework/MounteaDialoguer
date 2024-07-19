import React from "react";
import BaseNode from "./baseNode";

const CloseDialogueNode = ({ data }) => {
  const nodeData = {
    customClassName: "close-dialogue-node",
    title: "Close",
    targetHandle: true,
  };

  return (
    <BaseNode data={nodeData} />
  );
};

export default CloseDialogueNode;
