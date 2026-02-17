import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position } from '@xyflow/react';
import { Clock } from 'lucide-react';

/**
 * Delay Node Component
 * - Adds a timed pause to the dialogue flow
 */
const DelayNode = memo(({ data, selected }) => {
	const { t } = useTranslation();
	const isPreviewActive = data?.previewActive;

	const accentColor = '#7dd3fc';
	const accentSoft = 'rgba(125, 211, 252, 0.18)';
	const duration = typeof data.duration === 'number' ? data.duration : 1;

	return (
		<div
			className="min-w-[230px] rounded-lg border-2 bg-card shadow-lg"
			style={{
				borderColor: accentColor,
				boxShadow: selected || isPreviewActive ? `0 0 0 4px ${accentSoft}` : undefined,
			}}
		>
			{/* Input Handle */}
			<Handle
				type="target"
				position={Position.Top}
				className="!w-3 !h-3 !border-2 !border-white"
				style={{ backgroundColor: accentColor }}
			/>

			{/* Header */}
			<div
				className="text-slate-900 px-4 py-2 rounded-t-md flex items-center justify-between"
				style={{ backgroundColor: accentColor }}
			>
				<div className="flex items-center gap-2">
					<Clock className="h-4 w-4" />
					<span className="font-semibold text-sm">
						{data.displayName || t('editor.nodes.delay')}
					</span>
				</div>
				<span className="text-xs font-medium">
					{t('editor.nodes.delaySeconds', { count: duration })}
				</span>
			</div>

			{/* Content */}
			<div className="p-4">
				<p className="text-sm text-foreground">
					{t('editor.nodes.delayDescription', { count: duration })}
				</p>
			</div>

			{/* Output Handle */}
			<Handle
				type="source"
				position={Position.Bottom}
				className="!w-3 !h-3 !border-2 !border-white"
				style={{ backgroundColor: accentColor }}
			/>
		</div>
	);
});

DelayNode.displayName = 'DelayNode';

export default DelayNode;
