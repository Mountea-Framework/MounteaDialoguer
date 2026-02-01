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

export function CreateParticipantDialog({ open, onOpenChange, projectId }) {
	const { t } = useTranslation();
	const { createParticipant } = useParticipantStore();
	const { categories, loadCategories } = useCategoryStore();
	const [isCreating, setIsCreating] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		category: '',
	});
	const [errors, setErrors] = useState({});

	// Load categories when dialog opens
	useEffect(() => {
		if (open && projectId) {
			loadCategories(projectId);
		}
	}, [open, projectId, loadCategories]);

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

		setIsCreating(true);
		try {
			await createParticipant({
				...formData,
				projectId,
			});
			setFormData({ name: '', category: '' });
			setErrors({});
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to create participant:', error);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t('participants.addNew')}</DialogTitle>
					<DialogDescription>
						{t('participants.createDescription')}
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
							disabled={isCreating}
						>
							{t('common.cancel')}
						</Button>
						<Button
							type="submit"
							disabled={isCreating || !formData.name.trim() || !formData.category}
						>
							{isCreating ? t('common.creating') : t('common.create')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
