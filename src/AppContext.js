import React, { createContext, useState } from "react";

const AppContext = createContext();

export const AppProvider = ({ children }) => {
	const [categories, setCategories] = useState([]);
	const [participants, setParticipants] = useState([]);
	const [showLandingPage, setShowLandingPage] = useState(true);

	const addCategory = (newCategory) => {
		if (!isDuplicateCategory(newCategory)) {
			setCategories((prevCategories) => [...prevCategories, newCategory]);
		} else {
			console.log(
				`Category with name "${newCategory.name}" and parent "${newCategory.parent}" already exists.`
			);
		}
	};

	const deleteCategory = (categoryToDeleteName, categoryToDeleteParent) => {
		const deleteRecursive = (categoryName, categoryParent) => {
			const children = categories.filter(
				(category) => category.parent === `${categoryParent}.${categoryName}`
			);
			children.forEach((child) =>
				deleteRecursive(child.name, `${categoryParent}.${categoryName}`)
			);

			setCategories((prevCategories) =>
				prevCategories.filter(
					(category) =>
						!(
							category.name === categoryName &&
							category.parent === categoryParent
						)
				)
			);

			setParticipants((prevParticipants) =>
				prevParticipants.filter(
					(participant) =>
						participant.category !== `${categoryParent}.${categoryName}` &&
						!participant.category.startsWith(
							`${categoryParent}.${categoryName}.`
						)
				)
			);
		};

		deleteRecursive(categoryToDeleteName, categoryToDeleteParent);
	};

	const deleteParticipant = (participantToDelete) => {
		setParticipants((prevParticipants) =>
			prevParticipants.filter(
				(participant) =>
					participant.name !== participantToDelete.name ||
					participant.category !== participantToDelete.category
			)
		);
	};

	const addParticipant = (newParticipant) => {
		if (!isDuplicateParticipant(newParticipant)) {
			setParticipants((prevParticipants) => [
				...prevParticipants,
				newParticipant,
			]);
		} else {
			console.log(
				`Participant with name "${newParticipant.name}" and category "${newParticipant.category}" already exists.`
			);
		}
	};

	const editCategory = (editedCategory, originalCategory) => {
		const updatedParticipants = updateParticipantsForCategory(
			editedCategory,
			originalCategory
		);

		setParticipants(deduplicateArray(updatedParticipants));

		const duplicateCategory = findDuplicateCategory(editedCategory);

		if (duplicateCategory) {
			logDuplicateCategory(editedCategory);
			removeOriginalCategory(originalCategory);
		} else {
			updateCategories(editedCategory, originalCategory);
		}
	};

	const editParticipant = (editedParticipant, originalParticipant) => {
		const updatedParticipants = participants.map((participant) =>
			participant.name === originalParticipant.name &&
			participant.category === originalParticipant.category
				? editedParticipant
				: participant
		);

		setParticipants(deduplicateArray(updatedParticipants));

		if (isDuplicateParticipant(editedParticipant)) {
			logDuplicateParticipant(editedParticipant);
		}
	};

	// Helper functions
	const isDuplicateCategory = (category) =>
		categories.some(
			(cat) => cat.name === category.name && cat.parent === category.parent
		);

	const isDuplicateParticipant = (participant) =>
		participants.some(
			(p) => p.name === participant.name && p.category === participant.category
		);

	const findDuplicateCategory = (category) =>
		categories.find(
			(cat) => cat.name === category.name && cat.parent === category.parent
		);

	const logDuplicateCategory = (category) => {
		console.log(
			`Duplicate category found: name="${category.name}", parent="${category.parent}".`
		);
	};

	const logDuplicateParticipant = (participant) => {
		console.log(
			`Duplicate participant found: name="${participant.name}", category="${participant.category}".`
		);
	};

	const removeOriginalCategory = (originalCategory) => {
		setCategories((prevCategories) =>
			prevCategories.filter(
				(category) =>
					!(
						category.name === originalCategory.name &&
						category.parent === originalCategory.parent
					)
			)
		);
	};

	const updateCategories = (editedCategory, originalCategory) => {
		setCategories((prevCategories) =>
			prevCategories.map((category) =>
				category.name === originalCategory.name &&
				category.parent === originalCategory.parent
					? editedCategory
					: category
			)
		);
	};

	const updateParticipantsForCategory = (editedCategory, originalCategory) =>
		participants.map((participant) => {
			if (
				participant.category ===
				`${originalCategory.parent}.${originalCategory.name}`
			) {
				return {
					...participant,
					category: `${editedCategory.parent}.${editedCategory.name}`,
				};
			}
			if (
				participant.category.startsWith(
					`${originalCategory.parent}.${originalCategory.name}.`
				)
			) {
				return {
					...participant,
					category: participant.category.replace(
						`${originalCategory.parent}.${originalCategory.name}.`,
						`${editedCategory.parent}.${editedCategory.name}.`
					),
				};
			}
			return participant;
		});

	const deduplicateArray = (array) =>
		Array.from(new Set(array.map((item) => JSON.stringify(item)))).map((item) =>
			JSON.parse(item)
		);

	return (
		<AppContext.Provider
			value={{
				categories,
				participants,
				addCategory,
				deleteCategory,
				deleteParticipant,
				addParticipant,
				editCategory,
				editParticipant,
				setParticipants,
				setCategories,
				showLandingPage,
				setShowLandingPage,
			}}
		>
			{children}
		</AppContext.Provider>
	);
};

export default AppContext;
