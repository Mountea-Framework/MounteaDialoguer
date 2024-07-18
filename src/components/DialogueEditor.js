import React, { useState, useContext } from "react";

import DialogueEditorTooblar from "./editorComponents/DialogueEditorToolbar";
import DialogueEditorDetails from "./editorComponents/DialogueEditorDetails";
import DialogueEditorCanvas from "./editorComponents/DialogueEditorCanvas";
import AppContext from "../AppContext";

import "../componentStyles/DialogueEditor.css";

function DialogueEditor() {
  return (
    <div className="dialogue-editor">
      <DialogueEditorTooblar></DialogueEditorTooblar>
      <div className="dialogue-editor-board">
        <DialogueEditorCanvas></DialogueEditorCanvas>
        <DialogueEditorDetails></DialogueEditorDetails>
      </div>
    </div>
  );
}

export default DialogueEditor;
