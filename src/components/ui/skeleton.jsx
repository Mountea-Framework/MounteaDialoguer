import { cn } from '@/lib/utils';

/**
 * Skeleton component for loading states
 * Provides a placeholder animation while content is loading
 */
export function Skeleton({ className, ...props }) {
	return (
		<div
			className={cn('animate-pulse rounded-md bg-muted', className)}
			{...props}
		/>
	);
}

/**
 * Pre-built skeleton patterns for common use cases
 */

// Card skeleton for project/dialogue cards
export function CardSkeleton() {
	return (
		<div className="rounded-lg border bg-card p-4 space-y-3">
			<div className="flex items-center gap-3">
				<Skeleton className="h-12 w-12 rounded-full" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-3 w-1/2" />
				</div>
			</div>
			<Skeleton className="h-20 w-full" />
			<div className="flex gap-2">
				<Skeleton className="h-8 w-16" />
				<Skeleton className="h-8 w-20" />
			</div>
		</div>
	);
}

// List item skeleton
export function ListItemSkeleton() {
	return (
		<div className="flex items-center gap-4 p-4">
			<Skeleton className="h-10 w-10 rounded-lg" />
			<div className="flex-1 space-y-2">
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-3 w-1/2" />
			</div>
			<Skeleton className="h-8 w-8 rounded-full" />
		</div>
	);
}

// Table row skeleton
export function TableRowSkeleton({ columns = 4 }) {
	return (
		<div className="flex gap-4 p-4 border-b">
			{Array.from({ length: columns }).map((_, i) => (
				<Skeleton key={i} className="h-4 flex-1" />
			))}
		</div>
	);
}

// Form skeleton
export function FormSkeleton({ fields = 3 }) {
	return (
		<div className="space-y-4">
			{Array.from({ length: fields }).map((_, i) => (
				<div key={i} className="space-y-2">
					<Skeleton className="h-4 w-24" />
					<Skeleton className="h-10 w-full" />
				</div>
			))}
			<div className="flex gap-2 pt-4">
				<Skeleton className="h-10 w-24" />
				<Skeleton className="h-10 w-24" />
			</div>
		</div>
	);
}

// Node skeleton for dialogue editor
export function NodeSkeleton() {
	return (
		<div className="w-64 rounded-lg border bg-card">
			<Skeleton className="h-10 w-full rounded-t-lg" />
			<div className="p-4 space-y-2">
				<Skeleton className="h-4 w-3/4" />
				<Skeleton className="h-4 w-1/2" />
			</div>
		</div>
	);
}

// Text skeleton (for paragraphs)
export function TextSkeleton({ lines = 3 }) {
	return (
		<div className="space-y-2">
			{Array.from({ length: lines }).map((_, i) => (
				<Skeleton
					key={i}
					className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
				/>
			))}
		</div>
	);
}
