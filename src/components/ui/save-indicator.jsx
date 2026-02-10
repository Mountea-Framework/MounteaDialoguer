import { Check, Circle, Loader2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

/**
 * Save Status Indicator Component
 * Shows the current save state (saved, saving, unsaved, error)
 */
export function SaveIndicator({ status = 'saved', lastSaved, className }) {
	const { t } = useTranslation();

	const statusConfig = {
		saved: {
			icon: Check,
			iconClass: 'text-green-500',
			text: t('editor.saveStatus.saved'),
			dotClass: 'bg-green-500',
		},
		saving: {
			icon: Loader2,
			iconClass: 'text-blue-500 animate-spin',
			text: t('editor.saveStatus.saving'),
			dotClass: 'bg-blue-500',
		},
		unsaved: {
			icon: Circle,
			iconClass: 'text-orange-500',
			text: t('editor.saveStatus.unsaved'),
			dotClass: 'bg-orange-500 animate-pulse',
		},
		error: {
			icon: AlertCircle,
			iconClass: 'text-red-500',
			text: t('editor.saveStatus.error'),
			dotClass: 'bg-red-500',
		},
	};

	const config = statusConfig[status] || statusConfig.saved;
	const Icon = config.icon;

	const formatTime = (date) => {
		if (!date) return '';
		const now = new Date();
		const diff = now - date;

		// Less than a minute
		if (diff < 60000) {
			return t('common.time.justNow');
		}

		// Less than an hour
		if (diff < 3600000) {
			const minutes = Math.floor(diff / 60000);
			return t('common.time.minutesAgo', { count: minutes });
		}

		// Less than a day
		if (diff < 86400000) {
			const hours = Math.floor(diff / 3600000);
			return t('common.time.hoursAgo', { count: hours });
		}

		// Format as time
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	};

	return (
		<div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
			<div className="flex items-center gap-1.5">
				<Icon className={cn('h-3.5 w-3.5', config.iconClass)} />
				<span className="font-medium">{config.text}</span>
			</div>
			{lastSaved && status === 'saved' && (
				<span className="text-xs opacity-70">({formatTime(lastSaved)})</span>
			)}
		</div>
	);
}

/**
 * Compact save indicator (just the dot)
 */
export function SaveDot({ status = 'saved', className }) {
	const statusConfig = {
		saved: 'bg-green-500',
		saving: 'bg-blue-500 animate-spin',
		unsaved: 'bg-orange-500 animate-pulse',
		error: 'bg-red-500',
	};

	return (
		<div className={cn('relative', className)}>
			<div className={cn('h-2 w-2 rounded-full', statusConfig[status] || statusConfig.saved)} />
			<div
				className={cn(
					'absolute inset-0 h-2 w-2 rounded-full animate-ping',
					statusConfig[status] || statusConfig.saved,
					status === 'saving' && 'opacity-75'
				)}
			/>
		</div>
	);
}
