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
		} else if (!/^[A-Za-z0-9]+$/.test(formData.name)) {
			newErrors.name = 'Name must contain only letters and numbers';
		} else if (formData.name.length > 16) {
			newErrors.name = 'Name must be 16 characters or fewer';
		}

		const maxDepth = 5;
		const childrenByParent = new Map();
		categories.forEach((cat) => {
			const parentId = cat.parentCategoryId || null;
			if (!childrenByParent.has(parentId)) {
				childrenByParent.set(parentId, []);
			}
			childrenByParent.get(parentId).push(cat.id);
		});

		const getMaxSubtreeDepth = (categoryId) => {
			const visited = new Set();
			const dfs = (nodeId) => {
				if (visited.has(nodeId)) return 0;
				visited.add(nodeId);
				const children = childrenByParent.get(nodeId) || [];
				if (children.length === 0) return 1;
				let maxChildDepth = 0;
				children.forEach((childId) => {
					maxChildDepth = Math.max(maxChildDepth, dfs(childId));
				});
				return 1 + maxChildDepth;
			};
			return dfs(category?.id);
		};

		const getDepthToRoot = (categoryId) => {
			let depth = 0;
			let currentId = categoryId;
			const visited = new Set();
			while (currentId) {
				if (visited.has(currentId)) {
					return Number.POSITIVE_INFINITY;
				}
				visited.add(currentId);
				const current = categories.find((c) => c.id === currentId);
				if (!current) break;
				depth += 1;
				currentId = current.parentCategoryId || null;
			}
			return depth;
		};

		if (category) {
			const parentDepth = formData.parentCategoryId
				? getDepthToRoot(formData.parentCategoryId)
				: 0;
			const subtreeDepth = getMaxSubtreeDepth(category.id);
			const totalDepth = parentDepth + subtreeDepth;

			if (!Number.isFinite(parentDepth) || totalDepth > maxDepth) {
				newErrors.parentCategoryId = `Category depth cannot exceed ${maxDepth} levels`;
			}
		}

		if (category && formData.name.trim()) {
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
				: category.id;
			const isNameInTree = (rootCategoryId) => {
				const stack = [rootCategoryId];
				const visited = new Set();
				while (stack.length > 0) {
					const currentId = stack.pop();
					if (!currentId || visited.has(currentId)) continue;
					visited.add(currentId);
					const current = categories.find((c) => c.id === currentId);
					if (!current) continue;
					if (current.id !== category.id && current.name === name) return true;
					categories
						.filter((c) => c.parentCategoryId === current.id)
						.forEach((child) => stack.push(child.id));
				}
				return false;
			};
			const isUnique = rootId
				? !isNameInTree(rootId)
				: !categories.some(
					(c) => !c.parentCategoryId && c.id !== category.id && c.name === name
				);
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

	const groupedParentOptions = (() => {
		const groups = new Map();
		categories
			.filter((cat) => cat.id !== category?.id)
			.forEach((cat) => {
				const path = getCategoryPath(cat.id);
				if (!path) return;
				const [root] = path.split(' > ');
				if (!groups.has(root)) {
					groups.set(root, []);
				}
				groups.get(root).push({
					id: cat.id,
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
							<NativeSelect
								id="parentCategory"
								value={formData.parentCategoryId || 'none'}
								onChange={(e) => {
									const value = e.target.value;
									setFormData({
										...formData,
										parentCategoryId: value === 'none' ? null : value,
									});
									if (errors.parentCategoryId) {
										setErrors({ ...errors, parentCategoryId: null });
									} else if (errors.name) {
										setErrors({ ...errors, name: null });
									}
								}}
							>
								<option value="none">
									{t('categories.noParent')}
								</option>
								{groupedParentOptions.map((group) => (
									<optgroup key={group.label} label={group.label}>
										{group.options.map((option) => (
											<option key={option.id} value={option.id}>
												{option.label}
											</option>
										))}
									</optgroup>
								))}
							</NativeSelect>
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
