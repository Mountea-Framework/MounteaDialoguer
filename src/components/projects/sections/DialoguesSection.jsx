import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Upload, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogueCard } from '@/components/projects/DialogueCard';
import { CreateDialogueDialog } from '@/components/dialogues/CreateDialogueDialog';
import { useDialogueStore } from '@/stores/dialogueStore';
import { EmptyState } from '@/components/ui/empty-state';
import { isMobileDevice } from '@/lib/deviceDetection';

/**
 * Dialogues Section Component
 * Manages dialogues within a project
 */
export function DialoguesSection({ projectId, dialogues = [] }) {
	const { t } = useTranslation();
	const { importDialogue } = useDialogueStore();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const fileInputRef = useRef(null);

	const handleImport = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setIsImporting(true);
		try {
			await importDialogue(projectId, file);
		} catch (error) {
			console.error('Failed to import dialogue:', error);
		} finally {
			setIsImporting(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	return (
		<div>
			<CreateDialogueDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				projectId={projectId}
			/>

			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-bold">
					{t('dialogues.title')} ({dialogues.length})
				</h2>
				<div className="flex gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept=".mnteadlg"
						onChange={handleImport}
						className="hidden"
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef.current?.click()}
						disabled={isImporting}
						className="gap-2"
					>
						<Upload className="h-4 w-4" />
						{t('common.import')}
					</Button>
					<Button type="button" size="sm" onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
						<Plus className="h-4 w-4" />
						{!isMobileDevice && t("dialogues.addNew")}
					</Button>
				</div>
			</div>

			{dialogues.length === 0 ? (
				<EmptyState
					icon={MessageCircle}
					title={t('dialogues.noDialogues')}
					description={t('dialogues.createFirst')}
					action={
						<Button type="button" onClick={() => setIsCreateDialogOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							{t('dialogues.createNew')}
						</Button>
					}
					tips={[
						'Dialogues are the backbone of your interactive narratives',
						'Use nodes to create branching conversations',
						'Connect nodes to create dialogue flow',
					]}
				/>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{dialogues.map((dialogue) => (
						<DialogueCard key={dialogue.id} dialogue={dialogue} projectId={projectId} />
					))}
				</div>
			)}
		</div>
	);
}
