import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Download, Trash2, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useProjectStore } from '@/stores/projectStore';
import { formatDate } from '@/lib/dateUtils';

/**
 * Project Settings Section Component
 * Project settings and configuration
 */
export function ProjectSettingsSection({ project, onExport, onDelete }) {
	const { t } = useTranslation();
	const { updateProject } = useProjectStore();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formData, setFormData] = useState({
		name: project.name || '',
		description: project.description || '',
		version: project.version || '1.0.0',
	});

	const handleSave = async () => {
		if (!formData.name.trim()) return;

		setIsSaving(true);
		try {
			await updateProject(project.id, {
				name: formData.name,
				description: formData.description,
				version: formData.version,
			});
			setIsEditing(false);
		} catch (error) {
			console.error('Failed to update project:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = () => {
		setFormData({
			name: project.name || '',
			description: project.description || '',
			version: project.version || '1.0.0',
		});
		setIsEditing(false);
	};

	const handleDelete = () => {
		onDelete();
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-2xl font-bold">{t('settings.title')}</h2>
				<p className="text-sm text-muted-foreground mt-1">
					{t('settings.projectDescription')}
				</p>
			</div>

			{/* Project Information */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Info className="h-5 w-5 text-primary" />
								{t('settings.projectInfo')}
							</CardTitle>
							<CardDescription className="mt-1.5">
								{t('settings.projectInfoDescription')}
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
							<Label htmlFor="name">{t('projects.projectName')}</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								disabled={!isEditing}
								placeholder={t('projects.projectName')}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">{t('projects.projectDescription')}</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								disabled={!isEditing}
								placeholder={t('settings.descriptionPlaceholder')}
								rows={3}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="version">{t('settings.version')}</Label>
							<Input
								id="version"
								value={formData.version}
								onChange={(e) =>
									setFormData({ ...formData, version: e.target.value })
								}
								disabled={!isEditing}
								placeholder="1.0.0"
							/>
						</div>
					</div>

					{isEditing && (
						<div className="flex justify-end gap-2 pt-4 border-t">
							<Button variant="outline" onClick={handleCancel} disabled={isSaving}>
								{t('common.cancel')}
							</Button>
							<Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
								<Save className="h-4 w-4 mr-2" />
								{isSaving ? t('common.saving') : t('common.save')}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Project Metadata */}
			<Card>
				<CardHeader>
					<CardTitle>{t('settings.metadata')}</CardTitle>
					<CardDescription>{t('settings.metadataDescription')}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3">
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">{t('settings.projectId')}</span>
							<code className="text-sm font-mono bg-muted px-2 py-1 rounded">
								{project.id}
							</code>
						</div>
						<Separator />
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">{t('projects.created')}</span>
							<span className="text-sm font-medium">{formatDate(project.createdAt)}</span>
						</div>
						<Separator />
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">{t('projects.modified')}</span>
							<span className="text-sm font-medium">{formatDate(project.modifiedAt)}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Export & Import */}
			<Card>
				<CardHeader>
					<CardTitle>{t('settings.dataManagement')}</CardTitle>
					<CardDescription>{t('settings.dataManagementDescription')}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button onClick={onExport} variant="outline" className="w-full justify-start gap-2">
						<Download className="h-4 w-4" />
						{t('settings.exportProject')}
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
					<CardDescription>{t('settings.dangerZoneDescription')}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						onClick={handleDelete}
						className="w-full justify-start gap-2"
					>
						<Trash2 className="h-4 w-4" />
						{t('projects.deleteProject')}
					</Button>
				</CardContent>
			</Card>

		</div>
	);
}
