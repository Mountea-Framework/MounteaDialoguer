import React, { useRef } from "react";

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
	console.log(id);

	const fileDropRef = useRef(null);

	const handleClearFileDrop = () => {
		if (fileDropRef.current) {
			fileDropRef.current.clearFile();
		}
	};

	const handleTextChange = (name, value) => {
		onTextChange(index, value);
	};

	const handleAudioChange = (e) => {
		const file = e.target.files[0];
		if (file) {
			const filePath = `audio/${id}/${file.name}`;
			onAudioChange(index, { ...file, path: filePath });
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
						onChange={handleAudioChange}//{(e) => onAudioChange(index, e.target.files[0])}
						primaryText="Select audio file"
						accept="audio/x-wav"
						id="dialogueRowAudioSelection"
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
