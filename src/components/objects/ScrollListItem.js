import React from "react";

import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";

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
        className="item-icon"
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
