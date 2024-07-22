import React, { useState, useEffect, useContext } from "react";

import Modal from "../objects/Modal";
import TextInput from "../objects/TextInput";
import Dropdown from "../objects/Dropdown";
import Button from "../objects/Button";
import AppContext from "../../AppContext";

function EditParticipantItem({ isOpen, onClose, item }) {
	const { participants, categories, editParticipant } = useContext(AppContext);
	const [editedParticipant, setEditedParticipant] = useState({
		name: "",
		category: "",
	});
	const [originalParticipant, setOriginalParticipant] = useState({
		name: "",
		category: "",
	});

	useEffect(() => {
		if (item) {
			const participant = participants.find(
				(p) => p.name === item.name && p.category === item.category
			);
			const initialParticipant = {
				name: item.name,
				category: participant ? participant.category : "",
			};

			setEditedParticipant(initialParticipant);
			setOriginalParticipant(initialParticipant);
		}
	}, [item, participants]);

	const handleInputChange = (name, value) => {
		setEditedParticipant((prev) => ({ ...prev, [name]: value }));
	};

	const handleSave = () => {
		editParticipant(editedParticipant, originalParticipant);
		onClose();
	};

	const categoryOptions = categories.map((cat) => ({
		value: cat.parent ? `${cat.parent}.${cat.name}` : cat.name,
		label: cat.parent ? `${cat.parent}.${cat.name}` : cat.name,
	}));

	return (
		isOpen && (
			<Modal
				onClose={onClose}
				title={`Edit Participant ${editedParticipant.name || ""}`}
			>
				<div className="edit-scroll-list-item">
					<TextInput
						placeholder="Participant Name"
						name="name"
						value={editedParticipant.name}
						onChange={handleInputChange}
					/>
					<Dropdown
						name="category"
						value={editedParticipant.category}
						onChange={handleInputChange}
						options={categoryOptions}
						placeholder="select category"
					/>
					<div className="buttons">
						<Button onClick={onClose}>cancel</Button>
						<Button
							onClick={handleSave}
							disabled={!editedParticipant.name || !editedParticipant.category}
						>
							save
						</Button>
					</div>
				</div>
			</Modal>
		)
	);
}

export default EditParticipantItem;
