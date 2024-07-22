import React, { useContext } from "react";

import ScrollList from "../objects/ScrollList";
import EditCategoryItem from "./EditCategoryItem";
import AppContext from "../../AppContext";

function ParticipantCategoriesList() {
  const { categories, setCategories, participants, setParticipants } =
    useContext(AppContext);

  const handleEditCategory = (editedCategory, originalCategory) => {
    const updatedCategories = categories.map((category) =>
      category.name === originalCategory.name ? editedCategory : category
    );
    setCategories(updatedCategories);

    const updatedParticipants = participants.map((participant) => {
      if (participant.category === originalCategory.name) {
        return { ...participant, category: editedCategory.name };
      }
      if (participant.category.startsWith(`${originalCategory.name}.`)) {
        return {
          ...participant,
          category: participant.category.replace(
            `${originalCategory.name}.`,
            `${editedCategory.name}.`
          ),
        };
      }
      return participant;
    });

    setParticipants(updatedParticipants);
  };

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={categories}
        onIconClick={(categoryName) =>
          setCategories(categories.filter((c) => c.name !== categoryName))
        }
        onEdit={handleEditCategory}
        EditComponent={EditCategoryItem}
      />
    </div>
  );
}

export default ParticipantCategoriesList;
