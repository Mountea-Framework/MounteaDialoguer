import React from "react";

import ScrollListItem from "./ScrollListItem";

import "../../componentStyles/objects/ScrollList.css";

function ScrollList({ items = [], onSelect, className, classState }) {
  return (
    <div className ={`${classState ? classState : 'primary'} ${className ? className : "scroll-list"}`}>
      <ul>
        {items.map((item, index) => (
          <ScrollListItem key={index} item={item} onSelect={onSelect} />
        ))}
      </ul>
    </div>
  );
}

export default ScrollList;
