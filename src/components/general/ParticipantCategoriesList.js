import React from "react";

import ScrollList from "./../objects/ScrollList"

function ParticipantCategoriesList({ categories }) {
  return <ScrollList classState="none"
  classStateItems="none" items={categories.map((category) => category.name)} />;
}

export default ParticipantCategoriesList;
