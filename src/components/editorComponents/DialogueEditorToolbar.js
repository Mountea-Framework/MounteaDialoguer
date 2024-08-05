import React, { useContext, useState } from "react";

import Button from "../../components/objects/Button";
import { FileContext } from "../../FileProvider";

import { ReactComponent as ImportIcon } from "../../icons/uploadIcon.svg";
import { ReactComponent as DownloadIcon } from "../../icons/downloadIcon.svg";
import { ReactComponent as HelpIcon } from "../../icons/helpIcon.svg";
import { ReactComponent as FavoriteIcon } from "../../icons/favoriteIcon.svg";
import { ReactComponent as SettingsIcon } from "../../icons/settingsIcon.svg";
import { ReactComponent as SearchIcon } from "../../icons/searchIcon.svg";
import { ReactComponent as UndoIcon } from "../../icons/undoIcon.svg";
import { ReactComponent as RedoIcon } from "../../icons/redoIcon.svg";

import DialogueEditorSettings from "./DialogueEditorSettings";

import "../../componentStyles/editorComponentStyles/DialogueEditorToolbar.css";

function DialogueEditorToolbar() {
	const { generateFile } = useContext(FileContext);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const handleSave = () => {
		generateFile();
	};

	const handleSettingsClick = () => {
		setIsSettingsOpen(true);
	};

	return (
		<div className="dialogue-editor-toolbar background-secondary">
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
				disabled={true}
			>
				<UndoIcon className="undo-icon icon" />
			</Button>
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
				disabled={true}
			>
				<RedoIcon className="redo-icon icon" />
			</Button>
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
				onClick={handleSave}
			>
				<DownloadIcon className="download-icon icon" />
			</Button>
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
			>
				<ImportIcon className="import-icon icon" />
			</Button>
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
				onClick={handleSettingsClick}
			>
				<SettingsIcon className="settings-icon icon" />
			</Button>
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
				disabled={true}
			>
				<HelpIcon className="help-icon icon" />
			</Button>
			<Button
				containerClassName={"toolbar-button-container"}
				className={"custom-button toolbar-button"}
				classState={"tertiary"}
				disabled={true}
			>
				<SearchIcon className="search-icon icon" />
			</Button>
			<div className="favourite-container">
				<Button
					containerClassName={"toolbar-button-container favourite-container"}
					className={"custom-button toolbar-button"}
					classState={"tertiary"}
					onClick={() =>
						window.open(
							"https://github.com/sponsors/Mountea-Framework",
							"_blank"
						)
					}
				>
					<FavoriteIcon className="favorite-icon icon" />
				</Button>
			</div>
			<DialogueEditorSettings
				isOpen={isSettingsOpen}
				onClose={() => setIsSettingsOpen(false)}
			/>
		</div>
	);
}

export default DialogueEditorToolbar;
