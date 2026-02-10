import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Toast store
const toastStore = {
	toasts: [],
	listeners: [],
	subscribe(listener) {
		this.listeners.push(listener);
		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener);
		};
	},
	notify() {
		this.listeners.forEach((listener) => listener(this.toasts));
	},
	addToast(toast) {
		const id = Date.now() + Math.random();
		this.toasts.push({ ...toast, id });
		this.notify();
		console.debug('[toast] add', id, toast.title);
		return id;
	},
	removeToast(id) {
		this.toasts = this.toasts.filter((t) => t.id !== id);
		this.notify();
	},
};

// Standalone toast function for use outside React components (e.g., stores)
export const toast = (options) => {
	return toastStore.addToast({
		...options,
		duration: options.duration || 3000,
	});
};

export const clearToasts = () => {
	const ids = toastStore.toasts.map((t) => t.id);
	console.debug('[toast] clear', ids);
	ids.forEach((id) => toastStore.removeToast(id));
};

// Toast hook for use in React components
export function useToast() {
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
		// Ensure any toasts queued before mount are shown immediately.
		setToasts([...toastStore.toasts]);
		return toastStore.subscribe(setToasts);
	}, []);

	const dismiss = (id) => {
		toastStore.removeToast(id);
	};

	return {
		toast,
		dismiss,
		toasts,
	};
}

// Toaster component
export function Toaster() {
	const { toasts, dismiss } = useToast();

	useEffect(() => {
		if (toasts.length > 0) {
			console.debug('[toast] render', toasts.length);
		}
	}, [toasts]);

	return (
		<div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
			))}
		</div>
	);
}

// Individual toast component
function Toast({ toast, onDismiss }) {
	const [progress, setProgress] = useState(100);

	useEffect(() => {
		if (toast.duration && !toast.action) {
			const timer = setTimeout(onDismiss, toast.duration);

			// Animate progress bar
			const startTime = Date.now();
			const interval = setInterval(() => {
				const elapsed = Date.now() - startTime;
				const remaining = Math.max(0, 100 - (elapsed / toast.duration) * 100);
				setProgress(remaining);

				if (remaining === 0) {
					clearInterval(interval);
				}
			}, 16); // ~60fps

			return () => {
				clearTimeout(timer);
				clearInterval(interval);
			};
		}
	}, [toast.duration, toast.action, onDismiss]);

	const icons = {
		success: CheckCircle2,
		error: AlertCircle,
		warning: AlertTriangle,
		info: Info,
		loading: Loader2,
	};

	const Icon = icons[toast.variant] || Info;

	const variantStyles = {
		success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
		error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
		warning:
			'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
		info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
		loading: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
	};

	const iconStyles = {
		success: 'text-green-600 dark:text-green-400',
		error: 'text-red-600 dark:text-red-400',
		warning: 'text-orange-600 dark:text-orange-400',
		info: 'text-blue-600 dark:text-blue-400',
		loading: 'text-blue-600 dark:text-blue-400',
	};

	const handleAction = () => {
		if (toast.action?.onClick) {
			toast.action.onClick();
			if (toast.dismissOnAction !== false) {
				onDismiss();
			}
		}
	};

	return (
		<div
			className={cn(
				'pointer-events-auto flex flex-col rounded-lg border shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-right relative overflow-hidden',
				variantStyles[toast.variant] || variantStyles.info
			)}
			style={{ minWidth: '300px', maxWidth: '400px' }}
		>
			{/* Progress bar */}
			{toast.duration && !toast.action && (
				<div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10 dark:bg-white/10">
					<div
						className="h-full bg-current opacity-30 transition-all duration-100 ease-linear"
						style={{ width: `${progress}%` }}
					/>
				</div>
			)}

			<div className="flex items-start gap-3 px-4 py-3">
				<Icon
					className={cn(
						'h-5 w-5 shrink-0 mt-0.5',
						iconStyles[toast.variant] || iconStyles.info,
						toast.variant === 'loading' && 'animate-spin'
					)}
				/>
				<div className="flex-1">
					{toast.title && (
						<div className="font-semibold text-sm mb-1">{toast.title}</div>
					)}
					{toast.description && (
						<div className="text-sm text-muted-foreground">{toast.description}</div>
					)}

					{/* Action button */}
					{toast.action && (
						<div className="mt-2">
							<Button
								variant="outline"
								size="sm"
								onClick={handleAction}
								className="h-7 text-xs"
							>
								{toast.action.label}
							</Button>
						</div>
					)}
				</div>
				{!toast.action && (
					<button
						onClick={onDismiss}
						className="shrink-0 rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
					>
						<X className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
}
