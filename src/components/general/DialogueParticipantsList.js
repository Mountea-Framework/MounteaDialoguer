import React, { useContext } from "react";

import ScrollList from "../objects/ScrollList";
import EditParticipantItem from "../general/EditParticipantItem";
import AppContext from "../../AppContext";

function DialogueParticipantsList() {
  const { participants, deleteParticipant, editParticipant } =
    useContext(AppContext);

  const handleDeleteParticipant = (participant) => {
    const [participantName, participantCategory] = participant.split(" - ");
    deleteParticipant(participantName, participantCategory);
  };

  const handleEditParticipant = (editedParticipant, originalParticipant) => {
    editParticipant(editedParticipant, originalParticipant);
  };

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={participants.map((p) => `${p.name} - ${p.category}`)}
        onIconClick={handleDeleteParticipant}
        onEdit={handleEditParticipant}
        EditComponent={EditParticipantItem}
      />
    </div>
  );
}

export default DialogueParticipantsList;
