import * as React from 'react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import { cn } from '@/lib/utils';

const AlertDialog = AlertDialogPrimitive.Root;
const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
const AlertDialogPortal = AlertDialogPrimitive.Portal;

const AlertDialogOverlay = React.forwardRef(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Overlay
		className={cn(
			'fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
			className
		)}
		{...props}
		ref={ref}
	/>
));
AlertDialogOverlay.displayName = AlertDialogPrimitive.Overlay.displayName;

const sizeClasses = {
	sm: 'max-w-sm',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
};

const AlertDialogContent = React.forwardRef(
	({ className, variant = 'basic', size = 'md', ...props }, ref) => (
	<AlertDialogPortal>
		<AlertDialogOverlay />
		<AlertDialogPrimitive.Content
			ref={ref}
			data-variant={variant}
			className={cn(
				'group/alert fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl data-[variant=destructive]:border-border/60 data-[variant=destructive]:bg-background/95 data-[variant=destructive]:shadow-2xl',
				sizeClasses[size] || sizeClasses.md,
				className
			)}
			{...props}
		/>
	</AlertDialogPortal>
	)
);
AlertDialogContent.displayName = AlertDialogPrimitive.Content.displayName;

const AlertDialogHeader = ({ className, ...props }) => (
	<div
		className={cn(
			'flex flex-col space-y-2 text-center sm:text-left group-data-[variant=destructive]/alert:items-center group-data-[variant=destructive]/alert:text-center',
			className
		)}
		{...props}
	/>
);
AlertDialogHeader.displayName = 'AlertDialogHeader';

const AlertDialogFooter = ({ className, ...props }) => (
	<div
		className={cn(
			'-mx-6 -mb-6 mt-4 flex w-[calc(100%+3rem)] flex-col-reverse border-t border-border/60 bg-muted/30 px-6 pb-6 pt-3 sm:flex-row sm:justify-end sm:space-x-2 sm:space-y-0 rounded-b-2xl group-data-[variant=destructive]/alert:justify-center group-data-[variant=destructive]/alert:space-x-4',
			className
		)}
		{...props}
	/>
);
AlertDialogFooter.displayName = 'AlertDialogFooter';

const AlertDialogTitle = React.forwardRef(({ className, ...props }, ref) => (
	<AlertDialogPrimitive.Title
		ref={ref}
		className={cn('text-lg font-semibold', className)}
		{...props}
	/>
));
AlertDialogTitle.displayName = AlertDialogPrimitive.Title.displayName;

const AlertDialogDescription = React.forwardRef(
	({ className, ...props }, ref) => (
		<AlertDialogPrimitive.Description
			ref={ref}
			className={cn(
				'text-sm text-muted-foreground group-data-[variant=destructive]/alert:max-w-sm',
				className
			)}
			{...props}
		/>
	)
);
AlertDialogDescription.displayName =
	AlertDialogPrimitive.Description.displayName;

const AlertDialogMedia = React.forwardRef(({ className, ...props }, ref) => (
	<div
		ref={ref}
		className={cn(
			'mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground group-data-[variant=destructive]/alert:rounded-full',
			className
		)}
		{...props}
	/>
));
AlertDialogMedia.displayName = 'AlertDialogMedia';

const AlertDialogAction = React.forwardRef(
	({ className, variant = 'default', ...props }, ref) => (
	<AlertDialogPrimitive.Action
		ref={ref}
		className={cn(
			'inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
			variant === 'destructive'
				? 'bg-destructive/15 text-destructive hover:bg-destructive/25'
				: 'bg-primary text-primary-foreground hover:bg-primary/90',
			'group-data-[variant=destructive]/alert:h-11 group-data-[variant=destructive]/alert:rounded-full group-data-[variant=destructive]/alert:border group-data-[variant=destructive]/alert:border-destructive/30 group-data-[variant=destructive]/alert:px-6 group-data-[variant=destructive]/alert:shadow-none',
			className
		)}
		{...props}
	/>
	)
);
AlertDialogAction.displayName = AlertDialogPrimitive.Action.displayName;

const AlertDialogCancel = React.forwardRef(
	({ className, variant = 'default', ...props }, ref) => (
	<AlertDialogPrimitive.Cancel
		ref={ref}
		className={cn(
			'mt-2 sm:mt-0 inline-flex h-10 items-center justify-center rounded-md border px-4 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
			variant === 'outline'
				? 'border-input bg-background hover:bg-accent hover:text-accent-foreground'
				: 'border-input bg-background hover:bg-accent hover:text-accent-foreground',
			'group-data-[variant=destructive]/alert:h-11 group-data-[variant=destructive]/alert:rounded-full group-data-[variant=destructive]/alert:border-border/60 group-data-[variant=destructive]/alert:bg-muted/30 group-data-[variant=destructive]/alert:px-6 group-data-[variant=destructive]/alert:text-foreground group-data-[variant=destructive]/alert:hover:bg-muted/50',
			className
		)}
		{...props}
	/>
	)
);
AlertDialogCancel.displayName = AlertDialogPrimitive.Cancel.displayName;

export {
	AlertDialog,
	AlertDialogPortal,
	AlertDialogOverlay,
	AlertDialogTrigger,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogFooter,
	AlertDialogMedia,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogAction,
	AlertDialogCancel,
};
