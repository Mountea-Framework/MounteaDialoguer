import React from "react";

import "../../componentStyles/objects/TextInput.css";

function TextInput({
	placeholder,
	value,
	onChange,
	name,
	onClick,
	readOnly,
	classState,
	classText,
	maxLength,
}) {
	const handleInputChange = (e) => {
		const { name, value } = e.target;
		onChange(name, value);
	};

	return (
		<div className="text-input-container">
			<input
				type="text"
				name={name}
				value={value}
				onChange={handleInputChange}
				placeholder={placeholder}
				className={`${classState ? classState : "primary"} ${
					classText ? classText : "primary-text"
				}`}
				onClick={onClick}
				readOnly={readOnly}
				maxLength={maxLength} // Add maxLength property
			/>
		</div>
	);
}

export default TextInput;
