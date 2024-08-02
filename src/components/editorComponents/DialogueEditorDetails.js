import React, { useState, useEffect, useContext } from "react";
import { CSSTransition } from "react-transition-group";

import { useSelection } from "../../contexts/SelectionContext";
import AppContext from "../../AppContext";
import Title from "../objects/Title";
import Dropdown from "../objects/Dropdown";
import TextInput from "../objects/TextInput";
import Button from "../objects/Button";
import ReadOnlyText from "../objects/ReadOnlyText";

import "../../componentStyles/editorComponentStyles/DialogueEditorDetails.css";

function DialogueEditorDetails({ setNodes }) {
	const { selectedNode } = useSelection();
	const { participants } = useContext(AppContext);
	const [tempNodeData, setTempNodeData] = useState({
		title: "",
		additionalInfo: { participant: "Player", dialogueRows: [] },
	});

	const particiapntOptions = participants.map((participant) => ({
		value: participant,
		label: participant.name
			? `${participant.name} - ${participant.category}`
			: `invalid`,
	}));

	useEffect(() => {
		if (selectedNode) {
			setTempNodeData({
				title: selectedNode.data.title,
				additionalInfo: selectedNode.data.additionalInfo || {
					participant: "Player",
					dialogueRows: [],
				},
			});
		}
	}, [selectedNode]);

	const handleInputChange = (name, value) => {
		setTempNodeData((prevData) => ({
			...prevData,
			additionalInfo: {
				...prevData.additionalInfo,
				[name]: value,
			},
		}));
	};

	const handleParticipantInputChange = (participant) => {
		console.log(participant);
	};

	const handleConfirmChanges = () => {
		if (selectedNode) {
			setNodes((nds) =>
				nds.map((node) =>
					node.id === selectedNode.id
						? {
								...node,
								data: {
									...node.data,
									title: tempNodeData.title,
									additionalInfo: tempNodeData.additionalInfo,
								},
						  }
						: node
				)
			);
		}
	};

	return (
		<div className="dialogue-editor-details background-secondary">
			<Title
				level="3"
				children="Details"
				className="tertiary-heading"
				classState={"tertiary"}
			/>

			<div className="node-details">
				{selectedNode ? (
					selectedNode.type !== "startNode" ? (
						<div>
							<div className="node-details-generic">
								<div className="node-details-c1">
									<Title
										level="4"
										children="Node Title"
										className="tertiary-heading"
										classState={"tertiary"}
									/>
									<div />
								</div>
								<div className="node-details-c2">
									<TextInput
										title="Node Title"
										placeholder={tempNodeData.title}
										name="title"
										value={tempNodeData.title}
										onChange={(name, value) => handleInputChange(name, value)}
										maxLength={32}
										readOnly={false}
									/>
								</div>
							</div>
							<div>
								<Title
									level="4"
									children="Node Info"
									className="tertiary-heading"
									classState={"tertiary"}
								/>
								<div className="node-info-panel">
									<Title
										level="5"
										children="Participant"
										className="tertiary-heading"
										classState={"tertiary"}
									/>
									<Dropdown
										name="participant"
										placeholder="select participant"
										value={tempNodeData.additionalInfo.participant}
										onChange={handleParticipantInputChange}
										options={particiapntOptions}
									/>
								</div>
							</div>
						</div>
					) : (
						<div className="node-details-generic">
							<div className="node-details-c1">
								<Title
									level="4"
									children="Node Title"
									className="tertiary-heading"
									classState={"tertiary"}
								/>
								<div />
							</div>
							<div className="node-details-c2">
								<TextInput
									title="Node Title"
									placeholder={tempNodeData.title}
									name="title"
									value={tempNodeData.title}
									onChange={(name, value) => handleInputChange(name, value)}
									maxLength={32}
									readOnly={true}
								/>
							</div>
						</div>
					)
				) : (
					<CSSTransition
						in={!selectedNode}
						timeout={300}
						classNames="fade"
						unmountOnExit
					>
						<ReadOnlyText value={"No node selected"} />
					</CSSTransition>
				)}
			</div>
			{selectedNode && selectedNode.type !== "startNode" && (
				<div className="node-details-confirmation">
					<Button onClick={handleConfirmChanges}>Confirm</Button>
				</div>
			)}
		</div>
	);
}

export default DialogueEditorDetails;
