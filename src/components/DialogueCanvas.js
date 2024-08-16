import React, { useContext } from "react";

import AppContext from "../AppContext";
import LandingPage from "./LandingPage";
import DialogueEditor from "./DialogueEditor";

import "../componentStyles/DialogueCanvas.css";

const DialogueCanvas = () => {
	const { showLandingPage } = useContext(AppContext);

	const storedProject = JSON.parse(sessionStorage.getItem("selectedProject"));

	return (
		<div className="dialogue-canvas">
			{showLandingPage ? (
				<LandingPage />
			) : (
				<DialogueEditor projectData={storedProject} />
			)}
		</div>
	);
};

export default DialogueCanvas;
