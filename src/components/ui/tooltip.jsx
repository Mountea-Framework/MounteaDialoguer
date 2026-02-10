import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef(
	({ className, sideOffset = 4, showArrow = true, children, ...props }, ref) => (
		<TooltipPrimitive.Portal>
			<TooltipPrimitive.Content
				ref={ref}
				sideOffset={sideOffset}
				className={cn(
					'z-50 overflow-hidden rounded-md bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:duration-150 data-[state=closed]:duration-150',
					className
				)}
				{...props}
			>
				{children}
				{showArrow ? <TooltipPrimitive.Arrow className="fill-popover" /> : null}
			</TooltipPrimitive.Content>
		</TooltipPrimitive.Portal>
	)
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Simple tooltip wrapper for common use case
 */
const SimpleTooltip = ({ children, content, side = 'top', ...props }) => (
	<TooltipProvider>
		<Tooltip>
			<TooltipTrigger asChild>{children}</TooltipTrigger>
			<TooltipContent side={side} {...props}>
				{content}
			</TooltipContent>
		</Tooltip>
	</TooltipProvider>
);

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, SimpleTooltip };
