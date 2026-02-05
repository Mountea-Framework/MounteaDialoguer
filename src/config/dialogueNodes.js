import nodeDefinitions from './dialogueNodes.json';

export const NODE_DEFINITIONS = nodeDefinitions;

export const getNodeDefinition = (type) => NODE_DEFINITIONS[type];

export const getNodeDefinitionsList = () => Object.values(NODE_DEFINITIONS);

export const getCreatableNodeDefinitions = () =>
	Object.values(NODE_DEFINITIONS).filter((definition) => definition.creatable);

export const getNodeDefaultData = (type) =>
	NODE_DEFINITIONS[type]?.defaultData || {};
