import React, { useContext } from "react";

import ScrollList from "../objects/ScrollList";
import AppContext from "../../AppContext";

function DialogueParticipantsList() {
  const { participants, deleteParticipant } = useContext(AppContext);

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={participants.map((p) => `${p.name} - ${p.category}`)}
        onIconClick={deleteParticipant}
      />
    </div>
  );
}

export default DialogueParticipantsList;
