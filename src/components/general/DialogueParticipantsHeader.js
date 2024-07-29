import React, { useState, useContext } from "react";

import TextInput from "../objects/TextInput";
import Dropdown from "../objects/Dropdown";
import Button from "../objects/Button";
import Title from "../objects/Title";
import AppContext from "../../AppContext";
import { FileContext } from "../../FileProvider";

import { ReactComponent as ImportIcon } from "../../icons/uploadIcon.svg";
import { ReactComponent as DownloadIcon } from "../../icons/downloadIcon.svg";

function DialogueParticipantsHeader( {onUpdate} ) {
	const { participants, categories, addParticipant } = useContext(AppContext);
	const { handleClick, exportParticipants } = useContext(FileContext);
	const [newParticipant, setNewParticipant] = useState({
		name: "",
		category: "",
	});

	const handleAddParticipant = () => {
		if (newParticipant.name && newParticipant.category) {
			addParticipant(newParticipant);
			setNewParticipant({ name: "", category: "" });
		}
	};

	const handleInputChange = (name, value) => {
		setNewParticipant((prev) => ({ ...prev, [name]: value }));
	};

	const categoryOptions = categories.map((category) => ({
		value: category.parent
			? `${category.parent}.${category.name}`
			: category.name,
		label: category.parent
			? `${category.parent}.${category.name}`
			: category.name,
	}));

	const handleImportClick = () => {
		handleClick((importedParticipants) => {
			onUpdate(importedParticipants);
		});
	};

	const handleExportClick = () => {
		exportParticipants();
	};

	return (
		<div>
			<div className="input-header-row">
				<Title
					level="3"
					children="Dialogue Participants"
					className="tertiary-heading"
				/>
				<div className="header-buttons">
					<Button
						className="circle-button icon-button import"
						onClick={handleImportClick}
					>
						<ImportIcon className="import-icon icon" />
					</Button>
					<Button
						className="circle-button icon-button download"
						onClick={handleExportClick}
					>
						<DownloadIcon className="download-icon icon" />
					</Button>
				</div>
			</div>
			<div className="input-button-row">
				<TextInput
					placeholder="New Participant"
					title="Participant Name"
					name="name"
					value={newParticipant.name}
					onChange={handleInputChange}
				/>
				<Dropdown
					name="category"
					value={newParticipant.category}
					onChange={handleInputChange}
					options={categoryOptions}
					placeholder="select category"
				/>
				<Button
					className="circle-button"
					onClick={handleAddParticipant}
					disabled={!newParticipant.name || !newParticipant.category}
				>
					+
				</Button>
			</div>
		</div>
	);
}

export default DialogueParticipantsHeader;
