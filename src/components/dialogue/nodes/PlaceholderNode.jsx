import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Plus } from 'lucide-react';

/**
 * Placeholder Node Component for Mobile
 * Displays a clickable node that opens a modal to select node type
 */
function PlaceholderNode({ id, data, selected, positionAbsoluteX, positionAbsoluteY }) {
	const handleClick = () => {
		if (data.onClick) {
			// Use absolute position from ReactFlow
			const position = { x: positionAbsoluteX, y: positionAbsoluteY };
			data.onClick(id, position, data.parentNodeId);
		}
	};

	return (
		<div
			className={`
				relative bg-card border-2 border-dashed rounded-lg p-4 min-w-[180px]
				transition-all cursor-pointer hover:border-primary hover:bg-accent
				${selected ? 'border-primary shadow-lg' : 'border-border'}
			`}
			onClick={handleClick}
		>
			{/* Top Handle */}
			<Handle
				type="target"
				position={Position.Top}
				className="w-3 h-3 !bg-muted-foreground"
			/>

			{/* Content */}
			<div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
				<div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
					<Plus className="h-5 w-5" />
				</div>
				<span className="text-sm font-medium">Add Node</span>
			</div>

			{/* Bottom Handle */}
			<Handle
				type="source"
				position={Position.Bottom}
				className="w-3 h-3 !bg-muted-foreground"
			/>
		</div>
	);
}

export default memo(PlaceholderNode);
