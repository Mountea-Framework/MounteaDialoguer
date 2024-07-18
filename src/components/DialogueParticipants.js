import React, { useContext, useState } from "react";

import AppContext from "./../AppContext";
import Title from "./objects/Title";
import TextInput from "./objects/TextInput";
import Button from "./objects/Button";
import Dropdown from "./objects/Dropdown";
import ScrollList from "./objects/ScrollList";

import "../componentStyles/DialogueParticipants.css";

function DialogueParticipants({ onUpdate }) {
  const { categories, participants, setParticipants } = useContext(AppContext);
  const [newParticipant, setNewParticipant] = useState({
    name: "",
    category: "",
  });

  const handleAddParticipant = () => {
    if (newParticipant.name && newParticipant.category) {
      const updatedParticipants = [...participants, newParticipant];
      setParticipants(updatedParticipants);
      setNewParticipant({ name: "", category: "" });
    }
  };

  const handleInputChange = (name, value) => {
    setNewParticipant((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectParticipant = (participant) => {
    // Implement any logic when a participant is selected
  };

  const handleIconClick = (item) => {
    const updatedParticipants = participants.filter(
      (participant) => `${participant.name} - ${participant.category}` !== item
    );
    setParticipants(updatedParticipants);
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
    <div className="dialogue-participants-container scrollable-section">
      <Title
        level="3"
        children="Dialogue Participants"
        className="tertiary-headign"
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
          disabled={
            newParticipant.name.length === 0 ||
            newParticipant.category.length === 0
          }
        >
          +
        </Button>
      </div>
      <div className="scroll-container">
        <ScrollList
          classState={"Aaa"}
          classStateItems={"Aaa"}
          items={participants.map((p) => `${p.name} - ${p.category}`)}
          onSelect={handleSelectParticipant}
          onIconClick={handleIconClick}
        />
      </div>
    </div>
  );
}

export default DialogueParticipants;
