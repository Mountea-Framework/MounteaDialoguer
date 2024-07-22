import React, { useState } from "react";
import EditScrollListItem from "../general/EditScrollListItem";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";
import { ReactComponent as EditIcon } from "../../icons/editoIcon.svg";

import "../../componentStyles/objects/ScrollListItem.css";

function ScrollListItem({
  item,
  onIconClick,
  className,
  classState,
  onEdit,
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handleEditClick = () => {
    setSelectedCategory(item);
    console.log('Selected Category:', item);
    setIsEditOpen(true);
  };

  const handleSave = (editedItem, originalItem) => {
    onEdit(editedItem, originalItem);
    setIsEditOpen(false);
  };

  return (
    <>
      <li
        className={`${classState ? classState : "primary"} ${
          className ? className : "scroll-list-item"
        }`}
        onClick={handleEditClick}
      >
        <span className="item-text">{item.name || item}</span>
        <span className="item-icon edit-icon" onClick={handleEditClick}>
          <EditIcon />
        </span>
        <span
          className={`item-icon remove-icon ${
            classState ? classState : "primary"
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onIconClick(item);
          }}
        >
          <RemoveIcon />
        </span>
      </li>
      {isEditOpen && selectedCategory && (
        <EditScrollListItem
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          category={selectedCategory}
          onSave={handleSave}
        />
      )}
    </>
  );
}

export default ScrollListItem;
