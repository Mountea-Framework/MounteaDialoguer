import React, { useState, useEffect } from "react";

import Title from "./objects/Title";
import TextInput from "./objects/TextInput";
import Button from "./objects/Button";
import useAutoSave from "../hooks/useAutoSave";
import ParticipantCategories from "./ParticipantCategories";
import DialogueParticipants from "./DialogueParticipants"

import "../componentStyles/NewProjectDetails.css";

function NewProjectDetails({
  projectData,
  onReturn,
  setParticipants,
  setCategories,
}) {
  const [data, setData] = useState(() => {
    const savedData = localStorage.getItem("autoSaveProject");
    return savedData ? JSON.parse(savedData) : projectData;
  });

  useAutoSave(data);

  const handleProjectUpdate = (newData) => {
    setData((prevData) => ({ ...prevData, ...newData }));
  };

  const handleReturnClick = () => {
    localStorage.removeItem("autoSaveProject");
    setParticipants([]);
    setCategories([]);
    onReturn();
  };

  const handleCategoriesUpdate = (categories) => {
    setCategories(categories);
    handleProjectUpdate({ categories });
  };

  return (
    <div className="new-project-details">
      <Title level="2" children="New Project details" className="secondary-headign"/>
      <TextInput title="Dialogue Name" value={data.name} readOnly />
      <div className="scrollable-sections">
        <ParticipantCategories
          categories={data.categories}
          onUpdate={handleCategoriesUpdate}
        />
        <DialogueParticipants
          participants={data.participants}
          categories={data.categories}
          onUpdate={handleProjectUpdate}
        />
      </div>
      <div className="footer-buttons">
        <Button onClick={handleReturnClick}>Return</Button>
        <Button onClick={() => console.log("Start project")}>Start</Button>
      </div>
    </div>
  );
}

export default NewProjectDetails;
