import React from "react";
import {
	useReactFlow,
	getSmoothStepPath,
	EdgeLabelRenderer,
	BaseEdge,
	getStraightPath,
	getBezierPath,
} from "reactflow";

import Button from "../../components/objects/Button";
import { ReactComponent as RemoveIcon } from "../../icons/removeIcon.svg";

const CustomEdge = ({ id, sourceX, sourceY, targetX, targetY }) => {
	const { setEdges } = useReactFlow();
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
	});

	return (
		<>
			<BaseEdge id={id} path={edgePath} />
			<EdgeLabelRenderer>
				<div
					style={{
						position: "absolute",
						transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
						pointerEvents: "all",
					}}
				>
					<Button
						className="circle-button nodrag nopan node-edge-button"
						onClick={() => {
							setEdges((es) => es.filter((e) => e.id !== id));
						}}
					>
						<RemoveIcon
							style={{
								pointerEvents: "none"
							}}
						/>
					</Button>
				</div>
			</EdgeLabelRenderer>
		</>
	);
};

export default CustomEdge;
