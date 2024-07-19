import React from "react";

import Title from "../objects/Title";

const LeadNode = ({ data }) => {
  return (
    <div className="custom-node lead-node">
      <Title>
        <Title
          level="3"
          children="Lead Node"
          className="tertiary-heading"
          classState={"tertiary"}
        />
      </Title>
    </div>
  );
};

export default LeadNode;