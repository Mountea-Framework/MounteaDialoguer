import React, { useState, useEffect, useContext } from "react";
import Modal from "../objects/Modal";
import TextInput from "../objects/TextInput";
import Dropdown from "../objects/Dropdown";
import Button from "../objects/Button";
import AppContext from "../../AppContext";

function EditScrollListItem({ isOpen, onClose, category, onSave }) {
  console.log('EditScrollListItem received category:', category);

  const { categories } = useContext(AppContext);
  const [editedCategory, setEditedCategory] = useState({});
  const [originalCategory, setOriginalCategory] = useState({});

  useEffect(() => {
    if (category) {
      const initialCategory = typeof category === 'string' ? { name: category } : { ...category };
      setEditedCategory(initialCategory);
      setOriginalCategory(initialCategory);
      console.log('Updated editedCategory:', initialCategory);
    }
  }, [category]);

  const handleInputChange = (name, value) => {
    setEditedCategory((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    onSave(editedCategory, originalCategory);
    onClose();
  };

  const categoryOptions = categories.map((cat) => ({
    value: cat.parent ? `${cat.parent}.${cat.name}` : cat.name,
    label: cat.parent ? `${cat.parent}.${cat.name}` : cat.name,
  }));

  return (
    isOpen && category && (
      <Modal onClose={onClose} title={`Edit Category ${editedCategory.name || 'invalid'}`}>
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
