import React from "react";

const DialogueRow = ({ index, text, audio, onTextChange, onAudioChange }) => {
	return (
		<div className="dialogue-row">
			<textarea
				value={text}
				onChange={(e) => onTextChange(index, e.target.value)}
				placeholder="Enter dialogue text"
				rows={6}
			/>
			<input
				type="file"
				accept="audio/*"
				onChange={(e) => onAudioChange(index, e.target.files[0])}
			/>
		</div>
	);
};

export default DialogueRow;
