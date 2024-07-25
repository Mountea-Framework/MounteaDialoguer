import React from "react";
import PropTypes from "prop-types";

function Title({ level, children, className, classState, maxLength }) {
	const Heading = `h${Number(level)}`;
	const text = children;

	const clampedText = (text, maxLength) => {
		if (text.length > maxLength) {
			return text.substring(0, maxLength - 3) + "...";
		}
		return text;
	};

	const effectiveMaxLength = maxLength != null ? maxLength : 32;

	return (
		<Heading
			className={`${classState ? classState : "primary"} ${
				className ? className : "primary-heading"
			}`}
		>
			{clampedText(text, effectiveMaxLength)}
		</Heading>
	);
}

Title.propTypes = {
	level: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
	children: PropTypes.node.isRequired,
	className: PropTypes.string,
	classState: PropTypes.string,
	maxLength: PropTypes.number,
};

Title.defaultProps = {
	level: 1,
	maxLength: null,
};

export default Title;
