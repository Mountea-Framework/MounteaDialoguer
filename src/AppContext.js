import React, { createContext, useState, useEffect } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [categories, setCategories] = useState([
    { name: "Player", parent: "" },
    { name: "NPC", parent: "" },
  ]);
  const [participants, setParticipants] = useState([]);

  const addCategory = (category) => {
    setCategories((prevCategories) => [...prevCategories, category]);
  };

  const deleteCategory = (categoryToDelete) => {
    console.log(`Deleting category: ${categoryToDelete}`);
    const updatedCategories = categories.filter((category) => {
      const categoryFullName = category.parent
        ? `${category.parent}.${category.name}`
        : category.name;
      return categoryFullName !== categoryToDelete;
    });
    setCategories(updatedCategories);

    const updatedParticipants = participants.filter(
      (participant) => participant.category !== categoryToDelete
    );
    setParticipants(updatedParticipants);
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
        setParticipants,
        setCategories,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
