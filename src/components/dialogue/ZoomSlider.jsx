import { useReactFlow } from '@xyflow/react';
import { Minus, Plus } from 'lucide-react';

/**
 * Custom Zoom Slider Component for React Flow
 * Provides vertical slider for zoom control
 */
export function ZoomSlider({
	className = '',
	minZoom = 0.5,
	maxZoom = 2,
	step = 0.1,
}) {
	const { setViewport, getZoom, getViewport } = useReactFlow();
	const currentZoom = getZoom();

	// Convert zoom level to slider value (0-100)
	// Zoom range: minZoom to maxZoom -> slider: 0 to 100
	const clampedZoom = Math.min(Math.max(currentZoom, minZoom), maxZoom);
	const sliderValue = ((clampedZoom - minZoom) / (maxZoom - minZoom)) * 100;

	const clampZoom = (zoom) => Math.min(Math.max(zoom, minZoom), maxZoom);
	const setZoom = (zoom) => {
		const { x, y } = getViewport();
		setViewport({ x, y, zoom: clampZoom(zoom) }, { duration: 200 });
	};

	const handleSliderChange = (e) => {
		const value = parseFloat(e.target.value);
		// Convert slider value (0-100) back to zoom level (0.1-2)
		const newZoom = minZoom + (value / 100) * (maxZoom - minZoom);
		setZoom(newZoom);
	};

	return (
		<div className={`flex flex-col items-center gap-2 p-2 ${className}`}>
			<button
				onClick={() => setZoom(currentZoom + step)}
				className="w-6 h-6 flex items-center justify-center rounded border border-border bg-background hover:bg-accent transition-colors"
				title="Zoom In"
			>
				<Plus className="w-4 h-4" />
			</button>

			<input
				type="range"
				min="0"
				max="100"
				value={sliderValue}
				onChange={handleSliderChange}
				className="slider-vertical h-24 w-1.5"
				style={{
					writingMode: 'vertical-lr',
					direction: 'rtl',
				}}
				title={`Zoom: ${Math.round(currentZoom * 100)}%`}
			/>

			<button
				onClick={() => setZoom(currentZoom - step)}
				className="w-6 h-6 flex items-center justify-center rounded border border-border bg-background hover:bg-accent transition-colors"
				title="Zoom Out"
			>
				<Minus className="w-4 h-4" />
			</button>
		</div>
	);
}
