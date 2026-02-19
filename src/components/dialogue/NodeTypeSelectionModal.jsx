import { MessageCircle, User, CornerUpLeft, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getCreatableNodeDefinitions } from '@/config/dialogueNodes';

/**
 * Node Type Selection Modal Component
 * Allows mobile users to select which type of node to create
 */
export function NodeTypeSelectionModal({ open, onOpenChange, onSelectType }) {
	const iconMap = {
		messageCircle: MessageCircle,
		user: User,
		cornerUpLeft: CornerUpLeft,
		checkCircle2: CheckCircle2,
		clock: Clock,
		externalLink: ExternalLink,
	};

	const nodeTypes = getCreatableNodeDefinitions();

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
						const Icon = iconMap[nodeType.icon];
						return (
							<Button
								key={nodeType.type}
								variant="outline"
								className="h-auto p-4 justify-start gap-4"
								onClick={() => handleSelect(nodeType.type)}
							>
								<div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${nodeType.colorClass || ''}`}>
									{Icon ? <Icon className="h-5 w-5" /> : null}
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
