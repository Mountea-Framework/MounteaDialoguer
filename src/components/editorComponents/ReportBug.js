import React, { useState } from "react";

import Modal from "../objects/Modal";
import TextInput from "../objects/TextInput";
import TextBlock from "../objects/Textblock";
import Button from "../objects/Button";

import "../../componentStyles/editorObjects/ReportBug.css";

const BugReportDialog = ({ isOpen, onClose }) => {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!title || !description) {
			alert("Both title and description are required.");
			return;
		}

		const response = await fetch(
			`https://api.github.com/repos/Mountea-Framework/MounteaDialoguer/dispatches`,
			{
				method: "POST",
				headers: {
					Authorization: `token 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`,
					Accept: "application/vnd.github.v3+json",
				},
				body: JSON.stringify({
					event_type: "create_issue",
					client_payload: {
						title,
						body: description,
					},
				}),
			}
		);

		if (response.ok) {
			alert("Bug report submitted successfully");
			onClose();
		} else {
			alert("Failed to submit bug report");
		}
	};

	const handleTitleChange = (name, value) => {
		setTitle(value);
	};

	const handleDescriptionChange = (name, value) => {
		setDescription(value);
	};

	return (
		isOpen && (
			<Modal
				onClose={onClose}
				className={"modal-bug-report"}
				title="Report a bug"
			>
				<div className="bug-report-dialog">
					<form onSubmit={handleSubmit} className="bug-report-form">
						<div>
							<label className="tertiary-text">Title</label>
							<TextInput
								title="Bug Title"
								placeholder="New bug title"
								name="title"
								value={title}
								onChange={handleTitleChange}
								maxLength={32}
								isRequired={true}
							/>
						</div>
						<div>
							<label className="tertiary-text">Description</label>
							<TextBlock
								placeholder="Description"
								value={description}
								startRows={12}
								onChange={handleDescriptionChange}
								name="description"
								isRequired={true}
							/>
						</div>
						<Button type="submit">Submit</Button>
					</form>
				</div>
			</Modal>
		)
	);
};

export default BugReportDialog;
