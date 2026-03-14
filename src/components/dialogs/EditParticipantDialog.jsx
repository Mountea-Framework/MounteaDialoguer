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
import {
	processParticipantThumbnailFile,
	resolveParticipantThumbnailDataUrl,
} from '@/lib/participantThumbnails';
import { PARTICIPANT_THUMBNAIL_INPUT_ACCEPT } from '@/lib/sync/core/constants';

export function EditParticipantDialog({ open, onOpenChange, participant, projectId }) {
	const { t } = useTranslation();
	const { updateParticipant, participants } = useParticipantStore();
	const { categories, loadCategories } = useCategoryStore();
	const [isUpdating, setIsUpdating] = useState(false);
	const [isProcessingThumbnail, setIsProcessingThumbnail] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		category: '',
		thumbnail: null,
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
				thumbnail: participant.thumbnail || null,
			});
		}
	}, [open, projectId, participant, loadCategories]);

	// Build hierarchical category display
	const getCategoryPath = (categoryId) => {
		const path = [];
		let current = categories.find((category) => category.id === categoryId);
		while (current) {
			path.unshift(current.name);
			current = categories.find((category) => category.id === current.parentCategoryId);
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
			const categoryMatches = categories.filter((category) => category.name === formData.category);
			const getRootId = (categoryId) => {
				let currentId = categoryId;
				const visited = new Set();
				while (currentId) {
					if (visited.has(currentId)) return null;
					visited.add(currentId);
					const current = categories.find((category) => category.id === currentId);
					if (!current) return null;
					if (!current.parentCategoryId) return current.id;
					currentId = current.parentCategoryId;
				}
				return null;
			};

			const rootIds = categoryMatches.map((category) => getRootId(category.id)).filter(Boolean);

			const projectParticipants = participants.filter((entry) => entry.projectId === projectId);
			const isDuplicate = projectParticipants.some((entry) => {
				if (entry.id === participant.id) return false;
				if (entry.name !== name) return false;
				const matchCategory = categories.find((category) => category.name === entry.category);
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

	const handleThumbnailChange = async (event) => {
		const file = event.target.files?.[0];
		event.target.value = '';
		if (!file) return;

		setIsProcessingThumbnail(true);
		try {
			const thumbnail = await processParticipantThumbnailFile(file);
			setFormData((prev) => ({ ...prev, thumbnail }));
			setErrors((prev) => ({ ...prev, thumbnail: null }));
		} catch (error) {
			setErrors((prev) => ({
				...prev,
				thumbnail: error.message || 'Failed to process thumbnail',
			}));
		} finally {
			setIsProcessingThumbnail(false);
		}
	};

	const handleSubmit = async (event) => {
		event.preventDefault();
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

	const thumbnailUrl = resolveParticipantThumbnailDataUrl(formData.thumbnail);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{t('common.edit')} {t('participants.title').slice(0, -1)}
					</DialogTitle>
					<DialogDescription>{t('participants.updateDescription')}</DialogDescription>
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
								onChange={(event) => {
									setFormData({ ...formData, name: event.target.value });
									if (errors.name) setErrors({ ...errors, name: null });
								}}
								placeholder={t('participants.namePlaceholder')}
								className={errors.name ? 'border-destructive' : ''}
								required
							/>
							{errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="thumbnail">Participant Thumbnail</Label>
							<div className="flex items-center gap-3">
								<div className="w-14 h-14 rounded-full overflow-hidden border border-border shrink-0 bg-muted">
									{thumbnailUrl ? (
										<img
											src={thumbnailUrl}
											alt="Participant Thumbnail"
											className="w-full h-full object-cover"
										/>
									) : (
										<div className="w-full h-full flex items-center justify-center text-sm font-semibold text-muted-foreground">
											{(formData.name || '?').charAt(0).toUpperCase()}
										</div>
									)}
								</div>
								<div className="flex-1 space-y-2">
									<Input
										id="thumbnail"
										type="file"
										accept={PARTICIPANT_THUMBNAIL_INPUT_ACCEPT}
										onChange={handleThumbnailChange}
										disabled={isProcessingThumbnail}
									/>
									{formData.thumbnail && (
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => setFormData((prev) => ({ ...prev, thumbnail: null }))}
										>
											Remove Thumbnail
										</Button>
									)}
								</div>
							</div>
							{errors.thumbnail && (
								<p className="text-xs text-destructive">{errors.thumbnail}</p>
							)}
						</div>

						<div className="grid gap-2">
							<Label htmlFor="category">
								{t('participants.category')} <span className="text-destructive">*</span>
							</Label>
							<NativeSelect
								id="category"
								value={formData.category}
								onChange={(event) => {
									setFormData({ ...formData, category: event.target.value });
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
							{errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isUpdating || isProcessingThumbnail}
						>
							{t('common.cancel')}
						</Button>
						<Button
							type="submit"
							disabled={
								isUpdating ||
								isProcessingThumbnail ||
								!formData.name.trim() ||
								!formData.category
							}
						>
							{isUpdating ? t('common.saving') : t('common.save')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
