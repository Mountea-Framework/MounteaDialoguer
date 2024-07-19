import React from "react";
import { Handle, NodeToolbar } from "reactflow";
import Title from "../objects/Title";

const StartNode = ({ data }) => {
  return (
    <>
      <div className="react-flow__node-default custom-node start-node">
        {}
        <Title>
          <Title
            level="4"
            children="Start Node"
            className="tertiary-heading"
            classState={"tertiary"}
          />
        </Title>
        <Handle type="source" position="bottom" id="a" />
      </div>
    </>
  );
};

export default StartNode;
