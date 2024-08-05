import React from "react";

const FileDrop = ({
	type = "file",
	accept = "*/*",
	primaryText = "Drag and drop a file here or click to select",
	onChange,
}) => {
	const handleFileChange = (e) => {
		if (onChange) {
			onChange(e);
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
	};

	const handleDrop = (e) => {
		e.preventDefault();
		if (onChange) {
			const droppedFile = e.dataTransfer.files[0];
			const syntheticEvent = {
				target: {
					files: [droppedFile],
				},
			};
			onChange(syntheticEvent);
		}
	};

	const handleClick = () => {
		document.getElementById("fileInput").click();
	};

	return (
		<div
			className="file-drop-area"
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onClick={handleClick}
		>
			<input
				id="fileInput"
				type={type}
				onChange={handleFileChange}
				accept={accept}
				style={{ display: "none" }}
			/>
			<p className="primary-text">{primaryText}</p>
		</div>
	);
};

export default FileDrop;
