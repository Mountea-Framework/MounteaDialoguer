import React from "react";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";
import { ReactComponent as EditIcon } from "../../icons/editoIcon.svg";

import "../../componentStyles/objects/ScrollListItem.css";

function ScrollListItem({
  item,
  onSelect,
  onIconClick,
  className,
  classState,
}) {
  return (
    <li
      className={`${classState ? classState : "primary"} ${
        className ? className : "scroll-list-item"
      }`}
      onClick={() => onSelect(item)}
    >
      <span className="item-text">{item}</span>
      <span
        className="item-icon edit-icon"
        onClick={(e) => {
          e.stopPropagation();
          console.log("edit requested");
        }}
      >
        <EditIcon />
      </span>
      <span
        className={`item-icon remove-icon ${classState ? classState : "primary"}`}
        onClick={(e) => {
          e.stopPropagation();
          onIconClick(item);
        }}
      >
        <RemoveIcon />
      </span>
    </li>
  );
}

export default ScrollListItem;
