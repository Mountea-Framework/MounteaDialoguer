import React, { useState, useEffect, useContext } from "react";
import { CSSTransition } from "react-transition-group";
import { v4 as uuidv4 } from "uuid";

import { useSelection } from "../../contexts/SelectionContext";
import { FileProvider, FileContext } from "../../FileProvider";
import AppContext from "../../AppContext";
import Title from "../objects/Title";
import Dropdown from "../objects/Dropdown";
import TextInput from "../objects/TextInput";
import Button from "../objects/Button";
import ReadOnlyText from "../objects/ReadOnlyText";
import DialogueRow from "./DialogueRow";

import { ReactComponent as AddIcon } from "../../icons/addIcon.svg";
import { ReactComponent as DeleteIcon } from "../../icons/deleteIcon.svg";
import { ReactComponent as ImportIcon } from "../../icons/uploadIcon.svg";
import { ReactComponent as ExportIcon } from "../../icons/downloadIcon.svg";

import "../../componentStyles/editorComponentStyles/DialogueEditorDetails.css";

function DialogueEditorDetails({ setNodes }) {
	const { selectedNode } = useSelection();
	const { exportDialogueRows } = useContext(FileContext);
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
		} else {
			// Reset tempNodeData when no node is selected
			setTempNodeData({
				title: "",
				additionalInfo: {
					participant: { name: "Player", category: "" },
					dialogueRows: [],
				},
			});
		}
	}, [selectedNode]);

	useEffect(() => {
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
	}, [selectedNode, tempNodeData, setNodes]);

	const handleInputChange = (name, value) => {
		setTempNodeData((prevData) => ({
			...prevData,
			[name]: value,
		}));
	};

	const handleParticipantInputChange = (name, value) => {
		try {
			const parsedValue = JSON.parse(value);
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
		const newId = uuidv4();
		setTempNodeData((prevData) => ({
			...prevData,
			additionalInfo: {
				...prevData.additionalInfo,
				dialogueRows: [
					...prevData.additionalInfo.dialogueRows,
					{ id: newId, text: "", audio: null },
				],
			},
		}));
	};

	const importDialogueRows = () => {};

	const processExportDialogueRows = () => {
		const projectGuid = localStorage.getItem("project-guid");
		if (projectGuid) {
			exportDialogueRows(projectGuid);
		} else {
			console.error("No project GUID found in local storage.");
		}
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

	const deleteDialogueRow = (index) => {
		const updatedDialogueRows = tempNodeData.additionalInfo.dialogueRows.filter(
			(_, i) => i !== index
		);
		setTempNodeData((prevData) => ({
			...prevData,
			additionalInfo: {
				...prevData.additionalInfo,
				dialogueRows: updatedDialogueRows,
			},
		}));
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
												required={true}
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
													abbrTitle={"Add new Dialogue Row"}
													onClick={addDialogueRow}
													className="circle-button dialogue-row-button"
												>
													<span className={`add-icon icon`}>
														<AddIcon />
													</span>
												</Button>
												<Button
													abbrTitle={
														"Import Dialogue Rows (JSON)\nCurrent rows will be overriden!"
													}
													onClick={importDialogueRows}
													className="circle-button dialogue-row-button"
												>
													<span className={`import-icon icon`}>
														<ImportIcon />
													</span>
												</Button>
												<Button
													abbrTitle={"Export Dialogue Rows (JSON)"}
													onClick={processExportDialogueRows}
													className="circle-button dialogue-row-button"
												>
													<span className={`export-icon icon`}>
														<ExportIcon />
													</span>
												</Button>

												<Button
													abbrTitle={"Delete all Dialogue Rows"}
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
														id={row.id}
														key={index}
														index={index}
														text={row.text}
														audio={row.audio}
														onTextChange={handleDialogueRowTextChange}
														onAudioChange={handleDialogueRowAudioChange}
														onDelete={deleteDialogueRow}
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
		</div>
	);
}

export default DialogueEditorDetails;
