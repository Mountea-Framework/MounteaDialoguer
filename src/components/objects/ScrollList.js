import React from "react";

import ScrollListItem from "./ScrollListItem";

import "../../componentStyles/objects/ScrollList.css";

function ScrollList({
  items = [],
  onSelect,
  onIconClick,
  className,
  classState,
  classNameItems,
  classStateItems,
  EditComponent,
}) {

  return (
    <div
      className={`${classState ? classState : "primary"} ${
        className ? className : "scroll-list"
      }`}
    >
      <ul>
        {items.map((item, index) => (
          <ScrollListItem
            key={index}
            item={item}
            onSelect={onSelect}
            onIconClick={onIconClick}
            className={`${classNameItems ? classNameItems : ""}`}
            classState={`${classStateItems ? classStateItems : ""}`}
            EditComponent={EditComponent}
          />
        ))}
      </ul>
    </div>
  );
}

export default ScrollList;
