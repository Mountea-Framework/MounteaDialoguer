import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSyncStore } from '@/stores/syncStore';
import { cn } from '@/lib/utils';

const steps = [
	{ id: 'checking', labelKey: 'sync.progress.checking' },
	{ id: 'downloading', labelKey: 'sync.progress.downloading' },
	{ id: 'decrypting', labelKey: 'sync.progress.decrypting' },
	{ id: 'applying', labelKey: 'sync.progress.applying' },
];

export function SyncPullDialog() {
	const { t } = useTranslation();
	const { pullState } = useSyncStore();

	const currentIndex = Math.max(
		0,
		steps.findIndex((step) => step.id === pullState.step)
	);

	return (
		<Dialog open={pullState.active} onOpenChange={() => {}}>
			<DialogContent showClose={false} className="max-w-lg">
				<DialogHeader>
					<DialogTitle>{t('sync.pullTitle')}</DialogTitle>
					<DialogDescription>{t('sync.pullDescription')}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="w-full h-2 rounded-full bg-muted overflow-hidden">
						<div
							className="h-full bg-primary transition-all duration-300"
							style={{ width: `${pullState.progress}%` }}
						/>
					</div>

					<div className="space-y-2">
						{steps.map((step, index) => {
							const isComplete = index < currentIndex;
							const isActive = index === currentIndex;

							return (
								<div
									key={step.id}
									className={cn(
										'flex items-center gap-2 text-sm',
										isActive ? 'text-foreground' : 'text-muted-foreground'
									)}
								>
									{isComplete ? (
										<CheckCircle2 className="h-4 w-4 text-green-500" />
									) : isActive ? (
										<Loader2 className="h-4 w-4 animate-spin text-primary" />
									) : (
										<div className="h-4 w-4 rounded-full border border-muted-foreground/40" />
									)}
									<span>{t(step.labelKey)}</span>
								</div>
							);
						})}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
