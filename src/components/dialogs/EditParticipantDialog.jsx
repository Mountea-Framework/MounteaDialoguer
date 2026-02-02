import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useParticipantStore } from '@/stores/participantStore';
import { useCategoryStore } from '@/stores/categoryStore';

export function EditParticipantDialog({ open, onOpenChange, participant, projectId }) {
	const { t } = useTranslation();
	const { updateParticipant } = useParticipantStore();
	const { categories, loadCategories } = useCategoryStore();
	const [isUpdating, setIsUpdating] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		category: '',
	});
	const [errors, setErrors] = useState({});

	// Load categories and populate form when dialog opens
	useEffect(() => {
		if (open && projectId) {
			loadCategories(projectId);
		}
		if (open && participant) {
			setFormData({
				name: participant.name || '',
				category: participant.category || '',
			});
		}
	}, [open, projectId, participant, loadCategories]);

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			setErrors({});
		}
	}, [open]);

	const validate = () => {
		const newErrors = {};

		if (!formData.name.trim()) {
			newErrors.name = t('validation.required');
		} else if (/\s/.test(formData.name)) {
			newErrors.name = 'Name cannot contain whitespace';
		}

		if (!formData.category) {
			newErrors.category = t('validation.required');
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;

		setIsUpdating(true);
		try {
			await updateParticipant(participant.id, formData);
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to update participant:', error);
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t('common.edit')} {t('participants.title').slice(0, -1)}</DialogTitle>
					<DialogDescription>
						Update the participant's information
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">
								{t('participants.name')} <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => {
									setFormData({ ...formData, name: e.target.value });
									if (errors.name) setErrors({ ...errors, name: null });
								}}
								placeholder={t('participants.namePlaceholder')}
								className={errors.name ? 'border-destructive' : ''}
								required
							/>
							{errors.name && (
								<p className="text-xs text-destructive">{errors.name}</p>
							)}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="category">
								{t('participants.category')} <span className="text-destructive">*</span>
							</Label>
							<Select
								value={formData.category}
								onValueChange={(value) => {
									setFormData({ ...formData, category: value });
									if (errors.category) setErrors({ ...errors, category: null });
								}}
								required
							>
								<SelectTrigger className={errors.category ? 'border-destructive' : ''}>
									<SelectValue placeholder={t('participants.categoryPlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									{categories.length === 0 ? (
										<div className="py-6 text-center text-sm text-muted-foreground">
											{t('categories.noCategories')}
										</div>
									) : (
										categories.map((category) => (
											<SelectItem key={category.id} value={category.name}>
												{category.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
							{errors.category && (
								<p className="text-xs text-destructive">{errors.category}</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isUpdating}
						>
							{t('common.cancel')}
						</Button>
						<Button
							type="submit"
							disabled={isUpdating || !formData.name.trim() || !formData.category}
						>
							{isUpdating ? t('common.saving') : t('common.save')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
