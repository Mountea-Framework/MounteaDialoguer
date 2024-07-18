import React, { useState, useCallback } from 'react';
import ReactFlow, { addEdge, MiniMap, Controls, Background, applyNodeChanges, applyEdgeChanges } from 'reactflow';

import 'reactflow/dist/style.css';
import "../../componentStyles/editorComponentStyles/DialogueEditorCanvas.css";

const initialNodes = [
  { id: '1', type: 'input', data: { label: 'Start Node' }, position: { x: 250, y: 0 } }
];

const initialEdges = [];

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
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <MiniMap />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default DialogueEditorCanvas;
