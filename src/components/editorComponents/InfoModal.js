import React, { useState, useEffect } from "react";
import Modal from "../objects/Modal";
import Button from "../objects/Button";
import Title from "../objects/Title";
import ReadOnlyText from "../objects/ReadOnlyText";

import projectDetails from "../../config/projectDetails.json";

import {
	FaMousePointer,
	FaKeyboard,
	FaLinkedin,
	FaGithub,
	FaDonate,
	FaDownload,
} from "react-icons/fa";

import "../../componentStyles/editorObjects/InfoModal.css";

const InfoModal = ({ isOpen, onClose }) => {
	const [aboutText, setAboutText] = useState("");
	const [authorText, setAuthorText] = useState("");

	useEffect(() => {
		setAboutText(projectDetails.about);
		setAuthorText(projectDetails.author);
	}, []);

	const shortcuts = [
		{
			icon: <FaMousePointer className="left" />,
			description: "Left click to select",
		},
		{
			icon: <FaKeyboard className="left" />,
			description: "Press 'Esc' to close",
		},
	];

	const links = [
		{
			text: "LinkedIn",
			icon: <FaLinkedin className="icon-large" />,
			url: "https://www.linkedin.com/in/dominik-morse-447168126/",
		},
		{
			text: "GitHub Repo",
			icon: <FaGithub className="icon-large" />,
			url: "https://github.com/Mountea-Framework/MounteaDialoguer",
		},
		{
			text: "Support us",
			icon: <FaDonate className="icon-large" />,
			url: "https://github.com/sponsors/Mountea-Framework",
		},
		{
			text: "Download from Epic Marketplace",
			icon: <FaDownload className="icon-large" />,
			url: "https://www.unrealengine.com/marketplace/en-US/product/mountea-framework-dialogue-system",
		},
	];

	return (
		isOpen && (
			<Modal onClose={onClose} title="Information" className="info-modal">
				<div className="shortcuts-section">
					<Title children={"Shortcuts"} />
					<div className="shortcuts-grid">
						{shortcuts.map((shortcut, index) => (
							<React.Fragment key={index}>
								<div className="shortcut-item">
									<ReadOnlyText
										containerClass={`text-readonly-container left`}
										classState={`secondary left`}
										classText={`secondary-text`}
										value={shortcut.description}
									/>
								</div>
								<div className="icon-container">{shortcut.icon}</div>
							</React.Fragment>
						))}
					</div>
				</div>
				<hr />
				<div className="links-section">
					<Title children={"Links"} />
					<div className="links-grid">
						{links.map((link, index) => (
							<Button
								abbrTitle={link.text}
								key={index}
								containerClassName={`collapsible`}
								className={`circle-button grid-item-button`}
								onClick={() => window.open(link.url, "_blank")}
							>
								{link.icon}
							</Button>
						))}
					</div>
				</div>
				<hr />
				<div className="collapsible-sections">
					<Title children={"About Project"} />
					<div
						className="text-readonly-container collapsible-text-container secondary-text"
						dangerouslySetInnerHTML={{ __html: aboutText }}
					/>
					<Title children={"About Me"} />
					<div
						className="text-readonly-container collapsible-text-container secondary-text"
						dangerouslySetInnerHTML={{ __html: authorText }}
					/>
				</div>
			</Modal>
		)
	);
};

export default InfoModal;
