import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export function CollapsibleSection({ title, defaultOpen = true, children }) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<div className="border rounded-lg overflow-hidden">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="w-full px-4 py-3 flex items-center justify-between bg-muted/50 hover:bg-muted transition-colors"
			>
				<h4 className="text-sm font-semibold">{title}</h4>
				{isOpen ? (
					<ChevronDown className="h-4 w-4 text-muted-foreground" />
				) : (
					<ChevronRight className="h-4 w-4 text-muted-foreground" />
				)}
			</button>
			{isOpen && (
				<div className="p-4 space-y-3">
					{children}
				</div>
			)}
		</div>
	);
}
