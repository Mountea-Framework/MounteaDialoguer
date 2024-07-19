import React from "react";

import ScrollList from "./../objects/ScrollList";

function DialogueParticipantsList({ participants }) {
  return (
    <ScrollList
      classState="none"
      classStateItems="none"
      items={participants.map((participant) => participant.name)}
    />
  );
}

export default DialogueParticipantsList;
