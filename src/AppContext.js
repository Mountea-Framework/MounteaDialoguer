import React, { createContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [categories, setCategories] = useState([
    { name: "Player", parent: "" },
    { name: "NPC", parent: "" },
  ]);
  const [participants, setParticipants] = useState([]);
  const [showLandingPage, setShowLandingPage] = useState(true);

  const addCategory = (category) => {
    setCategories((prevCategories) => [...prevCategories, category]);
  };

  const deleteCategory = (categoryToDelete) => {
    const deleteRecursive = (categoryName) => {
      // Find and delete child categories recursively
      const children = categories.filter(
        (category) => category.parent === categoryName
      );
      children.forEach((child) => deleteRecursive(child.name));

      // Construct the full name of the category
      const categoryFullName = categories.find(
        (category) => category.name === categoryName
      ).parent
        ? `${
            categories.find((category) => category.name === categoryName).parent
          }.${categoryName}`
        : categoryName;

      // Delete the category
      setCategories((prevCategories) =>
        prevCategories.filter((category) => category.name !== categoryName)
      );

      // Delete participants belonging to the category and its subcategories
      setParticipants((prevParticipants) =>
        prevParticipants.filter(
          (participant) =>
            participant.category !== categoryFullName &&
            !participant.category.startsWith(`${categoryFullName}.`)
        )
      );
    };

    deleteRecursive(categoryToDelete);
  };

  const deleteParticipant = (participantName) => {
    setParticipants((prevParticipants) =>
      prevParticipants.filter(
        (participant) => participant.name !== participantName
      )
    );
  };

  const projectData = {
    categories,
    participants,
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
