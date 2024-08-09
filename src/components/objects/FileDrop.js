import React, {
	useState,
	useImperativeHandle,
	forwardRef,
	useEffect,
} from "react";

const FileDrop = forwardRef(
	(
		{
			type = "file",
			accept = "*/*",
			primaryText = "Drag and drop a file here or click to select",
			onChange,
			id,
			containerClassName,
			textClassName,
			initialFile,
		},
		ref
	) => {
		const [fileName, setFileName] = useState("");

		useEffect(() => {
			if (initialFile && initialFile.name) {
				setFileName(initialFile.name);
			} else {
				setFileName("");
			}
		}, [initialFile]);

		useImperativeHandle(ref, () => ({
			clearFile: () => {
				setFileName("");
				document.getElementById(id).value = null;
			},
			setFile: (file) => {
				setFileName(file && file.name ? file.name : "");
			},
		}));

		const handleFileChange = (e) => {
			const file = e.target.files[0];
			if (file) {
				setFileName(file.name);
			}
			if (onChange) {
				onChange(e);
			}
		};

		const handleDragOver = (e) => {
			e.preventDefault();
		};

		const handleDrop = (e) => {
			e.preventDefault();
			const droppedFile = e.dataTransfer.files[0];
			if (droppedFile) {
				setFileName(droppedFile.name);
			}
			if (onChange) {
				const syntheticEvent = {
					target: {
						files: [droppedFile],
					},
				};
				onChange(syntheticEvent);
			}
		};

		const handleClick = () => {
			document.getElementById(id).click();
		};

		return (
			<div
				className={`file-drop-area ${
					containerClassName ? containerClassName : ""
				}`}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				onClick={handleClick}
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
	}
);

export default FileDrop;
