import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit3, Tag } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCategoryStore } from '@/stores/categoryStore';
import { EditCategoryDialog } from '@/components/dialogs/EditCategoryDialog';

export function CategoryCard({ category }) {
	const { t } = useTranslation();
	const { categories, deleteCategory } = useCategoryStore();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteCategory(category.id);
			setShowDeleteDialog(false);
		} catch (error) {
			console.error('Failed to delete category:', error);
		} finally {
			setIsDeleting(false);
		}
	};

	// Build hierarchical category path display
	const getCategoryPath = () => {
		if (!category.parentCategoryId) return null;

		const path = [];
		let currentId = category.parentCategoryId;
		while (currentId) {
			const parent = categories.find((c) => c.id === currentId);
			if (!parent) break;
			path.unshift(parent.name);
			currentId = parent.parentCategoryId;
		}
		return path.length > 0 ? path.join(' > ') : null;
	};

	const parentPath = getCategoryPath();

	return (
		<>
			<Card className="group hover:shadow-md transition-all hover:border-primary/50">
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3 flex-1">
							<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white">
								<Tag className="h-6 w-6" />
							</div>
							<div className="flex-1">
								<h3 className="font-medium text-sm">{category.name}</h3>
								{parentPath && (
									<p className="text-xs text-muted-foreground mt-0.5">
										{parentPath}
									</p>
								)}
							</div>
						</div>
						<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground hover:text-primary"
								onClick={() => setShowEditDialog(true)}
							>
								<Edit3 className="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground hover:text-destructive"
								onClick={() => setShowDeleteDialog(true)}
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<EditCategoryDialog
				open={showEditDialog}
				onOpenChange={setShowEditDialog}
				category={category}
				projectId={category.projectId}
			/>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('categories.deleteTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('categories.deleteDescription', { name: category.name })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>
							{t('common.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							disabled={isDeleting}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{isDeleting ? t('common.deleting') : t('common.delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
