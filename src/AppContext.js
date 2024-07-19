import React, { createContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showLandingPage, setShowLandingPage] = useState(true);

  const addCategory = (category) => {
    setCategories((prevCategories) => [...prevCategories, category]);
  };

  const deleteCategory = (categoryToDelete) => {
    const deleteRecursive = (categoryName) => {
      const children = categories.filter(
        (category) => category.parent === categoryName
      );
      children.forEach((child) => deleteRecursive(child.name));

      setCategories((prevCategories) =>
        prevCategories.filter((category) => category.name !== categoryName)
      );

      setParticipants((prevParticipants) =>
        prevParticipants.filter(
          (participant) =>
            participant.category !== categoryName &&
            !participant.category.startsWith(`${categoryName}.`)
        )
      );
    };

    deleteRecursive(categoryToDelete);
  };

  const deleteParticipant = (participantName, participantCategory) => {
    const updatedParticipants = participants.filter(
      (participant) =>
        participant.name !== participantName ||
        participant.category !== participantCategory
    );
    setParticipants(updatedParticipants);
  };

  return (
    <AppContext.Provider
      value={{
        categories,
        participants,
        addCategory,
        deleteCategory,
        deleteParticipant,
        setParticipants,
        setCategories,
        showLandingPage,
        setShowLandingPage,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
