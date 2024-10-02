import React from "react";
import ReactDOM from "react-dom";

import Title from "./Title";

import "../../componentStyles/objects/Modal.css";

const Modal = ({
	title,
	children,
	onClose,
	className,
	titleClassName,
	titleLevel,
}) => {
	return ReactDOM.createPortal(
		<div className="modal-overlay" onClick={onClose}>
			<div
				className={`modal-content ${className}`}
				onClick={(e) => e.stopPropagation()}
			>
				<Title
					level={titleLevel ? titleLevel : 3}
					children={title}
					classState={titleClassName ? titleClassName : 'tertiary-heading'}
				/>
				{children}
			</div>
		</div>,
		document.getElementById("modal-root")
	);
};

export default Modal;
