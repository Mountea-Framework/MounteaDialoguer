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
		console.log("FileDrop mounted, id:", id);
	}, [id]);

	const handleFileChange = (e) => {
		console.log("handleFileChange called");
		const file = e.target.files[0];
		if (file && onChange) {
			console.log("File selected:", file.name);
			onChange(e);
		}
	};

	const handleDragOver = (e) => {
		e.preventDefault();
		console.log("Drag over");
	};

	const handleDrop = (e) => {
		e.preventDefault();
		console.log("File dropped");
		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile && onChange) {
			console.log("Dropped file:", droppedFile.name);
			const syntheticEvent = {
				target: {
					files: [droppedFile],
				},
			};
			onChange(syntheticEvent);
		}
	};

	const handleClick = () => {
		console.log("FileDrop clicked, triggering file input");
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
