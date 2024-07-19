import React from "react";

import { Handle, NodeToolbar } from "reactflow";
import Title from "../objects/Title";

const LeadNode = ({ data }) => {
  return (
    <>
      <div className="react-flow__node-default custom-node lead-node">
        {}
        
        <Title>
          <Title
            level="4"
            children="Lead Node"
            className="tertiary-heading"
            classState={"tertiary"}
          />
        </Title>
        <Handle type="target" position="top" id="b" />
        <Handle type="source" position="bottom" id="a" />
      </div>
    </>
  );
};

export default LeadNode;