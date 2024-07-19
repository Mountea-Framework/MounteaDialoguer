import React from "react";

import Title from "../objects/Title";

const CloseDialogueNode = ({ data }) => {
  return (
    <div className="custom-node close-dialogue-node">
      <Title>
        <Title
          level="3"
          children="Close Dialogue"
          className="tertiary-heading"
          classState={"tertiary"}
        />
      </Title>
    </div>
  );
};

export default CloseDialogueNode;