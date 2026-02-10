import * as React from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const Command = React.forwardRef(({ className, ...props }, ref) => (
	<CommandPrimitive
		ref={ref}
		className={cn(
			'flex h-full w-full flex-col overflow-hidden rounded-md bg-background text-foreground',
			className
		)}
		{...props}
	/>
));
Command.displayName = CommandPrimitive.displayName;

const CommandDialog = ({ children, contentClassName, ...props }) => (
	<Dialog {...props}>
		<DialogContent className={cn('overflow-hidden p-0 shadow-2xl', contentClassName)}>
			{children}
		</DialogContent>
	</Dialog>
);

const CommandInput = React.forwardRef(({ className, ...props }, ref) => (
	<div className="flex items-center border-b px-3" cmdk-input-wrapper="">
		<Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
		<CommandPrimitive.Input
			ref={ref}
			className={cn(
				'flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
				className
			)}
			{...props}
		/>
	</div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef(({ className, ...props }, ref) => (
	<CommandPrimitive.List
		ref={ref}
		className={cn('max-h-[420px] overflow-y-auto overflow-x-hidden', className)}
		{...props}
	/>
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef((props, ref) => (
	<CommandPrimitive.Empty
		ref={ref}
		className="py-6 text-center text-sm text-muted-foreground"
		{...props}
	/>
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
	<CommandPrimitive.Group
		ref={ref}
		className={cn(
			'overflow-hidden p-2 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground',
			className
		)}
		{...props}
	/>
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (
	<CommandPrimitive.Separator
		ref={ref}
		className={cn('-mx-1 h-px bg-border', className)}
		{...props}
	/>
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef(({ className, ...props }, ref) => (
	<CommandPrimitive.Item
		ref={ref}
		className={cn(
			'relative flex cursor-default select-none items-center rounded-sm px-2 py-2 text-sm outline-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground',
			className
		)}
		{...props}
	/>
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }) => {
	return (
		<span
			className={cn(
				'ml-auto flex items-center gap-1 text-xs text-muted-foreground',
				className
			)}
			{...props}
		/>
	);
};
CommandShortcut.displayName = 'CommandShortcut';

export {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandSeparator,
	CommandShortcut,
};
