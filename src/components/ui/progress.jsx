import * as React from 'react';
import { cn } from '@/lib/utils';

const Progress = React.forwardRef(({ className, value = 0, ...props }, ref) => (
	<div
		ref={ref}
		role="progressbar"
		aria-valuemin={0}
		aria-valuemax={100}
		aria-valuenow={Math.max(0, Math.min(100, value))}
		className={cn('relative h-2 w-full overflow-hidden rounded-full bg-secondary', className)}
		{...props}
	>
		<div
			className="h-full w-full flex-1 bg-primary transition-all duration-300"
			style={{ transform: `translateX(-${100 - Math.max(0, Math.min(100, value))}%)` }}
		/>
	</div>
));

Progress.displayName = 'Progress';

export { Progress };

