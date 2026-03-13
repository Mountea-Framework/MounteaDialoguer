import * as React from 'react';
import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { cn } from '@/lib/utils';

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuGroup = ContextMenuPrimitive.Group;
const ContextMenuPortal = ContextMenuPrimitive.Portal;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuRadioGroup = ContextMenuPrimitive.RadioGroup;

const ContextMenuSubTrigger = React.forwardRef(
	({ className, inset, children, ...props }, ref) => (
		<ContextMenuPrimitive.SubTrigger
			ref={ref}
			className={cn(
				'flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[state=open]:bg-accent',
				inset && 'pl-8',
				className
			)}
			{...props}
		>
			{children}
		</ContextMenuPrimitive.SubTrigger>
	)
);
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

const ContextMenuSubContent = React.forwardRef(
	({ className, ...props }, ref) => (
		<ContextMenuPrimitive.SubContent
			ref={ref}
			className={cn(
				'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg',
				'data-[state=open]:animate-in data-[state=closed]:animate-out',
				'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
				'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
				'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
				'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
				className
			)}
			{...props}
		/>
	)
);
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;

const ContextMenuContent = React.forwardRef(
	({ className, ...props }, ref) => (
		<ContextMenuPrimitive.Portal>
			<ContextMenuPrimitive.Content
				ref={ref}
				className={cn(
					'z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md',
					'data-[state=open]:animate-in data-[state=closed]:animate-out',
					'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
					'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
					'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
					'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
					className
				)}
				{...props}
			/>
		</ContextMenuPrimitive.Portal>
	)
);
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

const getItemVariantClass = (variant) => {
	if (variant === 'destructive') {
		return 'text-destructive focus:bg-destructive/10 focus:text-destructive';
	}
	return 'focus:bg-accent focus:text-accent-foreground';
};

const ContextMenuItem = React.forwardRef(
	({ className, inset, variant, ...props }, ref) => (
		<ContextMenuPrimitive.Item
			ref={ref}
			className={cn(
				'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
				getItemVariantClass(variant),
				'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
				inset && 'pl-8',
				className
			)}
			{...props}
		/>
	)
);
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;

const ContextMenuCheckboxItem = React.forwardRef(
	({ className, children, checked, ...props }, ref) => (
		<ContextMenuPrimitive.CheckboxItem
			ref={ref}
			className={cn(
				'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors',
				'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
				className
			)}
			checked={checked}
			{...props}
		>
			{children}
		</ContextMenuPrimitive.CheckboxItem>
	)
);
ContextMenuCheckboxItem.displayName = ContextMenuPrimitive.CheckboxItem.displayName;

const ContextMenuRadioItem = React.forwardRef(
	({ className, children, ...props }, ref) => (
		<ContextMenuPrimitive.RadioItem
			ref={ref}
			className={cn(
				'relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors',
				'focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
				className
			)}
			{...props}
		>
			{children}
		</ContextMenuPrimitive.RadioItem>
	)
);
ContextMenuRadioItem.displayName = ContextMenuPrimitive.RadioItem.displayName;

const ContextMenuLabel = React.forwardRef(
	({ className, inset, ...props }, ref) => (
		<ContextMenuPrimitive.Label
			ref={ref}
			className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)}
			{...props}
		/>
	)
);
ContextMenuLabel.displayName = ContextMenuPrimitive.Label.displayName;

const ContextMenuSeparator = React.forwardRef(
	({ className, ...props }, ref) => (
		<ContextMenuPrimitive.Separator
			ref={ref}
			className={cn('-mx-1 my-1 h-px bg-muted', className)}
			{...props}
		/>
	)
);
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

const ContextMenuShortcut = ({ className, ...props }) => {
	return (
		<span
			className={cn('ml-auto text-xs tracking-widest text-muted-foreground', className)}
			{...props}
		/>
	);
};
ContextMenuShortcut.displayName = 'ContextMenuShortcut';

export {
	ContextMenu,
	ContextMenuTrigger,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuCheckboxItem,
	ContextMenuRadioItem,
	ContextMenuLabel,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuGroup,
	ContextMenuPortal,
	ContextMenuSub,
	ContextMenuSubContent,
	ContextMenuSubTrigger,
	ContextMenuRadioGroup,
};
