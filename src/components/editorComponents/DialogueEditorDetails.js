import React, {
	useState,
	useEffect,
	useContext,
	useRef,
	useCallback,
} from "react";
import { useReactFlow } from "reactflow";
import { CSSTransition } from "react-transition-group";
import { v4 as uuidv4 } from "uuid";

import { useSelection } from "../../contexts/SelectionContext";
import { FileContext } from "../../FileProvider";
import AppContext from "../../AppContext";
import { useAutoSave } from "../../hooks/useAutoSave";
import debounce from "../../helpers/debounce";

import Title from "../objects/Title";
import Dropdown from "../objects/Dropdown";
import TextInput from "../objects/TextInput";
import Button from "../objects/Button";
import ReadOnlyText from "../objects/ReadOnlyText";
import DialogueRow from "./DialogueRow";

import nodeFormConfig from "../../config/nodeForm.json";

import { ReactComponent as AddIcon } from "../../icons/addIcon.svg";
import { ReactComponent as DeleteIcon } from "../../icons/deleteIcon.svg";
import { ReactComponent as ImportIcon } from "../../icons/uploadIcon.svg";
import { ReactComponent as ExportIcon } from "../../icons/downloadIcon.svg";

import "../../componentStyles/editorComponentStyles/DialogueEditorDetails.css";

function DialogueEditorDetails({ setNodes }) {
	const { getNodes } = useReactFlow();
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

	const { saveProjectToIndexedDB } = useAutoSave();

	const debouncedForceUpdateRef = useRef();
	const debouncedSaveToIndexedDBRef = useRef();

	useEffect(() => {
		if (selectedNode) {
			setTempNodeData(selectedNode.data);
		} else {
			setTempNodeData({});
		}
	}, [selectedNode]);

	useEffect(() => {
		debouncedForceUpdateRef.current = debounce((nodeId) => {
			if (selectedNode && selectedNode.data.forceNodeUpdate) {
				selectedNode.data.forceNodeUpdate(nodeId);
			}
		}, 500);

		debouncedSaveToIndexedDBRef.current = debounce((nodeData) => {
			saveProjectToIndexedDB({
				nodes: [nodeData],
			});
		}, 500);
	}, [selectedNode, saveProjectToIndexedDB]);

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

			if (debouncedSaveToIndexedDBRef.current) {
				debouncedSaveToIndexedDBRef.current({
					id: selectedNode.id,
					data: {
						...selectedNode.data,
						title: tempNodeData.title,
						additionalInfo: tempNodeData.additionalInfo,
					},
				});
			}

			if (debouncedForceUpdateRef.current) {
				debouncedForceUpdateRef.current(selectedNode.id);
			}
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

	const importDialogueRows = () => {
		// Implementation for importing dialogue rows
	};

	const processExportDialogueRows = () => {
		const projectGuid = sessionStorage.getItem("project-guid");
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

	const handleTargetChange = useCallback((name, selectedNodeId) => {
		console.log(`Selected Node: ${selectedNodeId}`);
		try {
			setTempNodeData((prevData) => ({
				...prevData,
				additionalInfo: {
					...prevData.additionalInfo,
					targetNodeId: selectedNodeId,
				},
			}));
		} catch (error) {
			console.error("Error updating selectedNodeID: ", error);
		}
	}, []);

	const renderField = (field) => {
		switch (field.type) {
			case "text":
				return (
					<TextInput
						key={field.name}
						title={field.label}
						placeholder={tempNodeData[field.name]}
						name={field.name}
						value={tempNodeData[field.name]}
						onChange={handleInputChange}
						maxLength={field.maxLength}
						readOnly={field.readOnly}
					/>
				);
			case "dropdown":
				if (field.name === "targetNode") {
					const nodeOptions = getNodes()
						.filter(
							(node) =>
								node.id !== selectedNode.id ||
								node.data.customClassName !== "start-node"
						)
						.map((node) => ({
							value: node.id,
							label: node.data.title || `Node ${node.id}`,
						}));
					return (
						<Dropdown
							key={field.name}
							name={field.name}
							placeholder={`Select ${field.label}`}
							value={tempNodeData.targetNodeId || ""}
							onChange={handleTargetChange}
							options={nodeOptions}
							required={true}
						/>
					);
				} else {
					return (
						<Dropdown
							key={field.name}
							name={field.name}
							placeholder={`select ${field.name}`}
							value={JSON.stringify(tempNodeData.additionalInfo.participant)}
							onChange={handleParticipantInputChange}
							options={participants.map((p) => ({
								value: JSON.stringify(p),
								label: `${p.name} (${p.category})`,
							}))}
							required={true}
						/>
					);
				}
			case "dialogueRows":
				return (
					<div key={field.name} className="node-info-panel">
						<div className="dialogue-row-buttons-control">
							<Button
								abbrTitle="Add new Dialogue Row"
								onClick={addDialogueRow}
								className="circle-button dialogue-row-button"
							>
								<span className="add-icon icon">
									<AddIcon />
								</span>
							</Button>
							<Button
								abbrTitle="Import Dialogue Rows (JSON)\nCurrent rows will be overridden!"
								onClick={importDialogueRows}
								className="circle-button dialogue-row-button"
							>
								<span className="import-icon icon">
									<ImportIcon />
								</span>
							</Button>
							<Button
								abbrTitle="Export Dialogue Rows (JSON)"
								onClick={processExportDialogueRows}
								className="circle-button dialogue-row-button"
							>
								<span className="export-icon icon">
									<ExportIcon />
								</span>
							</Button>
							<Button
								abbrTitle="Delete all Dialogue Rows"
								onClick={resetDialogueRows}
								className="circle-button dialogue-row-button"
							>
								<span className="remove-icon icon">
									<DeleteIcon />
								</span>
							</Button>
						</div>
						<div className="dialogue-row-area">
							{tempNodeData.additionalInfo?.dialogueRows?.map((row, index) => (
								<DialogueRow
									id={row.id}
									key={row.id}
									index={index}
									text={row.text}
									audio={row.audio}
									onTextChange={handleDialogueRowTextChange}
									onAudioChange={handleDialogueRowAudioChange}
									onDelete={deleteDialogueRow}
								/>
							))}
						</div>
					</div>
				);
			default:
				return null;
		}
	};

	const nodeType = selectedNode
		? selectedNode.type || "defaultNode"
		: "defaultNode";
	const config = nodeFormConfig[nodeType] || nodeFormConfig.defaultNode;

	return (
		<div className="dialogue-editor-details background-secondary">
			<Title
				level="3"
				children="Details"
				className="tertiary-heading"
				classState="tertiary"
			/>
			<div className="node-details">
				{selectedNode ? (
					<div>{config.fields.map(renderField)}</div>
				) : (
					<CSSTransition
						in={!selectedNode}
						timeout={300}
						classNames="fade"
						unmountOnExit
					>
						<ReadOnlyText value="No node selected" />
					</CSSTransition>
				)}
			</div>
		</div>
	);
}

export default DialogueEditorDetails;
