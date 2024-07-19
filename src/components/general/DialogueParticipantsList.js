import React from "react";

import ScrollList from "./../objects/ScrollList";

function DialogueParticipantsList({ participants, categories, onUpdate }) {
  const handleSelectParticipant = (participant) => {
    // Implement any logic when a participant is selected
  };

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={participants.map((p) => `${p.name} - ${p.category}`)}
        onSelect={handleSelectParticipant}
      />
    </div>
  );
}

export default DialogueParticipantsList;
