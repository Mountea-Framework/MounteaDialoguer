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
import { NativeSelect } from '@/components/ui/native-select';
import { useParticipantStore } from '@/stores/participantStore';
import { useCategoryStore } from '@/stores/categoryStore';

export function EditParticipantDialog({ open, onOpenChange, participant, projectId }) {
	const { t } = useTranslation();
	const { updateParticipant, participants } = useParticipantStore();
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

	// Build hierarchical category display
	const getCategoryPath = (categoryId) => {
		const path = [];
		let current = categories.find((c) => c.id === categoryId);
		while (current) {
			path.unshift(current.name);
			current = categories.find((c) => c.id === current.parentCategoryId);
		}
		return path.join(' > ');
	};

	const groupedCategories = (() => {
		const groups = new Map();
		categories.forEach((category) => {
			const path = getCategoryPath(category.id);
			if (!path) return;
			const [root] = path.split(' > ');
			if (!groups.has(root)) {
				groups.set(root, []);
			}
			groups.get(root).push({
				id: category.id,
				name: category.name,
				label: path,
			});
		});

		return Array.from(groups.entries())
			.map(([label, options]) => ({
				label,
				options: options.sort((a, b) => a.label.localeCompare(b.label)),
			}))
			.sort((a, b) => a.label.localeCompare(b.label));
	})();

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
		} else if (!/^[A-Za-z0-9]+$/.test(formData.name)) {
			newErrors.name = 'Name must contain only letters and numbers';
		} else if (formData.name.length > 16) {
			newErrors.name = 'Name must be 16 characters or fewer';
		}

		if (!formData.category) {
			newErrors.category = t('validation.required');
		}

		if (!newErrors.name && formData.category && participant) {
			const name = formData.name.trim();
			const categoryMatches = categories.filter((c) => c.name === formData.category);
			const getRootId = (categoryId) => {
				let currentId = categoryId;
				const visited = new Set();
				while (currentId) {
					if (visited.has(currentId)) return null;
					visited.add(currentId);
					const current = categories.find((c) => c.id === currentId);
					if (!current) return null;
					if (!current.parentCategoryId) return current.id;
					currentId = current.parentCategoryId;
				}
				return null;
			};

			const rootIds = categoryMatches
				.map((cat) => getRootId(cat.id))
				.filter(Boolean);

			const projectParticipants = participants.filter((p) => p.projectId === projectId);
			const isDuplicate = projectParticipants.some((p) => {
				if (p.id === participant.id) return false;
				if (p.name !== name) return false;
				const matchCategory = categories.find((c) => c.name === p.category);
				if (!matchCategory) return false;
				const rootId = getRootId(matchCategory.id);
				return rootId && rootIds.includes(rootId);
			});

			if (rootIds.length > 0 && isDuplicate) {
				newErrors.name = 'Participant name must be unique within its category tree';
			}
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
						{t('participants.updateDescription')}
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
							<NativeSelect
								id="category"
								value={formData.category}
								onChange={(e) => {
									setFormData({ ...formData, category: e.target.value });
									if (errors.category) setErrors({ ...errors, category: null });
								}}
								className={errors.category ? 'border-destructive' : ''}
								required
							>
								<option value="" disabled>
									{t('participants.categoryPlaceholder')}
								</option>
								{groupedCategories.length === 0 ? (
									<option value="" disabled>
										{t('categories.noCategories')}
									</option>
								) : (
									groupedCategories.map((group) => (
										<optgroup key={group.label} label={group.label}>
											{group.options.map((option) => (
												<option key={option.id} value={option.name}>
													{option.label}
												</option>
											))}
										</optgroup>
									))
								)}
							</NativeSelect>
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
