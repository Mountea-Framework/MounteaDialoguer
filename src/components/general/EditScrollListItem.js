import React, { useState, useContext } from "react";

import Modal from "../objects/Modal";
import TextInput from "../objects/TextInput";
import Dropdown from "../objects/Dropdown";
import Button from "../objects/Button";
import AppContext from "../../AppContext";

function EditScrollListItem({ isOpen, onClose, category, onSave }) {
  const { categories } = useContext(AppContext);
  const [editedCategory, setEditedCategory] = useState({ ...category });

  const handleInputChange = (name, value) => {
    setEditedCategory((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(editedCategory);
    onClose();
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.parent ? `${cat.parent}.${cat.name}` : cat.name,
    label: cat.parent ? `${cat.parent}.${cat.name}` : cat.name,
  }));

  return (
    isOpen && (
      <Modal onClose={onClose}>
        <div className="edit-scroll-list-item">
          <TextInput
            placeholder="Category Name"
            name="name"
            value={editedCategory.name}
            onChange={handleInputChange}
          />
          <Dropdown
            name="parent"
            value={editedCategory.parent}
            onChange={handleInputChange}
            options={categoryOptions}
            placeholder="Select Parent Category"
          />
          <div className="buttons">
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>
    )
  );
}

export default EditScrollListItem;
