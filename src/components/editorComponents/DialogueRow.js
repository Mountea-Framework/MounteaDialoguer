import React, { useRef, useEffect, useState } from "react";
import { useAutoSave } from "../../hooks/useAutoSave";
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
	const fileDropRef = useRef(null);
	const { saveFileToIndexedDB, deleteFileFromIndexedDB } = useAutoSave();
	const [currentAudio, setCurrentAudio] = useState(audio);

	useEffect(() => {
		setCurrentAudio(audio);
		if (fileDropRef.current && audio) {
			fileDropRef.current.setFile(audio);
		}
	}, [audio]);

	const handleClearFileDrop = async () => {
		onAudioChange(index, null); // Clear the audio from the parent component
		if (fileDropRef.current) {
			fileDropRef.current.clearFile();
		}
		if (audio?.path) {
			await deleteFileFromIndexedDB(audio.path);
		}
	};

	const handleTextChange = (name, value) => {
		onTextChange(index, value);
	};

	const handleAudioChange = async (e) => {
		const file = e.target.files[0];
		if (file) {
			const filePath = `audio/${id}/${file.name}`;

			// Read the file and save to IndexedDB using the helper function
			const reader = new FileReader();
			reader.onload = async () => {
				const fileData = reader.result;
				await saveFileToIndexedDB(filePath, fileData);

				// Create a new audio object with the file and path
				const newAudio = { ...file, path: filePath };

				// Update the parent component with the new audio
				onAudioChange(index, newAudio);

				// Update the local state
				setCurrentAudio(newAudio);

				// Update the FileDrop component
				if (fileDropRef.current) {
					fileDropRef.current.setFile(newAudio);
					fileDropRef.current.set
				}
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
						ref={fileDropRef}
						onChange={handleAudioChange}
						primaryText="Select audio file"
						accept="audio/x-wav"
						id={`dialogueRowAudioSelection-${id}`}
						initialFile={currentAudio}
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
