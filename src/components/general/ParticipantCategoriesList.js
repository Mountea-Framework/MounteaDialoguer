import React, { useContext } from "react";
import ScrollList from "../objects/ScrollList";
import EditCategoryItem from "../general/EditCategoryItem";
import AppContext from "../../AppContext";

function ParticipantCategoriesList() {
  const { categories, deleteCategory, editCategory } = useContext(AppContext);

  const combinedCategories = categories.map((category) => ({
    ...category,
    displayName: `${category.name}${
      category.parent ? `.${category.parent}` : ""
    }`,
  }));

  const handleDeleteCategory = (categoryToDelete) => {
    deleteCategory(categoryToDelete.name);
  };

  const handleEditCategory = (editedCategory, originalCategory) => {
    editCategory(editedCategory, originalCategory);
  };

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={combinedCategories}
        onIconClick={handleDeleteCategory}
        onEdit={handleEditCategory}
        EditComponent={EditCategoryItem}
      />
    </div>
  );
}

export default ParticipantCategoriesList;
