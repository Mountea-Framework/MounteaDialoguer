import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useProjectStore } from '@/stores/projectStore';

/**
 * Create Project Dialog Component
 * Modal for creating a new project
 */
export function CreateProjectDialog({ open, onOpenChange }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { createProject } = useProjectStore();
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		version: '',
	});
	const [errors, setErrors] = useState({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleChange = (field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: null }));
		}
	};

	const validate = () => {
		const newErrors = {};

		if (!formData.name.trim()) {
			newErrors.name = t('validation.required');
		} else if (/\s/.test(formData.name)) {
			newErrors.name = 'Name cannot contain whitespace';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!validate()) {
			return;
		}

		setIsSubmitting(true);

		try {
			const project = await createProject({
				name: formData.name.trim(),
				description: formData.description.trim(),
				version: formData.version.trim() || '1.0.0',
			});

			// Reset form
			setFormData({ name: '', description: '', version: '' });
			setErrors({});
			onOpenChange(false);

			// Navigate to the new project
			navigate({ to: '/projects/$projectId', params: { projectId: project.id } });
		} catch (error) {
			console.error('Error creating project:', error);
			setErrors({ submit: t('common.error') });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		setFormData({ name: '', description: '', version: '' });
		setErrors({});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{t('projects.createNew')}</DialogTitle>
					<DialogDescription>
						{t('projects.createFirst')}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4 sm:-mx-6 sm:px-6">
						<div className="space-y-4 py-4">
							<div className="space-y-2">
								<Label htmlFor="name">
									{t('projects.projectName')} <span className="text-destructive">*</span>
								</Label>
								<Input
									id="name"
									placeholder="My Awesome Game"
									value={formData.name}
									onChange={(e) => handleChange('name', e.target.value)}
									className={errors.name ? 'border-destructive' : ''}
									autoFocus
								/>
								{errors.name && (
									<p className="text-xs text-destructive">{errors.name}</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">{t('projects.projectDescription')}</Label>
								<Textarea
									id="description"
									placeholder="A brief description of your project..."
									value={formData.description}
									onChange={(e) => handleChange('description', e.target.value)}
									rows={3}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="version">Version</Label>
								<Input
									id="version"
									placeholder="1.0.0"
									value={formData.version}
									onChange={(e) => handleChange('version', e.target.value)}
								/>
							</div>

							{errors.submit && (
								<p className="text-sm text-destructive">{errors.submit}</p>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleCancel}
							disabled={isSubmitting}
						>
							{t('common.cancel')}
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting ? t('common.loading') : t('common.create')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
