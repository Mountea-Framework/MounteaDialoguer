import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useSyncStore } from '@/stores/syncStore';
import { cn } from '@/lib/utils';
import { isMobileDevice } from '@/lib/deviceDetection';

const steps = [
	{ id: 'checking', labelKey: 'sync.progress.checking' },
	{ id: 'downloading', labelKey: 'sync.progress.downloading' },
	{ id: 'decrypting', labelKey: 'sync.progress.decrypting' },
	{ id: 'applying', labelKey: 'sync.progress.applying' },
];

export function SyncPullDialog() {
	const { t } = useTranslation();
	const { pullState } = useSyncStore();
	const [isDesktop, setIsDesktop] = useState(!isMobileDevice());

	useEffect(() => {
		const updateViewportType = () => setIsDesktop(!isMobileDevice());
		updateViewportType();
		window.addEventListener('resize', updateViewportType);
		window.addEventListener('orientationchange', updateViewportType);
		window.addEventListener('device-override', updateViewportType);
		return () => {
			window.removeEventListener('resize', updateViewportType);
			window.removeEventListener('orientationchange', updateViewportType);
			window.removeEventListener('device-override', updateViewportType);
		};
	}, []);

	const currentIndex = Math.max(
		0,
		steps.findIndex((step) => step.id === pullState.step)
	);

	const isBulk = pullState.mode === 'bulk';

	const progressContent = (
		<div className="space-y-4">
			<div className="w-full h-2 rounded-full bg-muted overflow-hidden">
				<div
					className="h-full bg-primary transition-all duration-300"
					style={{ width: `${pullState.progress}%` }}
				/>
			</div>

			{isBulk ? (
				<div className="text-sm text-muted-foreground">
					{t('sync.bulkProgress', {
						current: pullState.current || 0,
						total: pullState.total || 0,
					})}
				</div>
			) : (
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
			)}
		</div>
	);

	return isDesktop ? (
		<Dialog open={pullState.active} onOpenChange={() => {}}>
			<DialogContent showClose={false} className="max-w-lg">
				<DialogHeader>
					<DialogTitle>
						{isBulk ? t('sync.bulkTitle') : t('sync.pullTitle')}
					</DialogTitle>
					<DialogDescription>
						{isBulk ? t('sync.bulkDescription') : t('sync.pullDescription')}
					</DialogDescription>
				</DialogHeader>
				{progressContent}
			</DialogContent>
		</Dialog>
	) : (
		<Drawer open={pullState.active} onOpenChange={() => {}}>
			<DrawerContent className="max-h-[75vh]">
				<DrawerHeader className="text-left">
					<DrawerTitle>{isBulk ? t('sync.bulkTitle') : t('sync.pullTitle')}</DrawerTitle>
					<DrawerDescription>
						{isBulk ? t('sync.bulkDescription') : t('sync.pullDescription')}
					</DrawerDescription>
				</DrawerHeader>
				<div className="px-4 pb-4">{progressContent}</div>
			</DrawerContent>
		</Drawer>
	);
}
