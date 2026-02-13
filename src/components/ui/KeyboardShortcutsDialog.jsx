import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { isMobileDevice } from '@/lib/deviceDetection';
import { formatShortcutKeys } from '@/lib/keyboardShortcuts';

const SHORTCUTS = [
	{
		category: 'General',
		shortcuts: [
			{ keys: ['Ctrl', 'S'], description: 'Save current dialogue' },
			{ keys: ['Ctrl', 'Z'], description: 'Undo last change' },
			{ keys: ['Ctrl', 'Y'], description: 'Redo last change' },
			{ keys: ['?'], description: 'Show keyboard shortcuts' },
		],
	},
	{
		category: 'Dialogue Editor',
		shortcuts: [
			{ keys: ['Delete'], description: 'Delete selected node or edge' },
			{ keys: ['Backspace'], description: 'Delete selected node or edge' },
			{ keys: ['Esc'], description: 'Deselect all' },
			{ keys: ['Click'], description: 'Select node or edge' },
			{ keys: ['Drag'], description: 'Move node or pan canvas' },
		],
	},
	{
		category: 'Node Creation',
		shortcuts: [
			{ keys: ['Drag', 'NPC'], description: 'Create NPC dialogue node' },
			{ keys: ['Drag', 'Player'], description: 'Create player response node' },
			{ keys: ['Drag', 'Return'], description: 'Create return node' },
			{ keys: ['Drag', 'Complete'], description: 'Create completion node' },
		],
	},
];

export function KeyboardShortcutsDialog({ trigger }) {
	const showKeyboardShortcuts = !isMobileDevice();

	return (
		<Dialog>
			<DialogTrigger asChild>
				{trigger || (
					<Button variant="outline" size="icon" className="rounded-full">
						<Keyboard className="h-4 w-4" />
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Keyboard className="h-5 w-5" />
						Keyboard Shortcuts
					</DialogTitle>
					<DialogDescription>
						{showKeyboardShortcuts
							? 'Use these keyboard shortcuts to work more efficiently'
							: 'Keyboard shortcuts are hidden on mobile devices'}
					</DialogDescription>
				</DialogHeader>

				{showKeyboardShortcuts ? (
					<div className="space-y-6 mt-4">
						{SHORTCUTS.map((category) => (
							<div key={category.category}>
								<h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
									{category.category}
								</h3>
								<div className="space-y-2">
									{category.shortcuts.map((shortcut, index) => {
										const keys = formatShortcutKeys(shortcut.keys);
										return (
										<div
											key={index}
											className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-accent/50 transition-colors"
										>
											<span className="text-sm">{shortcut.description}</span>
											<div className="flex items-center gap-1">
												{keys.map((key, i) => (
													<span key={i} className="flex items-center gap-1">
														<kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">
															{key}
														</kbd>
														{i < keys.length - 1 && (
															<span className="text-muted-foreground text-xs">+</span>
														)}
													</span>
												))}
											</div>
										</div>
										);
									})}
								</div>
							</div>
						))}
					</div>
				) : (
					<div className="mt-4 rounded-lg border border-border bg-muted/50 p-4">
						<p className="text-sm text-muted-foreground">
							Keyboard shortcuts are available on desktop and laptop devices.
						</p>
					</div>
				)}

				{showKeyboardShortcuts && (
					<div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
						<p className="text-xs text-muted-foreground">
							<strong>Tip:</strong> Press{' '}
							<kbd className="px-1.5 py-0.5 text-xs bg-background rounded border">
								?
							</kbd>{' '}
							at any time to view this dialog
						</p>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
