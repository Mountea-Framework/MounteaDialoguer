import React from "react";

import ScrollList from "./../objects/ScrollList";

function ParticipantCategoriesList({ categories, onUpdate }) {
  const handleSelectCategory = (category) => {
    // Implement any logic when a category is selected
  };

  const handleIconClick = (item) => {
    const updatedCategories = categories.filter(
      (category) => `${category.name}` !== item
    );
    onUpdate(updatedCategories);
  };

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={categories.map((c) =>
          c.parent ? `${c.parent}.${c.name}` : c.name
        )}
        onSelect={handleSelectCategory}
        onIconClick={handleIconClick}
      />
    </div>
  );
}

export default ParticipantCategoriesList;
