import React, { useState, useCallback } from "react";
import ReactFlow, {
  addEdge,
  Controls,
  applyNodeChanges,
  applyEdgeChanges,
} from "reactflow";

import "reactflow/dist/style.css";
import "../../componentStyles/editorComponentStyles/DialogueEditorCanvas.css";
import "../../base/BaseNodesStyle.css";

import StartNode from "../dialogueNodes/startNode";
import LeadNode from "../dialogueNodes/leadNode";
import AnswerNode from "../dialogueNodes/answerNode";
import CloseDialogueNode from "../dialogueNodes/closeDialogueNode"
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

const initialNodes = [
  {
    id: "0",
    type: "startNode",
    position: { x: 250, y: 0 },
    data: {  },
  },
  {
    id: "1",
    type: "leadNode",
    position: { x: 250, y: 250 },
    data: {  },
  }
];

const initialEdges = [{ id: 'e1-2', source: '0', target: '1' }];

const DialogueEditorCanvas = () => {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );
  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  return (
    <div className="dialogue-editor-canvas background-transparent-primary">
      <ReactFlow
        colorMode="dark"
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default DialogueEditorCanvas;
