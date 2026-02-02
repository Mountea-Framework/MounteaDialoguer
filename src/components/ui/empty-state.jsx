import { cn } from '@/lib/utils';

/**
 * Enhanced Empty State Component
 * Provides engaging placeholder content when lists or views are empty
 */
export function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	tips = [],
	className,
}) {
	return (
		<div className={cn('flex flex-col items-center justify-center py-12 px-6', className)}>
			{/* Icon */}
			{Icon && (
				<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
					<Icon className="h-10 w-10 text-muted-foreground" />
				</div>
			)}

			{/* Title */}
			{title && (
				<h3 className="text-xl font-semibold mb-2 text-center">{title}</h3>
			)}

			{/* Description */}
			{description && (
				<p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
					{description}
				</p>
			)}

			{/* Action Button */}
			{action && <div className="mb-6">{action}</div>}

			{/* Tips */}
			{tips.length > 0 && (
				<div className="w-full max-w-md mt-4 p-4 bg-muted/30 rounded-lg border border-dashed">
					<h4 className="text-sm font-medium mb-2">Quick Tips:</h4>
					<ul className="space-y-1 text-sm text-muted-foreground">
						{tips.map((tip, index) => (
							<li key={index} className="flex items-start gap-2">
								<span className="text-primary mt-0.5">•</span>
								<span>{tip}</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

/**
 * Compact Empty State (smaller version)
 */
export function CompactEmptyState({ icon: Icon, title, description, action }) {
	return (
		<div className="flex flex-col items-center justify-center py-8 px-4">
			{Icon && (
				<Icon className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
			)}
			{title && (
				<h4 className="text-sm font-medium mb-1 text-center">{title}</h4>
			)}
			{description && (
				<p className="text-xs text-muted-foreground mb-3 text-center max-w-xs">
					{description}
				</p>
			)}
			{action && <div>{action}</div>}
		</div>
	);
}
