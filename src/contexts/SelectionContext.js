import React, { createContext, useContext, useState } from "react";

const SelectionContext = createContext();

export const SelectionProvider = ({ children }) => {
	const [selectedNode, setSelectedNode] = useState(null);

	const selectNode = (node) => {
		setSelectedNode(node);
	};

	return (
		<SelectionContext.Provider value={{ selectedNode, selectNode }}>
			{children}
		</SelectionContext.Provider>
	);
};

export const useSelection = () => useContext(SelectionContext);
