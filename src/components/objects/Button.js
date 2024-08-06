import React, { useRef } from "react";

import "../../componentStyles/objects/Button.css";

function Button({
	onClick,
	children,
	disabled,
	className,
	classState,
	containerClassName,
	buttonStyle,
	abbrTitle,
	buttonType,
}) {
	const buttonRef = useRef(null);

	const handleClick = (e) => {
		if (buttonRef.current) {
			buttonRef.current.blur();
		}
		if (typeof onClick === "function") {
			onClick(e);
		}
	};

	return (
		<abbr
			title={abbrTitle}
			className={`button-container ${
				containerClassName ? containerClassName : ""
			}`}
		>
			<button
				type={buttonType}
				style={buttonStyle}
				ref={buttonRef}
				className={`${classState ? classState : "primary"} ${
					className ? className : "custom-button"
				}`}
				onClick={handleClick}
				disabled={disabled}
			>
				{children}
			</button>
		</abbr>
	);
}

export default Button;
