import React, { useContext } from "react";

import ScrollList from "../objects/ScrollList";
import AppContext from "../../AppContext";

function ParticipantCategoriesList() {
  const { categories, setCategories } = useContext(AppContext);

  const handleEditCategory = (editedCategory) => {
    const updatedCategories = categories.map((category) =>
      category.name === editedCategory.name ? editedCategory : category
    );
    setCategories(updatedCategories);
  };

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={categories.map((c) =>
          c.parent ? `${c.parent}.${c.name}` : c.name
        )}
        onIconClick={(categoryName) =>
          setCategories(categories.filter((c) => c.name !== categoryName))
        }
        onEdit={handleEditCategory} // Pass the onEdit handler
      />
    </div>
  );
}

export default ParticipantCategoriesList;
