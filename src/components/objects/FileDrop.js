import React from "react";

const FileDrop = ({
	type = "file",
	accept = "*/*",
	primaryText = "Drag and drop a file here or click to select",
	onChange,
	id,
	containerClassName,
	textClassName,
	fileName,
}) => {
	const handleFileChange = (e) => {
		const file = e.target.files[0];
		if (file && onChange) {
			onChange(e);
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = (e) => {
		e.preventDefault();
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile && onChange) {
			const syntheticEvent = {
				target: {
					files: [droppedFile],
				},
			};
			onChange(syntheticEvent);
		}
	};

	return (
		<div
			className={`file-drop-area ${
				containerClassName ? containerClassName : ""
			}`}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onClick={() => document.getElementById(id).click()}
		>
			<input
				id={id}
				type={type}
				onChange={handleFileChange}
				accept={accept}
				style={{ display: "none" }}
			/>
			<p className={`primary-text ${textClassName ? textClassName : ""}`}>
				{fileName || primaryText}
			</p>
		</div>
	);
};

export default FileDrop;
