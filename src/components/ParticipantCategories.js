import React, { useState, useEffect } from "react";

import TextInput from "./objects/TextInput";
import Button from "./objects/Button";
import Dropdown from "./objects/Dropdown";
import ScrollList from "./objects/ScrollList";

import "../componentStyles/ParticipantCategories.css";

function ParticipantsCategories({ categories, onUpdate }) {
  const [categoryList, setCategoryList] = useState(categories);

  useEffect(() => {
    const initialCategories = [
      { name: "Player", parent: "" },
      { name: "NPC", parent: "" },
    ];
    initialCategories.forEach((category) => addUnique(category));
  }, []);

  const addUnique = (newCategory) => {
    setCategoryList((prevList) => {
      if (
        !prevList.find(
          (category) =>
            category.name === newCategory.name &&
            category.parent === newCategory.parent
        )
      ) {
        const updatedList = [...prevList, newCategory];
        onUpdate(updatedList);
        return updatedList;
      }
      return prevList;
    });
  };

  const handleAddCategory = () => {
    if (newCategory.name) {
      addUnique(newCategory);
      setNewCategory({ name: "", parent: "" });
    }
  };

  const handleInputChange = (name, value) => {
    setNewCategory((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectCategory = (category) => {
    // Implement any logic when a category is selected
  };

  const categoryOptions = categoryList.map((category) => ({
    value: category.parent
      ? `${category.parent}.${category.name}`
      : category.name,
    label: category.parent
      ? `${category.parent}.${category.name}`
      : category.name,
  }));

  const [newCategory, setNewCategory] = useState({ name: "", parent: "" });

  return (
    <div className="participants-categories-container">
      <h3>Participants Categories</h3>
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
          placeholder="Parent Category"
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
          items={categoryList.map((c) =>
            c.parent ? `${c.parent}.${c.name}` : c.name
          )}
          onSelect={handleSelectCategory}
        />
      </div>
    </div>
  );
}

export default ParticipantsCategories;
