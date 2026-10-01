import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerDescription,
	DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { getNodeDefinition } from '@/config/dialogueNodes';

/**
 * Node Connection Modal Component
 * Allows mobile users to connect a placeholder's parent node to an already-existing node.
 * Uses a Vaul bottom-drawer with a NativeSelect for node selection.
 */
export function NodeConnectionModal({ open, onOpenChange, candidateNodes, onSelectNode }) {
	const { t } = useTranslation();
	const [selectedId, setSelectedId] = useState('');

	const handleOpenChange = (v) => {
		onOpenChange(v);
		if (!v) setSelectedId('');
	};

	const handleConnect = () => {
		if (!selectedId) return;
		onSelectNode(selectedId);
		handleOpenChange(false);
	};

	const nodes = candidateNodes || [];

	return (
		<Drawer open={open} onOpenChange={handleOpenChange}>
			<DrawerContent className="max-h-[92vh] flex flex-col">
				<DrawerHeader className="text-left">
					<DrawerTitle>{t('accessibility.connectExisting')}</DrawerTitle>
					<DrawerDescription>{t('accessibility.chooseConnection')}</DrawerDescription>
				</DrawerHeader>

				<div className="no-scrollbar flex-1 min-h-0 overflow-y-auto px-4 py-2">
					{nodes.length === 0 ? (
						<p className="text-sm text-muted-foreground text-center py-6">
							{t('accessibility.noConnections')}
						</p>
					) : (
						<NativeSelect
							aria-label={t('accessibility.chooseConnection')} value={selectedId}
							onChange={(e) => setSelectedId(e.target.value)}
						>
							<option value="" disabled>
								{t('accessibility.chooseNode')}
							</option>
							{nodes.map((n) => {
								const def = getNodeDefinition(n.type) || {};
								const displayName = n.data?.displayName || def.label || n.id;
								const typeLabel = def.label && def.label !== displayName ? ` (${def.label})` : '';
								return (
									<option key={n.id} value={n.id}>
										{displayName}{typeLabel}
									</option>
								);
							})}
						</NativeSelect>
					)}
				</div>

				<DrawerFooter className="border-t border-border/60 bg-background">
					<Button onClick={handleConnect} disabled={!selectedId || nodes.length === 0}>
						{t('accessibility.connect')}
					</Button>
					<Button variant="ghost" onClick={() => handleOpenChange(false)}>
						{t('common.cancel')}
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
