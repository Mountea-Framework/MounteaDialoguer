import React, { useState, useContext } from "react";

import Button from "../../components/objects/Button";

import "../../componentStyles/editorComponentStyles/DialogueEditorToolbar.css";

function DialogueEditorTooblar() {
  return (
    <div className="dialogue-editor-toolbar background-secondary">
      <Button
        containerClassName={"toolbar-button-container"}
        className={"custom-button toolbar-button"}
        classState={"tertiary"}
      >
        save
      </Button>
      <Button
        containerClassName={"toolbar-button-container"}
        className={"custom-button toolbar-button"}
        classState={"tertiary"}
      >
        load
      </Button>
    </div>
  );
}

export default DialogueEditorTooblar;
