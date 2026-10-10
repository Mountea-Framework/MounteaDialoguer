import StartNode from '@/components/dialogue/nodes/StartNode';
import LeadNode from '@/components/dialogue/nodes/LeadNode';
import AnswerNode from '@/components/dialogue/nodes/AnswerNode';
import ReturnNode from '@/components/dialogue/nodes/ReturnNode';
import OpenChildGraphNode from '@/components/dialogue/nodes/OpenChildGraphNode';
import CompleteNode from '@/components/dialogue/nodes/CompleteNode';
import PlaceholderNode from '@/components/dialogue/nodes/PlaceholderNode';
import DelayNode from '@/components/dialogue/nodes/DelayNode';
import ConditionEdge from '@/components/dialogue/edges/ConditionEdge';

// Same keys as the editor route, without the context-menu wrappers.
export const nodeTypes = {
	startNode: StartNode,
	leadNode: LeadNode,
	answerNode: AnswerNode,
	returnNode: ReturnNode,
	openChildGraphNode: OpenChildGraphNode,
	completeNode: CompleteNode,
	delayNode: DelayNode,
	placeholderNode: PlaceholderNode,
};
export const edgeTypes = { conditionEdge: ConditionEdge };
