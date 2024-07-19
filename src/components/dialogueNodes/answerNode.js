import React from "react";

import Title from "../objects/Title";

const AnswearNode = ({ data }) => {
  return (
    <div className="custom-node answear-node">
      <Title>
        <Title
          level="3"
          children="Answear Node"
          className="tertiary-heading"
          classState={"tertiary"}
        />
      </Title>
    </div>
  );
};

export default AnswearNode;