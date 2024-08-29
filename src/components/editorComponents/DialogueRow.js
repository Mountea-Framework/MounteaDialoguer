import React, { /*useRef,*/ useEffect, useState } from "react";
import { deleteFileFromIndexedDB, saveFileToIndexedDB } from "../../hooks/useAutoSave";
import Button from "../objects/Button";
import TextBlock from "../objects/Textblock";
import FileDrop from "../objects/FileDrop";

import { ReactComponent as DeleteIcon } from "../../icons/deleteIcon.svg";

const DialogueRow = ({
	id,
	index,
	text,
	audio,
	onTextChange,
	onAudioChange,
	onDelete,
}) => {
	const [fileName, setFileName] = useState(audio?.name || "");

	const handleClearFileDrop = async () => {
		onAudioChange(index, null); // Clear the audio from the parent component
		setFileName(""); // Clear the filename in the state

		if (audio?.path) {
			await deleteFileFromIndexedDB(audio.path);
		}
	};

	useEffect(() => {
		if (audio) {
			if (typeof audio === "object" && audio.path) {
				const extractedFileName = audio.path.split("/").pop();
				setFileName(extractedFileName || "");
			}
		}
	}, [audio]);

	const handleTextChange = (name, value) => {
		onTextChange(index, value);
	};

	const handleAudioChange = async (e) => {
		const file = e.target.files[0];
		if (file) {
			setFileName(file.name);

			const filePath = `audio/${id}/${file.name}`;

			const reader = new FileReader();
			reader.onload = async () => {
				const fileData = reader.result;
				await saveFileToIndexedDB(filePath, fileData);

				const newAudio = { ...file, path: filePath };
				onAudioChange(index, newAudio);
			};
			reader.readAsArrayBuffer(file);
		}
	};

	return (
		<div className="dialogue-row">
			<div className="dialogue-row-id">
				<Button
					onClick={() => onDelete(index)}
					className="circle-button dialogue-row-data-button"
				>
					<span className={`dialogue-row-icon remove-icon icon`}>
						<DeleteIcon />
					</span>
				</Button>
			</div>

			<div className="dialogue-row-data">
				<TextBlock
					name={`text-${index}`}
					value={text}
					onChange={handleTextChange}
					placeholder="Enter dialogue text"
					startRows={8}
					useSuggestions={true}
				/>
				<div className="dialogue-row-data-audio-row">
					<FileDrop
						onChange={handleAudioChange}
						primaryText="Select audio file"
						accept="audio/x-wav"
						id={`dialogueRowAudioSelection-${id}`}
						fileName={fileName} // Pass the filename to FileDrop
					/>
					<Button
						onClick={handleClearFileDrop}
						className="circle-button dialogue-row-data-button"
					>
						<span className={`dialogue-row-icon remove-icon icon`}>
							<DeleteIcon />
						</span>
					</Button>
				</div>
			</div>
		</div>
	);
};

export default DialogueRow;
