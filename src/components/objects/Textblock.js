import React from "react";

import "../../componentStyles/objects/Textblock.css";

function TextBlock({
	placeholder,
	value,
	onChange,
	name,
	onClick,
	readOnly,
	classState,
	classText,
	maxLength,
	startRows,
}) {
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		onChange(name, value);
	};

	return (
		<div className="textblock">
			<textarea
				name={name}
				value={value}
				onChange={handleInputChange}
				placeholder={placeholder}
				className={`${classState ? classState : "primary"} ${
					classText ? classText : "primary-text"
				}`}
				onClick={onClick}
				readOnly={readOnly}
				maxLength={maxLength}
				rows={startRows}
			/>
		</div>
	);
}

export default TextBlock;
