import React, { useState } from "react";

import TextInput from "./../objects/TextInput";
import Dropdown from "./../objects/Dropdown";
import Button from "./../objects/Button";
import Title from "../objects/Title";

function DialogueParticipantsHeader({ participants, categories, onUpdate }) {
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    category: "",
  });

  const handleAddParticipant = () => {
    if (newParticipant.name && newParticipant.category) {
      const updatedParticipants = [...participants, newParticipant];
      onUpdate(updatedParticipants);
      setNewParticipant({ name: "", category: "" });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewParticipant((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <Title
        level="3"
        children="Dialogue Participants"
        className="tertiary-heading"
      />
      <div className="input-button-row">
        <TextInput
          title="New Participant"
          name="name"
          value={newParticipant.name}
          onChange={handleInputChange}
        />
        <Dropdown
          title="Category"
          name="category"
          value={newParticipant.category}
          onChange={handleInputChange}
          options={categories.map((category) => ({
            label: category.name,
            value: category.name,
          }))}
        />
        <Button className="circle-button" onClick={handleAddParticipant}>
          +
        </Button>
      </div>
    </div>
  );
}

export default DialogueParticipantsHeader;
