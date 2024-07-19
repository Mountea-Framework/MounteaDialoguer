import React, { useState } from "react";

import TextInput from "./../objects/TextInput";
import Dropdown from "./../objects/Dropdown";
import Button from "./../objects/Button";
import Title from "../objects/Title";

function ParticipantCategoriesHeader({ categories, onUpdate }) {
  const [newCategory, setNewCategory] = useState({ name: "", parent: "" });

  const handleAddCategory = () => {
    if (newCategory.name) {
      const updatedCategories = [...categories, newCategory];
      onUpdate(updatedCategories);
      setNewCategory({ name: "", parent: "" });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCategory((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div>
      <Title
        level="3"
        children="Dialogue Categories"
        className="tertiary-heading"
      />
      <div className="input-button-row">
        <TextInput
          title="New Category"
          name="name"
          value={newCategory.name}
          onChange={handleInputChange}
        />
        <Dropdown
          title="Parent Category"
          name="parent"
          value={newCategory.parent}
          onChange={handleInputChange}
          options={categories.map((category) => ({
            label: category.name,
            value: category.name,
          }))}
        />
        <Button className="circle-button" onClick={handleAddCategory}>
          +
        </Button>
      </div>
    </div>
  );
}

export default ParticipantCategoriesHeader;
