import React, { /*useRef,*/ useEffect, useState } from "react";
import {
	deleteFileFromIndexedDB,
	saveFileToIndexedDB,
} from "../../hooks/useAutoSave";
import Button from "../objects/Button";
import TextBlock from "../objects/Textblock";
import FileDrop from "../objects/FileDrop";
import Slider from "../objects/Slider";

import { ReactComponent as DeleteIcon } from "../../icons/deleteIcon.svg";

const DialogueRow = ({
	id,
	index,
	text,
	duration,
	audio,
	onTextChange,
	onDurationChange,
	onAudioChange,
	onDelete,
}) => {
	const [fileName, setFileName] = useState(audio?.name || "");
	const [localDuration, setLocalDuration] = useState(duration || 0);

	const handleClearFileDrop = async () => {
		onAudioChange(index, null);
		setFileName("");

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

	useEffect(() => {
		setLocalDuration(duration || 0);
	}, [duration]);

	const handleTextChange = (name, value) => {
		onTextChange(index, value);
	};

	const handleDurationChange = (name, value) => {
		setLocalDuration(value);
		onDurationChange(index, value);
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
				<div className="dialogue-row-duration">
					<Slider
						abbrTitle={`Duration in seconds`}
						name={`duration-${index}`}
						value={localDuration}
						onChange={handleDurationChange}
						min={0}
						max={100}
						step={0.2}
						className="custom-slider"
						classState="primary"
					/>
				</div>
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
