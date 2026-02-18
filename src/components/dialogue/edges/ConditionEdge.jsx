import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { SlidersHorizontal } from 'lucide-react';

const ConditionEdge = memo((props) => {
	const {
		id,
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
		style,
		markerEnd,
		data,
		selected,
	} = props;

	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		sourcePosition,
		targetX,
		targetY,
		targetPosition,
	});

	const isPlaceholder = Boolean(data?.isPlaceholder);

	return (
		<>
			<BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
			{!isPlaceholder && (
				<EdgeLabelRenderer>
					<div
						className="nodrag nopan absolute"
						style={{
							transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
							pointerEvents: 'all',
						}}
					>
						<button
							type="button"
							className={`h-7 w-7 rounded-full border bg-card shadow-sm inline-flex items-center justify-center transition-colors ${
								selected
									? 'border-primary text-primary'
									: 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
							}`}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								data?.onOpenDetails?.(id);
							}}
							aria-label="Open edge conditions"
						>
							<SlidersHorizontal className="h-3.5 w-3.5" />
						</button>
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
});

ConditionEdge.displayName = 'ConditionEdge';

export default ConditionEdge;
