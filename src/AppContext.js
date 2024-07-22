import React, { createContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [categories, setCategories] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [showLandingPage, setShowLandingPage] = useState(true);

  const addCategory = (newCategory) => {
    const duplicateCategory = categories.find(
      (category) =>
        category.name === newCategory.name &&
        category.parent === newCategory.parent
    );
    if (!duplicateCategory) {
      setCategories((prevCategories) => [...prevCategories, newCategory]);
    } else {
      console.log(
        `Category with name "${newCategory.name}" and parent "${newCategory.parent}" already exists.`
      );
    }
  };

  const deleteCategory = (categoryToDeleteName, categoryToDeleteParent) => {
    const deleteRecursive = (categoryName, categoryParent) => {
      const children = categories.filter(
        (category) => category.parent === `${categoryParent}.${categoryName}`
      );
      children.forEach((child) =>
        deleteRecursive(child.name, `${categoryParent}.${categoryName}`)
      );

      setCategories((prevCategories) =>
        prevCategories.filter(
          (category) =>
            !(
              category.name === categoryName &&
              category.parent === categoryParent
            )
        )
      );

      setParticipants((prevParticipants) =>
        prevParticipants.filter(
          (participant) =>
            participant.category !== `${categoryParent}.${categoryName}` &&
            !participant.category.startsWith(
              `${categoryParent}.${categoryName}.`
            )
        )
      );
    };

    deleteRecursive(categoryToDeleteName, categoryToDeleteParent);
  };

  const deleteParticipant = (participantName, participantCategory) => {
    const updatedParticipants = participants.filter(
      (participant) =>
        participant.name !== participantName ||
        participant.category !== participantCategory
    );
    setParticipants(updatedParticipants);
  };

  const editCategory = (editedCategory, originalCategory) => {
    // Deduplicate participants
    const updatedParticipants = participants.map((participant) => {
      if (
        participant.category ===
        `${originalCategory.parent}.${originalCategory.name}`
      ) {
        return {
          ...participant,
          category: `${editedCategory.parent}.${editedCategory.name}`,
        };
      }
      if (
        participant.category.startsWith(
          `${originalCategory.parent}.${originalCategory.name}.`
        )
      ) {
        return {
          ...participant,
          category: participant.category.replace(
            `${originalCategory.parent}.${originalCategory.name}.`,
            `${editedCategory.parent}.${editedCategory.name}.`
          ),
        };
      }
      return participant;
    });

    const uniqueParticipants = Array.from(
      new Set(updatedParticipants.map((p) => JSON.stringify(p)))
    ).map((p) => JSON.parse(p));

    setParticipants(uniqueParticipants);

    // Deduplicate categories
    const duplicateCategory = categories.find(
      (category) =>
        category.name === editedCategory.name &&
        category.parent === editedCategory.parent
    );

    if (duplicateCategory) {
      // Log the duplicate case
      console.log(
        `Duplicate category found: name="${editedCategory.name}", parent="${editedCategory.parent}".`
      );
      // Remove the original category if duplicate exists
      setCategories((prevCategories) =>
        prevCategories.filter(
          (category) =>
            !(
              category.name === originalCategory.name &&
              category.parent === originalCategory.parent
            )
        )
      );
    } else {
      // Update categories with new data
      const updatedCategories = categories.map((category) =>
        category.name === originalCategory.name &&
        category.parent === originalCategory.parent
          ? editedCategory
          : category
      );
      setCategories(updatedCategories);
    }
  };

  return (
    <AppContext.Provider
      value={{
        categories,
        participants,
        addCategory,
        deleteCategory,
        deleteParticipant,
        editCategory,
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
