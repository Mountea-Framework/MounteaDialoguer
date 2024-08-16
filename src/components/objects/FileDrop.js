import React, { useRef, useEffect } from "react";

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
	const fileInputRef = useRef(null);

	useEffect(() => {
	}, [id]);

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

	const handleClick = () => {
		fileInputRef.current.click();
	};

	return (
		<div
			className={`file-drop-area ${containerClassName || ""}`}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
			onClick={handleClick}
		>
			<input
				ref={fileInputRef}
				id={id}
				type={type}
				onChange={handleFileChange}
				accept={accept}
				style={{ display: "none" }}
			/>
			<p className={`primary-text ${textClassName || ""}`}>
				{fileName || primaryText}
			</p>
		</div>
	);
};

export default FileDrop;
