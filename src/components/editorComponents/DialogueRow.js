import React, { useRef } from "react";
import { ReactComponent as DeleteIcon } from "../../icons/deleteIcon.svg";
import Button from "../objects/Button";
import FileDrop from "../objects/FileDrop";

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
				<textarea
					value={text}
					onChange={(e) => onTextChange(index, e.target.value)}
					placeholder="Enter dialogue text"
					rows={8}
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
