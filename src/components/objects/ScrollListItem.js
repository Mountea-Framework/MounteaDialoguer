import React, { useState } from "react";
import EditScrollListItem from "../general/EditScrollListItem";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";
import { ReactComponent as EditIcon } from "../../icons/editoIcon.svg";


import "../../componentStyles/objects/ScrollListItem.css";

function ScrollListItem({
  item,
  onSelect,
  onIconClick,
  className,
  classState,
  onEdit, // New prop for handling edit
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEditClick = (e) => {
    e.stopPropagation();
    setIsEditOpen(true);
  };

  const handleSave = (editedItem) => {
    onEdit(editedItem);
  };

  return (
    <>
      <li
        className={`${classState ? classState : "primary"} ${
          className ? className : "scroll-list-item"
        }`}
        onClick={() => onSelect(item)}
      >
        <span className="item-text">{item}</span>
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
      <EditScrollListItem
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        category={item}
        onSave={handleSave}
      />
    </>
  );
}

export default ScrollListItem;
