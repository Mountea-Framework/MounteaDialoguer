import React, { useState, useContext } from "react";

import Title from "./objects/Title";
import TextInput from "./objects/TextInput";
import Button from "./objects/Button";
import useAutoSave from "../hooks/useAutoSave";
import ParticipantCategoriesHeader from "./general/ParticipantCategorierHeader";
import ParticipantCategoriesList from "./general/ParticipantCategoriesList";
import DialogueParticipantsHeader from "./general/DialogueParticipantsHeader";
import DialogueParticipantsList from "./general/DialogueParticipantsList";
import AppContext from "./../AppContext";

import "../componentStyles/NewProjectDetails.css";

function NewProjectDetails({ projectData, onReturn }) {
  const {
    categories,
    participants,
    setParticipants,
    setCategories,
    setShowLandingPage,
  } = useContext(AppContext);

  useAutoSave(projectData.name, categories, participants);

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

  const handleContinueClick = () => {
    setShowLandingPage(false);
  };

  return (
    <div className="new-project-details">
      <Title
        level="2"
        children="New Project details"
        className="secondary-heading"
      />
      <TextInput title="Dialogue Name" value={projectData.name} readOnly />
      <div className="headers">
        <div className="scrollable-sections-header">
          <ParticipantCategoriesHeader
            categories={categories}
            onUpdate={handleCategoriesUpdate}
          />
        </div>
        <div className="scrollable-sections-header">
          <DialogueParticipantsHeader
            participants={participants}
            categories={categories}
            onUpdate={handleParticipantsUpdate}
          />
        </div>
      </div>
      <div className="lists">
        <div className="scrollable-sections">
          <ParticipantCategoriesList categories={categories} />
        </div>

        <div className="scrollable-sections">
          <DialogueParticipantsList participants={participants} />
        </div>
      </div>
      <div className="footer-buttons">
        <Button onClick={handleReturnClick}>return</Button>
        <Button onClick={handleContinueClick}>continue</Button>
      </div>
    </div>
  );
}

export default NewProjectDetails;
