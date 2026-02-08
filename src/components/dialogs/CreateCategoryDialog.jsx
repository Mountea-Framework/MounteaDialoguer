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

export function CreateCategoryDialog({ open, onOpenChange, projectId }) {
	const { t } = useTranslation();
	const { categories, createCategory, loadCategories } = useCategoryStore();
	const [isCreating, setIsCreating] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		parentCategoryId: null,
	});
	const [errors, setErrors] = useState({});

	// Load categories when dialog opens
	useEffect(() => {
		if (open && projectId) {
			loadCategories(projectId);
		}
	}, [open, projectId, loadCategories]);

	// Reset form when dialog closes
	useEffect(() => {
		if (!open) {
			setFormData({ name: '', parentCategoryId: null });
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

		if (formData.parentCategoryId) {
			const maxDepth = 5;
			let depth = 0;
			let currentId = formData.parentCategoryId;
			const visited = new Set();

			while (currentId) {
				if (visited.has(currentId)) {
					depth = Number.POSITIVE_INFINITY;
					break;
				}
				visited.add(currentId);
				const current = categories.find((c) => c.id === currentId);
				if (!current) break;
				depth += 1;
				currentId = current.parentCategoryId || null;
			}

			if (!Number.isFinite(depth) || depth + 1 > maxDepth) {
				newErrors.parentCategoryId = `Category depth cannot exceed ${maxDepth} levels`;
			}
		}

		if (formData.name.trim()) {
			const name = formData.name.trim();
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
			const rootId = formData.parentCategoryId
				? getRootId(formData.parentCategoryId)
				: null;
			const isNameInTree = (rootCategoryId) => {
				const stack = [rootCategoryId];
				const visited = new Set();
				while (stack.length > 0) {
					const currentId = stack.pop();
					if (!currentId || visited.has(currentId)) continue;
					visited.add(currentId);
					const current = categories.find((c) => c.id === currentId);
					if (!current) continue;
					if (current.name === name) return true;
					categories
						.filter((c) => c.parentCategoryId === current.id)
						.forEach((child) => stack.push(child.id));
				}
				return false;
			};
			const isUnique = rootId
				? !isNameInTree(rootId)
				: !categories.some((c) => !c.parentCategoryId && c.name === name);
			if (!isUnique) {
				newErrors.name = 'Category name must be unique within its tree';
			}
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;

		setIsCreating(true);
		try {
			await createCategory({
				name: formData.name,
				parentCategoryId: formData.parentCategoryId || null,
				projectId,
			});
			setFormData({ name: '', parentCategoryId: null });
			setErrors({});
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to create category:', error);
		} finally {
			setIsCreating(false);
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
					<DialogTitle>{t('categories.addNew')}</DialogTitle>
					<DialogDescription>
						{t('categories.createDescription')}
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
									{
										setFormData({
											...formData,
											parentCategoryId: value === 'none' ? null : value,
										});
										if (errors.parentCategoryId) {
											setErrors({ ...errors, parentCategoryId: null });
										} else if (errors.name) {
											setErrors({ ...errors, name: null });
										}
									}
								}
							>
								<SelectTrigger>
									<SelectValue placeholder={t('categories.parentCategoryPlaceholder')} />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">
										{t('categories.noParent')}
									</SelectItem>
									{categories.map((category) => (
										<SelectItem key={category.id} value={category.id}>
											{getCategoryPath(category.id)}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.parentCategoryId && (
								<p className="text-xs text-destructive">{errors.parentCategoryId}</p>
							)}
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
							disabled={isCreating}
						>
							{t('common.cancel')}
						</Button>
						<Button type="submit" disabled={isCreating || !formData.name.trim()}>
							{isCreating ? t('common.creating') : t('common.create')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
