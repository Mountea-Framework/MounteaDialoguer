import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Slider Component
 * A native HTML5 range input styled to match the UI
 */
const Slider = React.forwardRef(
	({ className, min = 0, max = 100, step = 1, value = [50], onValueChange, ...props }, ref) => {
		const handleChange = (e) => {
			const newValue = parseFloat(e.target.value);
			if (onValueChange) {
				onValueChange([newValue]);
			}
		};

		return (
			<input
				ref={ref}
				type="range"
				min={min}
				max={max}
				step={step}
				value={value[0]}
				onChange={handleChange}
				className={cn(
					'w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer',
					'[&::-webkit-slider-thumb]:appearance-none',
					'[&::-webkit-slider-thumb]:w-5',
					'[&::-webkit-slider-thumb]:h-5',
					'[&::-webkit-slider-thumb]:rounded-full',
					'[&::-webkit-slider-thumb]:bg-primary',
					'[&::-webkit-slider-thumb]:cursor-pointer',
					'[&::-webkit-slider-thumb]:border-2',
					'[&::-webkit-slider-thumb]:border-background',
					'[&::-webkit-slider-thumb]:shadow-sm',
					'[&::-moz-range-thumb]:w-5',
					'[&::-moz-range-thumb]:h-5',
					'[&::-moz-range-thumb]:rounded-full',
					'[&::-moz-range-thumb]:bg-primary',
					'[&::-moz-range-thumb]:cursor-pointer',
					'[&::-moz-range-thumb]:border-2',
					'[&::-moz-range-thumb]:border-background',
					'[&::-moz-range-thumb]:shadow-sm',
					'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
					className
				)}
				{...props}
			/>
		);
	}
);
Slider.displayName = 'Slider';

export { Slider };
