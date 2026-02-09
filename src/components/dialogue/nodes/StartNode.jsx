import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';

/**
 * Start Node Component
 * - Automatically added to new dialogues
 * - Cannot be deleted
 * - Only has output handles (no inputs)
 */
const StartNode = memo(({ data, selected }) => {
	const { t } = useTranslation();

	return (
		<div
			className={`
				min-w-[200px] rounded-lg border-2 bg-card shadow-lg
				${selected ? 'border-primary ring-2 ring-primary/20' : 'border-green-500'}
			`}
		>
			{/* Header */}
			<div className="bg-green-500 text-white px-4 py-2 rounded-t-md flex items-center gap-2">
				<Play className="h-4 w-4" />
				<span className="font-semibold text-sm">
					{data.displayName || t('editor.nodes.start')}
				</span>
			</div>

			{/* Content */}
			<div className="p-4">
				<p className="text-xs text-muted-foreground">
					{t('editor.nodes.startDescription')}
				</p>
			</div>

			{/* Output Handle */}
			<Handle
				type="source"
				position={Position.Bottom}
				className="!bg-green-500 !w-3 !h-3 !border-2 !border-white"
			/>
		</div>
	);
});

StartNode.displayName = 'StartNode';

export default StartNode;
