import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position } from '@xyflow/react';
import { ExternalLink, Hash } from 'lucide-react';
import { useDialogueStore } from '@/stores/dialogueStore';

/**
 * Open Child Graph Node Component
 * - Only has input handle (no outputs)
 * - Opens another dialogue in the same project
 */
const OpenChildGraphNode = memo(({ data, selected }) => {
	const { t } = useTranslation();
	const isPreviewActive = data?.previewActive;
	const dialogues = useDialogueStore((state) => state.dialogues);

	const targetDialogue = dialogues.find((dialogue) => dialogue.id === data.targetDialogue);
	const targetLabel = targetDialogue?.name || t('editor.nodes.openChildGraphSelectDialogue');
	const targetId = data.targetDialogue ? data.targetDialogue.substring(0, 8) : '';

	return (
		<div
			className={`
				min-w-[220px] rounded-lg border-2 bg-card shadow-lg
				${selected || isPreviewActive ? 'border-primary ring-2 ring-primary/20' : 'border-cyan-500'}
			`}
		>
			<Handle
				type="target"
				position={Position.Top}
				className="!bg-cyan-500 !w-3 !h-3 !border-2 !border-white"
			/>

			<div className="bg-cyan-500 text-slate-900 px-4 py-2 rounded-t-md flex items-center gap-2">
				<ExternalLink className="h-4 w-4" />
				<span className="font-semibold text-sm">
					{data.displayName || t('editor.nodes.openChildGraph')}
				</span>
			</div>

			<div className="p-4 space-y-2">
				<div className="text-xs text-muted-foreground">
					{t('editor.nodes.openChildGraphTarget')}
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

OpenChildGraphNode.displayName = 'OpenChildGraphNode';

export default OpenChildGraphNode;
