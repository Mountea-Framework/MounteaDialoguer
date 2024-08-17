import React, { useState, useRef, useEffect, useCallback } from "react";
import ContentEditable from "react-contenteditable";
import "../../componentStyles/objects/Textblock.css";

const suggestions = ["player", "participant"];

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
	isRequired,
	useSuggestions,
}) {
	const [html, setHtml] = useState(value);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [suggestionIndex, setSuggestionIndex] = useState(-1);
	const contentEditableRef = useRef(null);

	useEffect(() => {
		setHtml(value);
	}, [value]);

	const handleInputChange = (e) => {
		const newValue = e.target.value;
		setHtml(newValue);
		onChange(name, newValue);

		// Detect if the user has typed "${"
		if (useSuggestions && newValue.endsWith("${")) {
			setShowSuggestions(true);
		} else {
			setShowSuggestions(false);
		}
	};

	const handleSuggestionClick = useCallback(
		(suggestion) => {
			const newValue = html.replace(/\${$/, `\${${suggestion}}`);
			setHtml(newValue);
			onChange(name, newValue);
			setShowSuggestions(false);
			contentEditableRef.current.focus();
		},
		[html, name, onChange]
	);

	const handleChange = (evt) => {
		let newValue = evt.target.value;

		// Sanitize input to remove existing highlights
		newValue = newValue.replace(/<\/?span[^>]*>/g, "");

		setHtml(newValue);
		onChange(name, newValue);

		// Detect if the user has typed "${"
		if (useSuggestions && newValue.endsWith("${")) {
			setShowSuggestions(true);
		} else {
			setShowSuggestions(false);
		}
	};

	const formatText = (text) => {
		const regex = /\$\{(.*?)\}/g;
		return text.replace(regex, '<span class="variable-highlight">$&</span>');
	};

	const handleKeyDown = useCallback(
		(event) => {
			if (!showSuggestions) return;

			if (event.key === "ArrowDown") {
				setSuggestionIndex((prevIndex) =>
					prevIndex < suggestions.length - 1 ? prevIndex + 1 : prevIndex
				);
			} else if (event.key === "ArrowUp") {
				setSuggestionIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : 0));
			} else if (event.key === "Enter" && suggestionIndex >= 0) {
				handleSuggestionClick(suggestions[suggestionIndex]);
			}
		},
		[showSuggestions, suggestionIndex, handleSuggestionClick]
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleKeyDown]);

	if (!useSuggestions) {
		return (
			<div className="textblock">
				<textarea
					name={name}
					value={value}
					onChange={(e) => handleInputChange(e)}
					placeholder={placeholder}
					className={`${classState ? classState : "primary"} ${
						classText ? classText : "primary-text"
					} editable-div`}
					readOnly={readOnly}
					rows={startRows}
					maxLength={maxLength}
					required={isRequired}
				/>
			</div>
		);
	}

	return (
		<div className="textblock">
			<ContentEditable
				innerRef={contentEditableRef}
				html={formatText(html)}
				disabled={readOnly}
				onChange={handleChange}
				tagName="div"
				placeholder={placeholder}
				className={`${classState ? classState : "primary"} ${
					classText ? classText : "primary-text"
				} editable-div`}
				required={isRequired}
			/>
			{showSuggestions && (
				<div className="suggestions">
					{suggestions.map((suggestion, index) => (
						<div
							key={index}
							className={`suggestion ${
								index === suggestionIndex ? "selected" : ""
							}`}
							onMouseDown={() => handleSuggestionClick(suggestion)}
						>
							{suggestion}
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default TextBlock;
