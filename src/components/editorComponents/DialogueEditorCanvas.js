import React, { useState, useCallback } from "react";
import ReactFlow, {
  useNodesState,
  useEdgesState,
  Controls,
  reconnectEdge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";

import "reactflow/dist/style.css";
import "../../componentStyles/editorComponentStyles/DialogueEditorCanvas.css";
import "../../base/BaseNodesStyle.css";

import StartNode from "../dialogueNodes/startNode";
import LeadNode from "../dialogueNodes/leadNode";
import AnswerNode from "../dialogueNodes/answerNode";
import CloseDialogueNode from "../dialogueNodes/closeDialogueNode";
import CloseDialogueAutomaticNode from "../dialogueNodes/closeDialogueAutomaticNode";
import JumpToNode from "../dialogueNodes/jumpToNode";

const nodeTypes = {
  startNode: StartNode,
  leadNode: LeadNode,
  answerNode: AnswerNode,
  closeDialogueNode: CloseDialogueNode,
  closeDialogueAutomaticNode: CloseDialogueAutomaticNode,
  jumpToNode: JumpToNode,
};

// THIS IS JUST TESTING EXAMPLES!
/* THIS IS CORRECT:
const initialNodes = [
  {
    id: "0",
    type: "startNode",
    position: { x: 250, y: 0 },
    data: {},
  }
];
*/
const initialNodes = [
  {
    id: "0",
    type: "startNode",
    position: { x: 250, y: 0 },
    data: {},
  },
  {
    id: "1",
    type: "answerNode",
    position: { x: 250, y: 150 },
    data: {},
  },
  {
    id: "2",
    type: "leadNode",
    position: { x: 250, y: 300 },
    data: {},
  },
  {
    id: "3",
    type: "answerNode",
    position: { x: 250, y: 450 },
    data: {},
  },
  {
    id: "4",
    type: "closeDialogueNode",
    position: { x: 500, y: 450 },
    data: {},
  },
  {
    id: "5",
    type: "leadNode",
    position: { x: 250, y: 600 },
    data: {},
  },
  {
    id: "6",
    type: "answerNode",
    position: { x: 250, y: 750 },
    data: {},
  },
  {
    id: "7",
    type: "answerNode",
    position: { x: 500, y: 750 },
    data: {},
  },
  {
    id: "8",
    type: "jumpToNode",
    position: { x: 500, y: 900 },
    data: {},
  },
  {
    id: "9",
    type: "closeDialogueAutomaticNode",
    position: { x: 250, y: 900 },
    data: {},
  },
];

// THIS IS JUST TESTING EXAMPLES!
/* THIS IS CORRECT:
const initialEdges = [];
*/
const initialEdges = [
  { id: "e0-1", source: "0", target: "1", reconnectable: "target" },
  { id: "e1-2", source: "1", target: "2", reconnectable: "target" },
  { id: "e2-3", source: "2", target: "3", reconnectable: "target" },
  { id: "e2-4", source: "2", target: "4", reconnectable: "target" },
  { id: "e3-5", source: "3", target: "5", reconnectable: "target" },
  { id: "e5-6", source: "5", target: "6", reconnectable: "target" },
  { id: "e5-7", source: "5", target: "7", reconnectable: "target" },
  { id: "e7-8", source: "7", target: "8", reconnectable: "target" },
  { id: "e6-9", source: "6", target: "9", reconnectable: "target" },
];

const DialogueEditorCanvas = () => {

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

   const onReconnect = useCallback(
    (oldEdge, newConnection) =>
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    [],
  );
  const onConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    [],
  );

  return (
    <div className="dialogue-editor-canvas background-transparent-primary">
      <ReactFlow
        colorMode="dark"
        
        nodes={nodes}
        edges={edges}

        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        snapToGrid

        onReconnect={onReconnect}
        onConnect={onConnect}

        nodeTypes={nodeTypes}

        maxZoom={1.75}
        minZoom={0.75}
        fitView
      >
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default DialogueEditorCanvas;
