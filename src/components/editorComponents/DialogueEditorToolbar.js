import React, { useContext } from "react";

import Button from "../../components/objects/Button";
import { FileContext } from "../../FileProvider";

import "../../componentStyles/editorComponentStyles/DialogueEditorToolbar.css";

function DialogueEditorToolbar() {
	const { generateFile } = useContext(FileContext);

	const handleSave = () => {
		generateFile();
	};

	return (
		<div className="dialogue-editor-toolbar background-secondary">
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
				onClick={handleSave}
			>
				Save
			</Button>
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
			>
				Load
			</Button>
		</div>
	);
}

export default DialogueEditorToolbar;
