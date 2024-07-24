import React, { useContext } from "react";

import { FileContext } from "../../FileProvider";

const FileDrop = ({ setProjectData, onSelectProject }) => {
	const {
		file,
		error,
		handleFileChange,
		handleDragOver,
		handleDrop,
		handleClick,
	} = useContext(FileContext);

	return (
		<div
			className="file-drop-area"
			onDragOver={handleDragOver}
			onDrop={(e) => handleDrop(e, setProjectData, onSelectProject)}
			onClick={handleClick}
		>
			<input
				id="fileInput"
				type="file"
				onChange={(e) => handleFileChange(e, setProjectData, onSelectProject)}
				accept=".mnteadlg"
				style={{ display: "none" }}
			/>
			{error ? (
				<p className="error">{error}</p>
			) : file ? (
				<p>{file.name}</p>
			) : (
				<p className="primary-text">
					Drag and drop a .mnteadlg file here or click to select
				</p>
			)}
		</div>
	);
};

export default FileDrop;
