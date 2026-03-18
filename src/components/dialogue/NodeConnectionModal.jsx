import { useState } from 'react';
import { Link2, MessageCircle, User, CornerUpLeft, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getNodeDefinition } from '@/config/dialogueNodes';

const iconMap = {
	messageCircle: MessageCircle,
	user: User,
	cornerUpLeft: CornerUpLeft,
	checkCircle2: CheckCircle2,
	clock: Clock,
	externalLink: ExternalLink,
};

/**
 * Node Connection Modal Component
 * Allows mobile users to connect a placeholder's parent node to an already-existing node.
 */
export function NodeConnectionModal({ open, onOpenChange, candidateNodes, onSelectNode }) {
	const [search, setSearch] = useState('');

	const handleOpenChange = (v) => {
		onOpenChange(v);
		if (!v) setSearch('');
	};

	const filtered = (candidateNodes || []).filter((n) =>
		(n.data?.displayName || '').toLowerCase().includes(search.toLowerCase())
	);

	return (
		<Drawer open={open} onOpenChange={handleOpenChange}>
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Connect to Existing Node</DrawerTitle>
					<DrawerDescription>Select a node to connect to</DrawerDescription>
				</DrawerHeader>
				<div className="px-4 pb-2">
					<Input
						placeholder="Search nodes..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="mb-3"
					/>
					<div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh] pb-4">
						{filtered.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-6">
								No connectable nodes
							</p>
						) : (
							filtered.map((n) => {
								const def = getNodeDefinition(n.type) || {};
								const Icon = iconMap[def.icon] || Link2;
								return (
									<Button
										key={n.id}
										variant="outline"
										className="h-auto p-4 justify-start gap-4"
										onClick={() => {
											onSelectNode(n.id);
											handleOpenChange(false);
										}}
									>
										<div
											className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${def.colorClass || ''}`}
										>
											<Icon className="h-5 w-5" />
										</div>
										<div className="flex flex-col items-start gap-0.5 text-left">
											<span className="font-semibold">
												{n.data?.displayName || def.label}
											</span>
											<span className="text-xs text-muted-foreground">{def.label}</span>
										</div>
									</Button>
								);
							})
						)}
					</div>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
