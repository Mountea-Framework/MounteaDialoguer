import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Edit3, User } from 'lucide-react';
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
	AlertDialogMedia,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useParticipantStore } from '@/stores/participantStore';
import { EditParticipantDialog } from '@/components/dialogs/EditParticipantDialog';

export function ParticipantCard({ participant }) {
	const { t } = useTranslation();
	const { deleteParticipant } = useParticipantStore();
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [showEditDialog, setShowEditDialog] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			await deleteParticipant(participant.id);
			setShowDeleteDialog(false);
		} catch (error) {
			console.error('Failed to delete participant:', error);
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
							<div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
								{participant.name.charAt(0).toUpperCase()}
							</div>
							<div className="flex-1">
								<h3 className="font-medium text-sm">{participant.name}</h3>
								{participant.category && (
									<Badge variant="outline" className="mt-1 text-xs">
										{participant.category}
									</Badge>
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

			<EditParticipantDialog
				open={showEditDialog}
				onOpenChange={setShowEditDialog}
				participant={participant}
				projectId={participant.projectId}
			/>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent variant="destructive" size="sm">
					<AlertDialogHeader>
						<AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
							<Trash2 className="h-6 w-6" />
						</AlertDialogMedia>
						<AlertDialogTitle>{t('participants.deleteTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('participants.deleteDescription', { name: participant.name })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel variant="outline" disabled={isDeleting}>
							{t('common.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={handleDelete}
							disabled={isDeleting}
						>
							{isDeleting ? t('common.deleting') : t('common.delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
