import * as React from 'react';
import { cn } from '@/lib/utils';

const ButtonGroup = React.forwardRef(({ className, ...props }, ref) => (
	<div
		ref={ref}
		role="group"
		className={cn('inline-flex items-center gap-1', className)}
		{...props}
	/>
));

ButtonGroup.displayName = 'ButtonGroup';

const ButtonGroupSeparator = React.forwardRef(({ className, ...props }, ref) => (
	<div
		ref={ref}
		aria-hidden="true"
		className={cn('h-4 w-px bg-border mx-1', className)}
		{...props}
	/>
));

ButtonGroupSeparator.displayName = 'ButtonGroupSeparator';

const ButtonGroupText = React.forwardRef(({ className, ...props }, ref) => (
	<span
		ref={ref}
		className={cn('text-sm font-medium text-foreground/90', className)}
		{...props}
	/>
));

ButtonGroupText.displayName = 'ButtonGroupText';

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText };
