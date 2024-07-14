import React from "react";

import ScrollListItem from "./ScrollListItem";

import "../../componentStyles/objects/ScrollList.css";

function ScrollList({ items = [], onSelect }) {
  return (
    <div className="scroll-list">
      <ul>
        {items.map((item, index) => (
          <ScrollListItem key={index} item={item} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  );
}

export default ScrollList;
