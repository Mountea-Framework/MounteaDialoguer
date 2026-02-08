import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import {
	ArrowLeft,
	Save,
	Download,
	Trash2,
	AlertTriangle,
	Info,
	Sun,
	Moon,
	MessageCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogMedia,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useTheme } from '@/contexts/ThemeProvider';
import { useDialogueStore } from '@/stores/dialogueStore';
import { useProjectStore } from '@/stores/projectStore';
import { formatDate } from '@/lib/dateUtils';

export const Route = createFileRoute(
	'/projects/$projectId/dialogue/$dialogueId/settings'
)({
	component: DialogueSettingsPage,
});

function DialogueSettingsPage() {
	const { t } = useTranslation();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const { projectId, dialogueId } = Route.useParams();
	const { projects, loadProjects } = useProjectStore();
	const { dialogues, loadDialogues, updateDialogue, deleteDialogue, exportDialogue } =
		useDialogueStore();

	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		description: '',
	});

	// Load data
	useEffect(() => {
		loadProjects();
		loadDialogues(projectId);
	}, [loadProjects, loadDialogues, projectId]);

	const project = projects.find((p) => p.id === projectId);
	const dialogue = dialogues.find((d) => d.id === dialogueId);

	// Update form when dialogue loads
	useEffect(() => {
		if (dialogue) {
			setFormData({
				name: dialogue.name || '',
				description: dialogue.description || '',
			});
		}
	}, [dialogue]);

	const handleSave = async () => {
		if (!formData.name.trim()) return;

		setIsSaving(true);
		try {
			await updateDialogue(dialogueId, {
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
			name: dialogue?.name || '',
			description: dialogue?.description || '',
		});
		setIsEditing(false);
	};

	const handleExport = async () => {
		try {
			await exportDialogue(dialogueId);
		} catch (error) {
			console.error('Failed to export dialogue:', error);
		}
	};

	const handleDelete = async () => {
		try {
			await deleteDialogue(dialogueId);
			setShowDeleteDialog(false);
			// Navigate back to project
			window.location.href = `#/projects/${projectId}`;
		} catch (error) {
			console.error('Failed to delete dialogue:', error);
		}
	};

	if (!dialogue || !project) {
		return (
			<div className="h-screen flex items-center justify-center">
				<p className="text-muted-foreground">{t('common.loading')}</p>
			</div>
		);
	}

	return (
		<div className="h-screen flex flex-col overflow-hidden">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b px-6 md:px-12 py-4 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Link
						to="/projects/$projectId/dialogue/$dialogueId"
						params={{ projectId, dialogueId }}
					>
						<Button variant="ghost" size="icon" className="rounded-full">
							<ArrowLeft className="h-5 w-5" />
						</Button>
					</Link>
					<div className="flex items-center gap-4">
						<div>
							<h1 className="text-2xl font-bold tracking-tight">
								{t('dialogues.dialogueSettings')}
							</h1>
							<p className="text-sm text-muted-foreground">{dialogue.name}</p>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="icon"
						onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
						className="rounded-full"
					>
						{resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</Button>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 overflow-y-auto">
				<div className="max-w-4xl mx-auto p-8 md:p-12 space-y-6">
					{/* Header */}
					<div>
						<h2 className="text-2xl font-bold">{t('dialogues.dialogueSettings')}</h2>
						<p className="text-sm text-muted-foreground mt-1">
							Configure dialogue properties and behavior
						</p>
					</div>

					{/* Dialogue Information */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<div>
									<CardTitle className="flex items-center gap-2">
										<Info className="h-5 w-5 text-primary" />
										{t('settings.projectInfo')}
									</CardTitle>
									<CardDescription className="mt-1.5">
										Edit dialogue name and description
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

					{/* Dialogue Metadata */}
					<Card>
						<CardHeader>
							<CardTitle>{t('settings.metadata')}</CardTitle>
							<CardDescription>View dialogue metadata and timestamps</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid gap-3">
								<div className="flex justify-between py-2">
									<span className="text-sm text-muted-foreground">
										Dialogue ID
									</span>
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

					{/* Export */}
					<Card>
						<CardHeader>
							<CardTitle>Export Dialogue</CardTitle>
							<CardDescription>
								Download this dialogue as a standalone file
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button
								onClick={handleExport}
								variant="outline"
								className="w-full justify-start gap-2"
							>
								<Download className="h-4 w-4" />
								Export Dialogue
							</Button>
						</CardContent>
					</Card>

					{/* Danger Zone */}
					<Card className="border-destructive">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-destructive">
								<AlertTriangle className="h-5 w-5" />
								{t('settings.dangerZone')}
							</CardTitle>
							<CardDescription>
								Permanently delete this dialogue and all its nodes
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Button
								variant="destructive"
								onClick={() => setShowDeleteDialog(true)}
								className="w-full justify-start gap-2"
							>
								<Trash2 className="h-4 w-4" />
								Delete Dialogue
							</Button>
						</CardContent>
					</Card>
				</div>
			</main>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent variant="destructive" size="sm">
					<AlertDialogHeader>
						<AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
							<Trash2 className="h-6 w-6" />
						</AlertDialogMedia>
						<AlertDialogTitle>Delete Dialogue</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{dialogue.name}"? This action cannot
							be undone and will delete all nodes and connections.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel variant="outline">{t('common.cancel')}</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleDelete}
						>
							{t('common.delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
