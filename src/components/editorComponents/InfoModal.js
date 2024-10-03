import React, { useState, useEffect } from "react";
import Modal from "../objects/Modal";
import Button from "../objects/Button";
import Title from "../objects/Title";
import ReadOnlyText from "../objects/ReadOnlyText";

import projectDetails from "../../config/projectDetails.json";

import { FaDiscord, FaLinkedin, FaGithub, FaUnity } from "react-icons/fa";
import {
	PiMouseLeftClickFill,
	PiMouseRightClickFill,
	PiMouseMiddleClickFill,
} from "react-icons/pi";
import { FaDeleteLeft } from "react-icons/fa6";
import { MdAttachMoney } from "react-icons/md";
import { SiUnrealengine, SiGodotengine, SiCryengine } from "react-icons/si";

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
			icon: <PiMouseLeftClickFill className="icon-mid left" />,
			description: "Left click to select",
		},
		{
			icon: <PiMouseRightClickFill className="icon-mid left" />,
			description: "Right click to create new node",
		},
		{
			icon: <PiMouseMiddleClickFill className="icon-mid left" />,
			description: "Hold to move around",
		},
		{
			icon: <FaDeleteLeft className="icon-mid left" />,
			description: "Press 'Delete' to close",
		},
	];

	const links = [
		{
			text: "GitHub Repo",
			icon: <FaGithub className="icon-large" />,
			url: "https://github.com/Mountea-Framework/MounteaDialoguer",
			enabled: true,
		},
		{
			text: "LinkedIn",
			icon: <FaLinkedin className="icon-large" />,
			url: "https://www.linkedin.com/in/dominik-morse-447168126/",
			enabled: true,
		},		
		{
			text: "Support us",
			icon: <MdAttachMoney className="icon-large" />,
			url: "https://github.com/sponsors/Mountea-Framework",
			enabled: true,
		},
		{
			text: "Open Support Discord",
			icon: <FaDiscord className="icon-large" />,
			url: "https://discord.gg/waYT2cn37z",
			enabled: true,
		},
		{
			text: "Download from Epic Marketplace\nMountea Dialogue System\nAre you Unity developer? Feel free to reach out!",
			icon: <SiUnrealengine className="icon-large" />,
			url: "https://www.unrealengine.com/marketplace/en-US/product/mountea-framework-dialogue-system",
			enabled: true,
		},
		{
			text: "Download from Unity Asset Store\nUnity support is not yet ready\nAre you Unity developer? Feel free to reach out!",
			icon: <FaUnity className="icon-large" />,
			url: "https://assetstore.unity.com/",
			enabled: false,
		},
		{
			text: "Download from Godot Asset Library\nGodot support is not yet ready\nAre you Godot developer? Feel free to reach out!",
			icon: <SiGodotengine className="icon-large" />,
			url: "https://godotengine.org/asset-library/asset",
			enabled: false,
		},
		{
			text: "Download from Cryengine Asset Database\nCryengine support is not yet ready\nAre you Cryengine developer? Feel free to reach out!",
			icon: <SiCryengine className="icon-large" />,
			url: "https://www.cryengine.com/marketplace",
			enabled: false,
		},
	];

	return (
		isOpen && (
			<Modal
				onClose={onClose}
				title="Information"
				className="info-modal"
				titleClassName="primary-heading"
				titleLevel="2"
			>
				<div className="shortcuts-section">
					<Title children={"Shortcuts"} className={`secondary-heading`} />
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
					<Title children={"Links"} className={`secondary-heading`} />
					<div className="links-grid">
						{links.map((link, index) => (
							<Button
								abbrTitle={link.text}
								key={index}
								containerClassName={`collapsible`}
								className={`circle-button grid-item-button`}
								onClick={() => window.open(link.url, "_blank")}
								disabled={!link.enabled}
							>
								<div className="icon-container">{link.icon}</div>
							</Button>
						))}
					</div>
				</div>
				<hr />
				<div className="collapsible-sections">
					<Title children={"About Project"} className={`secondary-heading`} />
					<div
						className="text-readonly-container collapsible-text-container secondary-text"
						dangerouslySetInnerHTML={{ __html: aboutText }}
					/>
					<Title children={"About Me"} className={`secondary-heading`} />
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
