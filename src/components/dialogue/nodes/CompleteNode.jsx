import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Handle, Position } from '@xyflow/react';
import { CheckCircle2, Volume2, Tag, User } from 'lucide-react';

/**
 * Complete Node Component
 * - Only has input handle (no outputs)
 * - Supports decorators, dialogue rows, participant selection, and audio
 * - Marks dialogue completion
 */
const CompleteNode = memo(({ data, selected }) => {
	const { t } = useTranslation();
	const isPreviewActive = data?.previewActive;

	const accentColor = '#CC2100';
	const accentSoft = 'rgba(204, 33, 0, 0.12)';
	// Get dialogue rows or fallback to legacy text
	const dialogueRows = data.dialogueRows || (data.text ? [{ text: data.text }] : []);
	const firstRow = dialogueRows[0];
	const hasMultipleRows = dialogueRows.length > 1;
	const previewText = firstRow?.text
		? firstRow.text.length > 50
			? firstRow.text.substring(0, 50) + '...'
			: firstRow.text
		: t('editor.nodes.completePlaceholder');

	// Tooltip content
	const tooltipParts = [];
	if (data.participant)
		tooltipParts.push(`${t('editor.nodes.tooltip.participant')}: ${data.participant}`);
	if (data.decorators && data.decorators.length > 0)
		tooltipParts.push(
			`${t('editor.nodes.tooltip.decorators')}: ${data.decorators.length}`
		);
	if (dialogueRows.length > 0)
		tooltipParts.push(
			`${t('editor.nodes.tooltip.dialogueRows')}: ${dialogueRows.length}`
		);
	const tooltip = tooltipParts.join('\n');

	return (
		<div
			className="min-w-[250px] rounded-lg border-2 bg-card shadow-lg"
			style={{
				borderColor: accentColor,
				boxShadow: selected || isPreviewActive ? `0 0 0 4px ${accentSoft}` : undefined,
			}}
			title={tooltip}
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
				className="text-white px-4 py-2 rounded-t-md flex items-center justify-between"
				style={{ backgroundColor: accentColor }}
			>
				<div className="flex items-center gap-2">
					<CheckCircle2 className="h-4 w-4" />
					<span className="font-semibold text-sm">
						{data.displayName || data.participant || t('editor.nodes.complete')}
					</span>
				</div>
				<div className="flex items-center gap-1">
					{hasMultipleRows && (
						<span className="text-xs opacity-80">
							{t('editor.nodes.rows', { count: dialogueRows.length })}
						</span>
					)}
					{data.hasAudio && <Volume2 className="h-3 w-3" />}
				</div>
			</div>

			{/* Content */}
			<div className="p-4 space-y-2">
				<p className="text-sm text-foreground">{previewText}</p>

				{/* Participant Badge */}
				{data.participant && (
					<div className="flex items-center gap-2 pt-1">
						<div
							className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
							style={{
								backgroundColor: accentSoft,
								color: accentColor,
							}}
						>
							<User className="h-3 w-3" />
							{data.participant}
						</div>
					</div>
				)}

				{/* Decorators */}
				{data.decorators && data.decorators.length > 0 && (
					<div className="flex flex-wrap gap-1 pt-2 border-t">
						{data.decorators.map((decorator, idx) => (
							<div
								key={idx}
								className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
								style={{
									backgroundColor: accentSoft,
									color: accentColor,
								}}
								title={
									decorator.values && Object.keys(decorator.values).length > 0
										? Object.entries(decorator.values)
												.map(([k, v]) => `${k}: ${v}`)
												.join(', ')
										: undefined
								}
							>
								<Tag className="h-3 w-3" />
								{decorator.name || decorator}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
});

CompleteNode.displayName = 'CompleteNode';

export default CompleteNode;
