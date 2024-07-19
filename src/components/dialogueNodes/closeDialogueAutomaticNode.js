import React from "react";
import BaseNode from "./baseNode";

const CloseDialogueAutomaticNode = ({ data }) => {
  const nodeData = {
    customClassName: "close-dialogue-automatic-node",
    title: "Auto Close",
    targetHandle: true,
  };

  return (
    <BaseNode data={nodeData} />
  );
};

export default CloseDialogueAutomaticNode;
