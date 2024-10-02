import React, { useState, useEffect } from "react";

import "../../componentStyles/objects/Slider.css";

const Slider = ({
	name,
	value,
	onChange,
	min,
	max,
	step,
	className,
	classState,
	abbrTitle,
}) => {
	const [localValue, setLocalValue] = useState(value);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	const handleSliderChange = (e) => {
		const newValue = parseFloat(e.target.value);
		setLocalValue(newValue);
		onChange(name, newValue);
	};

	const handleInputChange = (e) => {
		let newValue = parseFloat(e.target.value);
		if (isNaN(newValue)) {
			newValue = min;
		} else {
			newValue = Math.max(min, Math.min(max, newValue));
		}
		setLocalValue(newValue);
		onChange(name, newValue);
	};

	return (
		<abbr title={abbrTitle} className={`slider-container ${className || ""}`}>
			<input
				type="range"
				name={name}
				value={localValue}
				onChange={handleSliderChange}
				min={min}
				max={max}
				step={step}
				className={`slider ${classState || "primary"}`}
			/>
			<input
				type="number"
				name={`${name}-text`}
				value={localValue}
				onChange={handleInputChange}
				min={min}
				max={max}
				step={step}
				className={`slider-value ${classState || "primary"}`}
			/>
		</abbr>
	);
};

export default Slider;
