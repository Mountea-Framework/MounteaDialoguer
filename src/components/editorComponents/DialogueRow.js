import React from "react";

import { ReactComponent as DeleteIcon } from "../../icons/deleteIcon.svg";
import Button from "../objects/Button";

const DialogueRow = ({ index, text, audio, onTextChange, onAudioChange }) => {
	return (
		<div className="dialogue-row">
			<div className="dialogue-row-id">
				<span className={`dialogue-row-icon remove-icon`}>
					<DeleteIcon />
				</span>
			</div>
			<div className="dialogue-row-data">
				<textarea
					value={text}
					onChange={(e) => onTextChange(index, e.target.value)}
					placeholder="Enter dialogue text"
					rows={6}
				/>
				<div className="dialogue-row-data-audio-row">
					<input
						className="dialogue-row-audio-input"
						type="file"
						accept="audio/*"
						onChange={(e) => onAudioChange(index, e.target.files[0])}
					/>
					<span className={`dialogue-row-icon remove-icon`}>
						<DeleteIcon />
					</span>
				</div>
			</div>
		</div>
	);
};

export default DialogueRow;
