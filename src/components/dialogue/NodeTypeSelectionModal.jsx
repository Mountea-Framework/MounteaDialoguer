import { MessageCircle, User, CornerUpLeft, CheckCircle2 } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

/**
 * Node Type Selection Modal Component
 * Allows mobile users to select which type of node to create
 */
export function NodeTypeSelectionModal({ open, onOpenChange, onSelectType }) {
	const { t } = useTranslation();

	const nodeTypes = [
		{
			type: 'leadNode',
			label: 'NPC',
			description: 'Add an NPC dialogue node',
			icon: MessageCircle,
			color: 'text-blue-500',
		},
		{
			type: 'answerNode',
			label: 'Player',
			description: 'Add a player response node',
			icon: User,
			color: 'text-purple-500',
		},
		{
			type: 'returnNode',
			label: 'Return',
			description: 'Return to a previous node',
			icon: CornerUpLeft,
			color: 'text-orange-500',
		},
		{
			type: 'completeNode',
			label: 'Complete',
			description: 'Mark dialogue as complete',
			icon: CheckCircle2,
			color: 'text-green-500',
		},
	];

	const handleSelect = (nodeType) => {
		onSelectType(nodeType);
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Select Node Type</DialogTitle>
					<DialogDescription>
						Choose the type of node you want to add to the dialogue
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2 py-4">
					{nodeTypes.map((nodeType) => {
						const Icon = nodeType.icon;
						return (
							<Button
								key={nodeType.type}
								variant="outline"
								className="h-auto p-4 justify-start gap-4"
								onClick={() => handleSelect(nodeType.type)}
							>
								<div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${nodeType.color}`}>
									<Icon className="h-5 w-5" />
								</div>
								<div className="flex flex-col items-start gap-1 text-left">
									<span className="font-semibold">{nodeType.label}</span>
									<span className="text-xs text-muted-foreground">
										{nodeType.description}
									</span>
								</div>
							</Button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
