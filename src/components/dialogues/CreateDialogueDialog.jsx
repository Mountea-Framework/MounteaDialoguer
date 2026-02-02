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
import { useDialogueStore } from '@/stores/dialogueStore';
import { celebrateFirstDialogue, celebrateSmallWin } from '@/lib/confetti';

/**
 * Create Dialogue Dialog Component
 * Modal for creating a new dialogue within a project
 */
export function CreateDialogueDialog({ open, onOpenChange, projectId }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { createDialogue, dialogues } = useDialogueStore();
	const [formData, setFormData] = useState({
		name: '',
		description: '',
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
			// Check if this is the first dialogue for the project
			const projectDialogues = dialogues.filter((d) => d.projectId === projectId);
			const isFirstDialogue = projectDialogues.length === 0;

			const dialogue = await createDialogue({
				projectId,
				name: formData.name.trim(),
				description: formData.description.trim(),
			});

			// Celebrate!
			if (isFirstDialogue) {
				celebrateFirstDialogue();
			} else {
				celebrateSmallWin();
			}

			// Reset form
			setFormData({ name: '', description: '' });
			setErrors({});
			onOpenChange(false);

			// Navigate to the new dialogue editor
			navigate({
				to: '/projects/$projectId/dialogue/$dialogueId',
				params: { projectId, dialogueId: dialogue.id },
			});
		} catch (error) {
			console.error('Error creating dialogue:', error);
			setErrors({ submit: t('common.error') });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = () => {
		setFormData({ name: '', description: '' });
		setErrors({});
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle>{t('dialogues.createNew')}</DialogTitle>
					<DialogDescription>
						{t('dialogues.createFirst')}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 py-4">
					<div className="space-y-2">
						<Label htmlFor="dialogue-name">
							{t('dialogues.dialogueName')} <span className="text-destructive">*</span>
						</Label>
						<Input
							id="dialogue-name"
							placeholder="Welcome Conversation"
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
						<Label htmlFor="dialogue-description">
							{t('projects.projectDescription')}
						</Label>
						<Textarea
							id="dialogue-description"
							placeholder="A brief description of this dialogue..."
							value={formData.description}
							onChange={(e) => handleChange('description', e.target.value)}
							rows={3}
						/>
					</div>

					{errors.submit && (
						<p className="text-sm text-destructive">{errors.submit}</p>
					)}

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
