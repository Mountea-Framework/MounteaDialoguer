import React, { useContext } from "react";

import ScrollList from "../objects/ScrollList";
import AppContext from "../..//AppContext";

function ParticipantCategoriesList() {
  const { categories, deleteCategory } = useContext(AppContext);

  return (
    <div className="scroll-container">
      <ScrollList
        classState="none"
        classStateItems="none"
        items={categories.map((c) =>
          c.parent ? `${c.parent}.${c.name}` : c.name
        )}
        onIconClick={deleteCategory}
      />
    </div>
  );
}

export default ParticipantCategoriesList;
