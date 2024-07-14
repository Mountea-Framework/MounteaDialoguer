import React from 'react';

import '../../componentStyles/objects/ScrollListItem.css';

function ScrollListItem({ item, onSelect }) {
  return (
    <li
      className="scroll-list-item"
      onClick={() => onSelect(item)}
    >
      {item}
    </li>
  );
}

export default ScrollListItem;
