import React, { useContext } from "react";
import ScrollList from "../objects/ScrollList";
import EditParticipantItem from "../general/EditParticipantItem";
import AppContext from "../../AppContext";

function DialogueParticipantsList() {
  const { participants, deleteParticipant, editParticipant } =
    useContext(AppContext);

  const handleDeleteParticipant = (participant) => {
    deleteParticipant(participant);
  };

  const handleEditParticipant = (editedParticipant, originalParticipant) => {
    editParticipant(editedParticipant, originalParticipant);
  };

  const combinedParticipants = participants.map((participant) => ({
    ...participant,
    displayName: `${participant.name}${
      participant.category ? ` - ${participant.category}` : ""
    }`,
  }));

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={combinedParticipants}
        onIconClick={handleDeleteParticipant}
        onEdit={handleEditParticipant}
        EditComponent={EditParticipantItem}
      />
    </div>
  );
}

export default DialogueParticipantsList;
