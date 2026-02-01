import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit3, Sparkles } from 'lucide-react';
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
import { useDecoratorStore } from '@/stores/decoratorStore';

export function DecoratorCard({ decorator }) {
	const { t } = useTranslation();
	const { deleteDecorator } = useDecoratorStore();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteDecorator(decorator.id);
			setShowDeleteDialog(false);
		} catch (error) {
			console.error('Failed to delete decorator:', error);
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<Card className="group hover:shadow-md transition-all hover:border-primary/50">
				<CardContent className="p-4">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-3 flex-1">
							<div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white">
								<Sparkles className="h-6 w-6" />
							</div>
							<div className="flex-1">
								<h3 className="font-medium text-sm">{decorator.name}</h3>
								{decorator.type && (
									<Badge variant="outline" className="mt-1 text-xs">
										{decorator.type}
									</Badge>
								)}
							</div>
						</div>
						<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
							<Button
								variant="ghost"
								size="icon"
								className="h-8 w-8 text-muted-foreground hover:text-primary"
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

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('decorators.deleteTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('decorators.deleteDescription', { name: decorator.name })}
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
