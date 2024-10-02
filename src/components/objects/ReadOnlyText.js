import React from "react";

import "../../componentStyles/objects/ReadOnlyText.css";

function ReadOnlyText({ value, classState, classText, maxLength, containerClass }) {
	return (
		<div className={`${containerClass ? containerClass : "text-readonly-container"}`}>
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
