import { useTranslation } from 'react-i18next';
import { Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusStyles = {
	connected: {
		labelKey: 'sync.status.connected',
		dot: 'bg-green-500',
		text: 'text-green-600 dark:text-green-400',
	},
	connecting: {
		labelKey: 'sync.status.connecting',
		dot: 'bg-blue-500 animate-pulse',
		text: 'text-blue-600 dark:text-blue-400',
	},
	syncing: {
		labelKey: 'sync.status.syncing',
		dot: 'bg-blue-500 animate-pulse',
		text: 'text-blue-600 dark:text-blue-400',
	},
	error: {
		labelKey: 'sync.status.error',
		dot: 'bg-red-500',
		text: 'text-red-600 dark:text-red-400',
	},
	disconnected: {
		labelKey: 'sync.status.disconnected',
		dot: 'bg-muted-foreground/50',
		text: 'text-muted-foreground',
	},
};

function ProviderAvatar({ provider }) {
	const isGoogle = provider === 'googleDrive';

	return (
		<div
			className={cn(
				'h-9 w-9 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm',
				isGoogle
					? 'bg-gradient-to-br from-green-500 to-blue-500'
					: 'bg-muted text-muted-foreground'
			)}
		>
			{isGoogle ? 'G' : <Cloud className="h-4 w-4" />}
		</div>
	);
}

export function SyncStatusBadge({
	provider,
	status = 'disconnected',
	accountLabel,
	className,
}) {
	const { t } = useTranslation();
	const styles = statusStyles[status] || statusStyles.disconnected;

	const providerLabel = provider
		? t(`sync.providers.${provider}`)
		: t('sync.providers.none');

	const subtitle =
		status === 'connected' && accountLabel
			? t('sync.connectedAs', { account: accountLabel })
			: t(styles.labelKey);

	return (
		<div
			className={cn(
				'flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2',
				className
			)}
		>
			<ProviderAvatar provider={provider} />
			<div className="min-w-0 flex-1">
				<p className="text-sm font-semibold truncate">{providerLabel}</p>
				<p className="text-xs text-muted-foreground truncate">{subtitle}</p>
			</div>
			<div className={cn('flex items-center gap-1 text-xs font-medium', styles.text)}>
				<span className={cn('h-2 w-2 rounded-full', styles.dot)} />
				<span className="hidden sm:inline">{t(styles.labelKey)}</span>
			</div>
		</div>
	);
}
