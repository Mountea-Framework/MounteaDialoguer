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

  const handleInputChange = (name, value) => {
    setNewParticipant((prev) => ({ ...prev, [name]: value }));
  };

  const categoryOptions = categories.map((category) => ({
    value: category.parent
      ? `${category.parent}.${category.name}`
      : category.name,
    label: category.parent
      ? `${category.parent}.${category.name}`
      : category.name,
  }));

  return (
    <div>
      <Title
        level="3"
        children="Dialogue Participants"
        className="tertiary-heading"
      />
      <div className="input-button-row">
        <TextInput
          placeholder="New Participant"
          title="Participant Name"
          name="name"
          value={newParticipant.name}
          onChange={handleInputChange}
        />
        <Dropdown
          name="category"
          value={newParticipant.category}
          onChange={handleInputChange}
          options={categoryOptions}
          placeholder="select category"
        />
        <Button
          className="circle-button"
          onClick={handleAddParticipant}
          disabled={!newParticipant.name || !newParticipant.category}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export default DialogueParticipantsHeader;
