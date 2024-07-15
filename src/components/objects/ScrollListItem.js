import React from "react";

import "../../componentStyles/objects/ScrollListItem.css";

function ScrollListItem({ item, onSelect, className, classState }) {
  return (
    <li
      className={`${classState ? classState : "primary"} ${
        className ? className : "scroll-list-item"
      }`}
      onClick={() => onSelect(item)}
    >
      {item}
    </li>
  );
}

export default ScrollListItem;
