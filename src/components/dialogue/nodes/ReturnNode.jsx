import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position } from '@xyflow/react';
import { CornerUpLeft, Hash } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

/**
 * Return to Node Component
 * - Only has input handle (no outputs)
 * - No decorators
 * - Has node selector to specify which node to return to
 */
const ReturnNode = memo(({ data, selected }) => {
	const { t } = useTranslation();
	const isPreviewActive = data?.previewActive;
	const { getNodes } = useReactFlow();
	const nodes = getNodes();

	// Find the target node to display its label
	const targetNode = nodes.find((n) => n.id === data.targetNode);
	const targetLabel =
		targetNode?.data?.displayName ||
		targetNode?.data?.label ||
		t('editor.nodes.returnSelectNode');
	const targetId = data.targetNode ? data.targetNode.substring(0, 8) : '';

	return (
		<div
			className={`
				min-w-[220px] rounded-lg border-2 bg-card shadow-lg
				${selected || isPreviewActive ? 'border-primary ring-2 ring-primary/20' : 'border-orange-500'}
			`}
		>
			{/* Input Handle */}
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-orange-500 !w-3 !h-3 !border-2 !border-white"
			/>

			{/* Header */}
			<div className="bg-orange-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
				<CornerUpLeft className="h-4 w-4" />
				<span className="font-semibold text-sm">
					{data.displayName || t('editor.nodes.return')}
				</span>
			</div>

			{/* Content */}
			<div className="p-4 space-y-2">
				<div className="text-xs text-muted-foreground">
					{t('editor.nodes.returnTarget')}
				</div>
				<div className="font-medium text-sm text-foreground">{targetLabel}</div>
				{targetId && (
					<div className="flex items-center gap-1 text-xs text-muted-foreground">
						<Hash className="h-3 w-3" />
						<code>{targetId}</code>
					</div>
				)}
			</div>
		</div>
	);
});

ReturnNode.displayName = 'ReturnNode';

export default ReturnNode;
