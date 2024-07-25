import React, { useState, useContext } from "react";
import Title from "./objects/Title";
import TextInput from "./objects/TextInput";
import Button from "./objects/Button";
import useAutoSave from "../hooks/useAutoSave";
import ParticipantCategoriesHeader from "./general/ParticipantCategorierHeader";
import ParticipantCategoriesList from "./general/ParticipantCategoriesList";
import DialogueParticipantsHeader from "./general/DialogueParticipantsHeader";
import DialogueParticipantsList from "./general/DialogueParticipantsList";
import AppContext from "./../AppContext";

import "../componentStyles/NewProjectDetails.css";

function NewProjectDetails({ projectData, onReturn }) {
	const {
		categories,
		participants,
		setParticipants,
		setCategories,
		setShowLandingPage,
	} = useContext(AppContext);

	useAutoSave(projectData.name, categories, participants);

	const handleReturnClick = () => {
		localStorage.removeItem("autoSaveProject");
		setParticipants([]);
		setCategories([]);
		onReturn();
	};

	const handleCategoriesUpdate = (newCategories) => {
		setCategories(newCategories);
	};

	const handleParticipantsUpdate = (newParticipants) => {
		setParticipants(newParticipants);
	};

	const handleContinueClick = () => {
		setShowLandingPage(false);
	};

	const handleDeleteCategory = (categoryName) => {
		const updatedCategories = categories.filter(
			(category) => category.name !== categoryName
		);
		const updatedParticipants = participants.filter(
			(participant) =>
				participant.category !== categoryName &&
				!participant.category.startsWith(`${categoryName}.`)
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
		<div className="new-project-details">
			<Title
				level="2"
				children="New Project details"
				className="secondary-heading"
			/>
			<TextInput title="Dialogue Name" value={projectData.name} readOnly />
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
			<div className="footer-buttons">
				<Button onClick={handleReturnClick}>return</Button>
				<Button onClick={handleContinueClick}>continue</Button>
			</div>
		</div>
	);
}

export default NewProjectDetails;
