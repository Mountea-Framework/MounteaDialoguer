import React from "react";

import { Handle } from "reactflow";
import Title from "../objects/Title";

const BaseNode = ({ data }) => {
  const { customClassName, title, targetHandle, sourceHandle } = data;

  return (
    <div className="custom-node-border">
      <div className={`custom-node ${customClassName || ""}`}>
        <Title
          level="4"
          children={title || ""}
          className="tertiary-heading"
          classState={"tertiary"}
        />
        {targetHandle && <Handle type="target" position="top" id="b" />}
        {sourceHandle && <Handle type="source" position="bottom" id="a" />}
      </div>
    </div>
  );
};

export default BaseNode;
