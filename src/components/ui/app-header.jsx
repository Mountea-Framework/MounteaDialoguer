import { Children, isValidElement, forwardRef } from 'react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const AppHeader = forwardRef(function AppHeader(
	{
		left,
		right,
		className,
		containerClassName,
		leftClassName,
		rightClassName,
		mobileMaxItems = 3,
		menuItems,
		...props
	},
	ref
) {
	const rightItems = Children.toArray(right).filter(Boolean);
	const menuItemsArray = Children.toArray(menuItems).filter(Boolean);
	const mobileEligibleItems = rightItems.filter(
		(item) => !(isValidElement(item) && item.props?.['data-header-mobile-hidden'])
	);
	const hasOverflow = mobileEligibleItems.length > mobileMaxItems;
	const visibleMobileCount = hasOverflow ? Math.max(0, mobileMaxItems - 1) : mobileMaxItems;
	const mobileVisibleItems = hasOverflow
		? mobileEligibleItems.slice(0, visibleMobileCount)
		: mobileEligibleItems;
	const mobileOverflowItems = hasOverflow
		? mobileEligibleItems.slice(visibleMobileCount)
		: [];
	const menuButton = menuItemsArray.length ? (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="icon" className="rounded-full">
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-auto">
				<div className="flex flex-col gap-2 p-2">
					{menuItemsArray.map((item, index) => (
						<div key={`menu-${index}`}>{item}</div>
					))}
				</div>
			</DropdownMenuContent>
		</DropdownMenu>
	) : null;

	return (
		<header
			ref={ref}
			className={cn(
				'sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
				className
			)}
			{...props}
		>
			<div
				className={cn(
					'flex items-center justify-between flex-nowrap min-w-0 px-4 py-3 md:px-12 w-full gap-3',
					containerClassName
				)}
			>
				{left ? (
					<div className={cn('flex items-center gap-2 min-w-0 flex-1', leftClassName)}>
						{left}
					</div>
				) : null}
				{rightItems.length || menuItemsArray.length ? (
					<>
						<div
							className={cn(
								'flex items-center gap-2 shrink-0 md:hidden',
								rightClassName
							)}
						>
							{mobileVisibleItems}
							{menuButton}
							{hasOverflow ? (
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="outline" size="icon" className="rounded-full">
											<MoreVertical className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-auto">
										{mobileOverflowItems.map((item, index) => {
											const key = `overflow-${index}`;
											if (isValidElement(item)) {
												return (
													<DropdownMenuItem key={key} asChild>
														{item}
													</DropdownMenuItem>
												);
											}
											return (
												<DropdownMenuItem key={key}>{item}</DropdownMenuItem>
											);
										})}
									</DropdownMenuContent>
								</DropdownMenu>
							) : null}
						</div>
						<div
							className={cn(
								'hidden items-center gap-2 shrink-0 md:flex md:justify-end',
								rightClassName
							)}
						>
							{rightItems}
							{menuButton}
						</div>
					</>
				) : null}
			</div>
		</header>
	);
});

AppHeader.displayName = 'AppHeader';
