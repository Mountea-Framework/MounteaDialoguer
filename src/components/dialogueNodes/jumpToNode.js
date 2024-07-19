import React from "react";

import Title from "../objects/Title";

const JumpToNode = ({ data }) => {
  return (
    <div className="custom-node jump-to-node">
      <Title>
        <Title
          level="3"
          children="Jump to Node"
          className="tertiary-heading"
          classState={"tertiary"}
        />
      </Title>
    </div>
  );
};

export default JumpToNode;