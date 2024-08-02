import React, { useState, useEffect, useContext } from "react";
import { CSSTransition } from "react-transition-group";

import { useSelection } from "../../contexts/SelectionContext";
import AppContext from "../../AppContext";
import Title from "../objects/Title";
import Dropdown from "../objects/Dropdown";
import TextInput from "../objects/TextInput";
import Button from "../objects/Button";
import ReadOnlyText from "../objects/ReadOnlyText";
import DialogueRow from "./DialogueRow"; // Import the new component

import { ReactComponent as AddIcon } from "../../icons/addIcon.svg";
import { ReactComponent as DeleteIcon } from "../../icons/deleteIcon.svg";

import "../../componentStyles/editorComponentStyles/DialogueEditorDetails.css";

function DialogueEditorDetails({ setNodes }) {
	const { selectedNode } = useSelection();
	const { participants } = useContext(AppContext);
	const [tempNodeData, setTempNodeData] = useState({
		title: "",
		additionalInfo: {
			participant: { name: "Player", category: "" },
			dialogueRows: [],
		},
	});

	const participantOptions = participants.map((participant) => ({
		value: JSON.stringify({
			name: participant.name,
			category: participant.category,
		}),
		label: `${participant.name} (${participant.category})`,
	}));

	useEffect(() => {
		if (selectedNode) {
			setTempNodeData({
				title: selectedNode.data.title,
				additionalInfo: {
					participant: selectedNode.data.additionalInfo?.participant || {
						name: "",
						category: "",
					},
					dialogueRows: selectedNode.data.additionalInfo?.dialogueRows || [],
				},
			});
		}
	}, [selectedNode]);

	const handleInputChange = (name, value) => {
		setTempNodeData((prevData) => ({
			...prevData,
			[name]: value,
		}));
	};

	const handleParticipantInputChange = (name, value) => {
		try {
			const parsedValue = JSON.parse(value);
			console.log("Selected participant:", parsedValue);
			setTempNodeData((prevData) => ({
				...prevData,
				additionalInfo: {
					...prevData.additionalInfo,
					participant: parsedValue,
				},
			}));
		} catch (error) {
			console.error("Error parsing participant value:", error);
		}
	};

	const handleDialogueRowTextChange = (index, text) => {
		const updatedDialogueRows = [...tempNodeData.additionalInfo.dialogueRows];
		updatedDialogueRows[index] = { ...updatedDialogueRows[index], text };
		setTempNodeData((prevData) => ({
			...prevData,
			additionalInfo: {
				...prevData.additionalInfo,
				dialogueRows: updatedDialogueRows,
			},
		}));
	};

	const handleDialogueRowAudioChange = (index, audio) => {
		const updatedDialogueRows = [...tempNodeData.additionalInfo.dialogueRows];
		updatedDialogueRows[index] = { ...updatedDialogueRows[index], audio };
		setTempNodeData((prevData) => ({
			...prevData,
			additionalInfo: {
				...prevData.additionalInfo,
				dialogueRows: updatedDialogueRows,
			},
		}));
	};

	const addDialogueRow = () => {
		setTempNodeData((prevData) => ({
			...prevData,
			additionalInfo: {
				...prevData.additionalInfo,
				dialogueRows: [
					...prevData.additionalInfo.dialogueRows,
					{ text: "", audio: null },
				],
			},
		}));
	};

	const resetDialogueRows = () => {
		setTempNodeData((prevData) => ({
			...prevData,
			additionalInfo: {
				...prevData.additionalInfo,
				dialogueRows: [],
			},
		}));
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
							<div className="node-details-specific">
								<Title
									level="4"
									children="Node Info"
									className="tertiary-heading"
									classState={"tertiary"}
								/>
								{selectedNode.type !== "jumpToNode" ? (
									<div className="node-details-specific-tab">
										<div className="node-info-panel participant-selector">
											<Title
												level="5"
												children="Participant"
												className="tertiary-heading"
												classState={"tertiary"}
											/>
											<Dropdown
												name="participant"
												placeholder="select participant"
												value={JSON.stringify(
													tempNodeData.additionalInfo.participant
												)}
												onChange={handleParticipantInputChange}
												options={participantOptions}
											/>
										</div>
										<div className="node-info-panel ">
											<Title
												level="5"
												children="Dialogue Rows"
												className="tertiary-heading"
												classState={"tertiary"}
											/>
											<div className="dialogue-row-buttons-control">
												<Button
													onClick={addDialogueRow}
													className="circle-button dialogue-row-button"
												>
													<span className={`add-icon icon`}>
														<AddIcon />
													</span>
												</Button>
												<Button
													onClick={resetDialogueRows}
													className="circle-button dialogue-row-button"
												>
													<span className={`remove-icon icon`}>
														<DeleteIcon />
													</span>
												</Button>
											</div>
										</div>
										<div className="dialogue-row-area">
											{tempNodeData.additionalInfo.dialogueRows.map(
												(row, index) => (
													<DialogueRow
														key={index}
														index={index}
														text={row.text}
														audio={row.audio}
														onTextChange={handleDialogueRowTextChange}
														onAudioChange={handleDialogueRowAudioChange}
													/>
												)
											)}
										</div>
									</div>
								) : (
									<div></div>
								)}
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
