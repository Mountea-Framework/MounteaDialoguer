import React, { useState, useContext } from "react";

import Title from "./objects/Title";
import TextInput from "./objects/TextInput";
import Button from "./objects/Button";
import useAutoSave from "../hooks/useAutoSave";
import ParticipantCategories from "./ParticipantCategories";
import DialogueParticipants from "./DialogueParticipants";
import AppContext from "./../AppContext";

import "../componentStyles/NewProjectDetails.css";

function NewProjectDetails({ projectData, onReturn }) {
  const { categories, participants, setParticipants, setCategories } =
    useContext(AppContext);

  useAutoSave(categories, participants);

  const handleReturnClick = () => {
    localStorage.removeItem("autoSaveProject");
    setParticipants([]);
    setCategories([]);
    onReturn();
  };

  const handleCategoriesUpdate = (newCategories) => {
    setCategories(newCategories);
  };

  const handleParticipantsUpdate = (newParticipants) => {
    setParticipants(newParticipants);
  };

  return (
    <div className="new-project-details">
      <Title
        level="2"
        children="New Project details"
        className="secondary-heading"
      />
      <TextInput title="Dialogue Name" value={projectData.name} readOnly />
      <div className="scrollable-sections">
        <ParticipantCategories
          categories={categories}
          onUpdate={handleCategoriesUpdate}
        />
        <DialogueParticipants
          participants={participants}
          categories={categories}
          onUpdate={handleParticipantsUpdate}
        />
      </div>
      <div className="footer-buttons">
        <Button onClick={handleReturnClick}>return</Button>
        <Button onClick={() => console.log("Start project")}>continue</Button>
      </div>
    </div>
  );
}

export default NewProjectDetails;
