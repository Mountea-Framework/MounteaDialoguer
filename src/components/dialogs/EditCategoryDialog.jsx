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
import { useCategoryStore } from '@/stores/categoryStore';

export function EditCategoryDialog({ open, onOpenChange, category, projectId }) {
	const { t } = useTranslation();
	const { categories, updateCategory, loadCategories } = useCategoryStore();
	const [isUpdating, setIsUpdating] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		parentCategoryId: null,
	});
	const [errors, setErrors] = useState({});

	// Load categories and populate form when dialog opens
	useEffect(() => {
		if (open && projectId) {
			loadCategories(projectId);
		}
		if (open && category) {
			setFormData({
				name: category.name || '',
				parentCategoryId: category.parentCategoryId || null,
			});
		}
	}, [open, projectId, category, loadCategories]);

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

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;

		setIsUpdating(true);
		try {
			await updateCategory(category.id, {
				name: formData.name,
				parentCategoryId: formData.parentCategoryId || null,
			});
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to update category:', error);
		} finally {
			setIsUpdating(false);
		}
	};

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

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>{t('common.edit')} {t('categories.title').slice(0, -1)}</DialogTitle>
					<DialogDescription>
						Update the category's information
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">
								{t('categories.name')} <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => {
									setFormData({ ...formData, name: e.target.value });
									if (errors.name) setErrors({ ...errors, name: null });
								}}
								placeholder={t('categories.namePlaceholder')}
								className={errors.name ? 'border-destructive' : ''}
								required
							/>
							{errors.name && (
								<p className="text-xs text-destructive">{errors.name}</p>
							)}
						</div>
						<div className="grid gap-2">
							<Label htmlFor="parentCategory">
								{t('categories.parentCategory')}
							</Label>
							<Select
								value={formData.parentCategoryId || 'none'}
								onValueChange={(value) =>
									setFormData({
										...formData,
										parentCategoryId: value === 'none' ? null : value,
									})
								}
							>
								<SelectTrigger>
									<SelectValue placeholder={t('categories.parentCategoryPlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">
										{t('categories.noParent')}
									</SelectItem>
									{categories
										.filter((cat) => cat.id !== category?.id) // Don't allow selecting itself
										.map((cat) => (
											<SelectItem key={cat.id} value={cat.id}>
												{getCategoryPath(cat.id)}
											</SelectItem>
										))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								{t('categories.parentCategoryHelp')}
							</p>
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
						<Button type="submit" disabled={isUpdating || !formData.name.trim()}>
							{isUpdating ? t('common.saving') : t('common.save')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
