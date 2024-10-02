import React, { useContext } from "react";

import Modal from "../objects/Modal";
import ParticipantCategoriesHeader from "../general/ParticipantCategoriesHeader";
import ParticipantCategoriesList from "../general/ParticipantCategoriesList";
import DialogueParticipantsHeader from "../general/DialogueParticipantsHeader";
import DialogueParticipantsList from "../general/DialogueParticipantsList";
import AppContext from "../../AppContext";
import { useAutoSave } from "../../hooks/useAutoSave";

import "../../componentStyles/NewProjectDetails.css";
import "../../componentStyles/editorComponentStyles/DialogueEditorSettings.css";

function DialogueEditorSettings({ isOpen, onClose, nodes, edges }) {
	const { categories, participants, setParticipants, setCategories, name } =
		useContext(AppContext);

	const { saveProjectToIndexedDB } = useAutoSave();

	const handleCategoriesUpdate = (newCategories) => {
		setCategories(newCategories);
		const guid = sessionStorage.getItem("project-guid");
		saveProjectToIndexedDB({
			guid,
			name,
			categories: newCategories,
			participants,
			nodes,
			edges,
		});
	};

	const handleParticipantsUpdate = (newParticipants) => {
		setParticipants(newParticipants);
		const guid = sessionStorage.getItem("project-guid");
		saveProjectToIndexedDB({
			guid,
			name,
			categories,
			participants: newParticipants,
			nodes,
			edges,
		});
	};

	const handleDeleteCategory = (categoryName) => {
		const updatedCategories = categories.filter(
			(category) => category.name !== categoryName
		);
		const updatedParticipants = participants.filter(
			(participant) => participant.category !== categoryName
		);
		setCategories(updatedCategories);
		setParticipants(updatedParticipants);
	};

	const handleEditCategory = (editedCategory) => {
		const updatedCategories = categories.map((category) =>
			category.name === editedCategory.name ? editedCategory : category
		);
		const updatedParticipants = participants.map((participant) => {
			if (participant.category === editedCategory.name) {
				return { ...participant, category: editedCategory.name };
			}
			if (participant.category.startsWith(`${editedCategory.name}.`)) {
				return {
					...participant,
					category: participant.category.replace(
						`${editedCategory.name}.`,
						`${editedCategory.parent ? `${editedCategory.parent}.` : ""}${
							editedCategory.name
						}.`
					),
				};
			}
			return participant;
		});
		setCategories(updatedCategories);
		setParticipants(updatedParticipants);
	};

	const handleDeleteParticipant = (participantName) => {
		const updatedParticipants = participants.filter(
			(participant) =>
				`${participant.name} - ${participant.category}` !== participantName
		);
		setParticipants(updatedParticipants);
	};

	return (
		isOpen && (
			<Modal
				onClose={onClose}
				title="Edit Categories and Participants"
				titleClassName="secondary-heading"
				titleLevel="2"
			>
				<div className="new-project-details">
					<div className="headers">
						<div className="scrollable-sections-header">
							<ParticipantCategoriesHeader
								categories={categories}
								onUpdate={handleCategoriesUpdate}
							/>
						</div>
						<div className="scrollable-sections-header">
							<DialogueParticipantsHeader
								participants={participants}
								categories={categories}
								onUpdate={handleParticipantsUpdate}
							/>
						</div>
					</div>
					<div className="lists">
						<div className="scrollable-sections">
							<ParticipantCategoriesList
								categories={categories}
								onDeleteCategory={handleDeleteCategory}
								onEditCategory={handleEditCategory}
							/>
						</div>
						<div className="scrollable-sections">
							<DialogueParticipantsList
								participants={participants}
								onDeleteParticipant={handleDeleteParticipant}
							/>
						</div>
					</div>
				</div>
			</Modal>
		)
	);
}

export default DialogueEditorSettings;
