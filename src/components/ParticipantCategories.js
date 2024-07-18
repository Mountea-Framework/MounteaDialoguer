import React, { useContext, useState, useEffect } from "react";

import AppContext from "./../AppContext";
import Title from "./objects/Title";
import TextInput from "./objects/TextInput";
import Button from "./objects/Button";
import Dropdown from "./objects/Dropdown";
import ScrollList from "./objects/ScrollList";

import "../componentStyles/ParticipantCategories.css";

function ParticipantsCategories() {
  const { categories, addCategory, deleteCategory } = useContext(AppContext);
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

  const handleSelectCategory = (category) => {
    // Implement any logic when a category is selected
  };

  const handleIconClick = (item) => {
    deleteCategory(item);
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
    <div className="participants-categories-container scrollable-section">
      <Title
        level="3"
        children="Participants Categories"
        className="tertiary-headign"
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
          placeholder="select parent category"
        />
        <Button
          className="circle-button"
          onClick={handleAddCategory}
          disabled={newCategory.name.length === 0}
        >
          +
        </Button>
      </div>
      <div className="scroll-container">
        <ScrollList
          classState={"none"}
          classStateItems={"none"}
          items={categories.map((c) =>
            c.parent ? `${c.parent}.${c.name}` : c.name
          )}
          onSelect={handleSelectCategory}
          onIconClick={handleIconClick}
        />
      </div>
    </div>
  );
}

export default ParticipantsCategories;
