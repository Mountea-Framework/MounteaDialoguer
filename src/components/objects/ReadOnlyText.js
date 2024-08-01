import React from "react";

import "../../componentStyles/objects/ReadOnlyText.css";

function ReadOnlyText({ value, classState, classText, maxLength }) {
	return (
		<div className="text-readonly-container">
			<p
				value={value}
				className={`${classState ? classState : "primary"} ${
					classText ? classText : "primary-text"
				}`}
				maxLength={maxLength}
			>
				{value}
			</p>
		</div>
	);
}

export default ReadOnlyText;
