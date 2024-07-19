import React, { useContext } from "react";

import ScrollList from "../objects/ScrollList";
import AppContext from "../../AppContext";

function DialogueParticipantsList() {
  const { participants, deleteParticipant } = useContext(AppContext);

  const handleDeleteParticipant = (participant) => {
    console.log("Deleting participant:", participant);
    const [participantName, participantCategory] = participant.split(" - ");
    console.log("Deleting participant:", participantName, participantCategory);
    deleteParticipant(participantName, participantCategory);
  };

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={participants.map((p) => `${p.name} - ${p.category}`)}
        onIconClick={handleDeleteParticipant}
      />
    </div>
  );
}

export default DialogueParticipantsList;
