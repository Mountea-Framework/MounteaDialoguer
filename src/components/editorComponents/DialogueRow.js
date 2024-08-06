import React, { useRef } from "react";

import Button from "../objects/Button";
import FileDrop from "../objects/FileDrop";
import TextBlock from "../objects/Textblock";

import { ReactComponent as DeleteIcon } from "../../icons/deleteIcon.svg";

const DialogueRow = ({
	index,
	text,
	audio,
	onTextChange,
	onAudioChange,
	onDelete,
}) => {
	const fileDropRef = useRef(null);

	const handleClearFileDrop = () => {
		if (fileDropRef.current) {
			fileDropRef.current.clearFile();
		}
	};

	const handleTextChange = (name, value) => {
		onTextChange(index, value);
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
				/>
				<div className="dialogue-row-data-audio-row">
					<FileDrop
						ref={fileDropRef}
						onChange={(e) => onAudioChange(index, e.target.files[0])}
						primaryText="Select audio file"
						accept="audio/*"
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
