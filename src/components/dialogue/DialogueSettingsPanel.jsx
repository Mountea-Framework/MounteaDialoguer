import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Download, Trash2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useDialogueStore } from '@/stores/dialogueStore';
import { formatDate } from '@/lib/dateUtils';

/**
 * Dialogue Settings Panel
 * Used inside settings modal or settings page.
 */
export function DialogueSettingsPanel({ dialogue, onExport, onDelete }) {
	const { t } = useTranslation();
	const { updateDialogue } = useDialogueStore();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		description: '',
	});

	useEffect(() => {
		if (dialogue) {
			setFormData({
				name: dialogue.name || '',
				description: dialogue.description || '',
			});
		}
	}, [dialogue]);

	if (!dialogue) {
		return (
			<div className="h-full flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		);
	}

	const handleSave = async () => {
		if (!formData.name.trim()) return;

		setIsSaving(true);
		try {
			await updateDialogue(dialogue.id, {
				name: formData.name,
				description: formData.description,
			});
			setIsEditing(false);
		} catch (error) {
			console.error('Failed to update dialogue:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = () => {
		setFormData({
			name: dialogue.name || '',
			description: dialogue.description || '',
		});
		setIsEditing(false);
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">{t('dialogues.dialogueSettings')}</h2>
				<p className="text-sm text-muted-foreground mt-1">
					{t('settingsCommand.description')}
				</p>
			</div>

			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Info className="h-5 w-5 text-primary" />
								{t('settingsCommand.items.dialogueInfo')}
							</CardTitle>
							<CardDescription className="mt-1.5">
								{t('settingsCommand.items.dialogueInfo')}
							</CardDescription>
						</div>
						{!isEditing && (
							<Button onClick={() => setIsEditing(true)} variant="outline">
								{t('common.edit')}
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="name">{t('dialogues.dialogueName')}</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								disabled={!isEditing}
								placeholder={t('dialogues.dialogueName')}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">Description</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								disabled={!isEditing}
								placeholder="Enter dialogue description"
								rows={3}
							/>
						</div>
					</div>

					{isEditing && (
						<div className="flex justify-end gap-2 pt-4 border-t">
							<Button
								variant="outline"
								onClick={handleCancel}
								disabled={isSaving}
							>
								{t('common.cancel')}
							</Button>
							<Button
								onClick={handleSave}
								disabled={isSaving || !formData.name.trim()}
							>
								<Save className="h-4 w-4 mr-2" />
								{isSaving ? t('common.saving') : t('common.save')}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t('settingsCommand.items.dialogueMetadata')}</CardTitle>
					<CardDescription>View dialogue metadata and timestamps</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3">
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">Dialogue ID</span>
							<code className="text-sm font-mono bg-muted px-2 py-1 rounded">
								{dialogue.id}
							</code>
						</div>
						<Separator />
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">
								{t('projects.created')}
							</span>
							<span className="text-sm font-medium">
								{formatDate(dialogue.createdAt)}
							</span>
						</div>
						<Separator />
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">
								{t('projects.modified')}
							</span>
							<span className="text-sm font-medium">
								{formatDate(dialogue.modifiedAt)}
							</span>
						</div>
						<Separator />
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">
								{t('dialogues.nodes')}
							</span>
							<span className="text-sm font-medium">
								{dialogue.nodeCount || 0}
							</span>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t('settingsCommand.items.dialogueExport')}</CardTitle>
					<CardDescription>
						Download this dialogue as a standalone file
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						onClick={onExport}
						variant="outline"
						className="w-full justify-start gap-2"
					>
						<Download className="h-4 w-4" />
						{t('settingsCommand.items.dialogueExport')}
					</Button>
				</CardContent>
			</Card>

			<Card className="border-destructive">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<AlertTriangle className="h-5 w-5" />
						{t('settingsCommand.items.dialogueDanger')}
					</CardTitle>
					<CardDescription>
						Permanently delete this dialogue and all its nodes
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						onClick={onDelete}
						className="w-full justify-start gap-2"
					>
						<Trash2 className="h-4 w-4" />
						{t('settingsCommand.items.dialogueDanger')}
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
