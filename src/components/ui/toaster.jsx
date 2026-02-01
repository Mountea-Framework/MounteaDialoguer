import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Toast hook for use in React components
export function useToast() {
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
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

	return (
		<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
			{toasts.map((toast) => (
				<Toast key={toast.id} toast={toast} onDismiss={() => dismiss(toast.id)} />
			))}
		</div>
	);
}

// Individual toast component
function Toast({ toast, onDismiss }) {
	useEffect(() => {
		if (toast.duration) {
			const timer = setTimeout(onDismiss, toast.duration);
			return () => clearTimeout(timer);
		}
	}, [toast.duration, onDismiss]);

	const icons = {
		success: CheckCircle2,
		error: AlertCircle,
		warning: AlertTriangle,
		info: Info,
	};

	const Icon = icons[toast.variant] || Info;

	const variantStyles = {
		success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
		error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
		warning:
			'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
		info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
	};

	const iconStyles = {
		success: 'text-green-600 dark:text-green-400',
		error: 'text-red-600 dark:text-red-400',
		warning: 'text-orange-600 dark:text-orange-400',
		info: 'text-blue-600 dark:text-blue-400',
	};

	return (
		<div
			className={cn(
				'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all animate-in slide-in-from-right',
				variantStyles[toast.variant] || variantStyles.info
			)}
			style={{ minWidth: '300px', maxWidth: '400px' }}
		>
			<Icon
				className={cn(
					'h-5 w-5 shrink-0 mt-0.5',
					iconStyles[toast.variant] || iconStyles.info
				)}
			/>
			<div className="flex-1">
				{toast.title && (
					<div className="font-semibold text-sm mb-1">{toast.title}</div>
				)}
				{toast.description && (
					<div className="text-sm text-muted-foreground">{toast.description}</div>
				)}
			</div>
			<button
				onClick={onDismiss}
				className="shrink-0 rounded-full p-1 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
