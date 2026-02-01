import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogueCard } from '@/components/projects/DialogueCard';
import { CreateDialogueDialog } from '@/components/dialogues/CreateDialogueDialog';
import { useDialogueStore } from '@/stores/dialogueStore';

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
					<Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
						<Plus className="h-4 w-4" />
						{t('dialogues.createNew')}
					</Button>
				</div>
			</div>

			{dialogues.length === 0 ? (
				<div className="text-center py-16">
					<div className="mx-auto w-64">
						<div className="mb-4 text-6xl opacity-20">💬</div>
						<h3 className="font-semibold mb-2">{t('dialogues.noDialogues')}</h3>
						<p className="text-sm text-muted-foreground mb-4">{t('dialogues.createFirst')}</p>
						<Button onClick={() => setIsCreateDialogOpen(true)}>
							<Plus className="h-4 w-4 mr-2" />
							{t('dialogues.createNew')}
						</Button>
					</div>
				</div>
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
