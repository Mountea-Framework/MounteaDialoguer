import React from "react";

import Title from "../objects/Title";

const CloseDialogueAutomaticNode = ({ data }) => {
  return (
    <div className="custom-node close-dialogue-node-automatic">
      <Title>
        <Title
          level="3"
          children="Close Dialogue Auto"
          className="tertiary-heading"
          classState={"tertiary"}
        />
      </Title>
    </div>
  );
};

export default CloseDialogueAutomaticNode;