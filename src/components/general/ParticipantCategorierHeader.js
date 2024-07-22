import React, { useState, useContext } from "react";
import TextInput from "../objects/TextInput";
import Dropdown from "../objects/Dropdown";
import Button from "../objects/Button";
import Title from "../objects/Title";
import AppContext from "../../AppContext";

function ParticipantCategoriesHeader() {
  const { categories, addCategory } = useContext(AppContext);
  const [newCategory, setNewCategory] = useState({ name: "", parent: "" });

  const handleAddCategory = () => {
    if (newCategory.name) {
      addCategory(newCategory);
      setNewCategory({ name: "", parent: "" });
    }
  };

  const handleInputChange = (name, value) => {
    setNewCategory((prev) => ({ ...prev, [name]: value }));
  };

  const categoryOptions = categories.map((category) => ({
    value: category.parent
      ? `${category.parent}.${category.name}`
      : category.name,
    label: category.parent
      ? `${category.parent}.${category.name}`
      : category.name,
  }));

  return (
    <div>
      <Title
        level="3"
        children="Participants Categories"
        className="tertiary-heading"
      />
      <div className="input-button-row">
        <TextInput
          placeholder="New Category"
          title="Category Name"
          name="name"
          value={newCategory.name}
          onChange={handleInputChange}
        />
        <Dropdown
          name="parent"
          value={newCategory.parent}
          onChange={handleInputChange}
          options={categoryOptions}
          placeholder="Select Parent Category"
        />
        <Button
          className="circle-button"
          onClick={handleAddCategory}
          disabled={!newCategory.name}
        >
          +
        </Button>
      </div>
    </div>
  );
}

export default ParticipantCategoriesHeader;
