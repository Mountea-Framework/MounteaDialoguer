import React from "react";

import DialogueEditorTooblar from "./editorComponents/DialogueEditorToolbar";
import DialogueEditorDetails from "./editorComponents/DialogueEditorDetails";
import DialogueEditorCanvas from "./editorComponents/DialogueEditorCanvas";

import "../componentStyles/DialogueEditor.css";

function DialogueEditor() {
	return (
		<div className="dialogue-editor">
			<div className="dialogue-editor-toolbar-wrapper">
				<DialogueEditorTooblar></DialogueEditorTooblar>
				<div className="dialogue-editor-toolbar-spacer background-secondary"></div>
			</div>
			<div className="dialogue-editor-board">
				<DialogueEditorCanvas></DialogueEditorCanvas>
				<DialogueEditorDetails></DialogueEditorDetails>
			</div>
		</div>
	);
}

export default DialogueEditor;
