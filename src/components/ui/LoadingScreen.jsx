import { useEffect, useState } from 'react';
import { MessageCircle, Sparkles } from 'lucide-react';

const TIPS = [
	'Drag nodes onto the canvas to create dialogue flows',
	'Use Ctrl+Z to undo and Ctrl+Y to redo changes',
	'Connect nodes by dragging from output to input handles',
	'Press Delete or Backspace to remove selected nodes',
	'Save your work with Ctrl+S or the Save button',
	'Use Return nodes to jump back to previous dialogue points',
	'Add decorators to nodes for custom behaviors',
	'Assign participants to lead nodes for multi-character dialogues',
	'Organize dialogues with categories for better project structure',
	'The viewport position and zoom level are saved automatically',
	'Double-click empty space to deselect all nodes',
	'Use the minimap for easier navigation in large dialogues',
];

/**
 * Loading Screen Component
 * Displays a full-screen loading overlay with tips while the app initializes
 */
export function LoadingScreen({ isLoading = true, onLoadingComplete }) {
	const [currentTipIndex, setCurrentTipIndex] = useState(0);
	const [fadeOut, setFadeOut] = useState(false);

	// Rotate tips every 3 seconds
	useEffect(() => {
		if (!isLoading) return;

		const interval = setInterval(() => {
			setCurrentTipIndex((prev) => (prev + 1) % TIPS.length);
		}, 3000);

		return () => clearInterval(interval);
	}, [isLoading]);

	// Handle fade out when loading completes
	useEffect(() => {
		if (!isLoading) {
			setFadeOut(true);
			const timeout = setTimeout(() => {
				onLoadingComplete?.();
			}, 500);
			return () => clearTimeout(timeout);
		}
	}, [isLoading, onLoadingComplete]);

	if (!isLoading && fadeOut) {
		return null;
	}

	return (
		<div
			className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950 transition-opacity duration-500 ${
				fadeOut ? 'opacity-0' : 'opacity-100'
			}`}
		>
			{/* Animated background pattern */}
			<div className="absolute inset-0 opacity-20">
				<div className="absolute inset-0 bg-[radial-gradient(#007AFF_1px,transparent_1px)] [background-size:24px_24px] animate-pulse" />
			</div>

			{/* Content */}
			<div className="relative z-10 flex flex-col items-center max-w-md px-8">
				{/* Logo */}
				<div className="mb-8 flex items-center gap-4">
					<div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center text-white shadow-2xl">
						<MessageCircle className="h-8 w-8" />
					</div>
					<div>
						<h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
							Mountea
						</h1>
						<p className="text-sm text-muted-foreground font-medium">
							Dialoguer
						</p>
					</div>
				</div>

				{/* Loading Animation */}
				<div className="mb-8 relative">
					<div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
					<div className="absolute inset-0 flex items-center justify-center">
						<Sparkles className="h-6 w-6 text-primary animate-pulse" />
					</div>
				</div>

				{/* Loading Text */}
				<p className="text-lg font-medium text-foreground mb-8 animate-pulse">
					Loading your workspace...
				</p>

				{/* Tips Section */}
				<div className="w-full bg-card/80 backdrop-blur-sm border border-border rounded-xl p-6 shadow-lg">
					<div className="flex items-start gap-3">
						<div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0 animate-pulse" />
						<div>
							<p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
								Tip
							</p>
							<p
								key={currentTipIndex}
								className="text-sm text-foreground leading-relaxed animate-fade-in"
							>
								{TIPS[currentTipIndex]}
							</p>
						</div>
					</div>
				</div>

				{/* Progress Indicator */}
				<div className="mt-8 flex gap-1.5">
					{Array.from({ length: 4 }).map((_, i) => (
						<div
							key={i}
							className="w-2 h-2 rounded-full bg-primary/30"
							style={{
								animation: `loading-dot 1.4s ease-in-out ${i * 0.16}s infinite`,
							}}
						/>
					))}
				</div>
			</div>

			{/* CSS animations */}
			<style>{`
				@keyframes loading-dot {
					0%, 80%, 100% {
						opacity: 0.3;
						transform: scale(1);
					}
					40% {
						opacity: 1;
						transform: scale(1.3);
					}
				}

				@keyframes fade-in {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				.animate-fade-in {
					animation: fade-in 0.5s ease-out;
				}
			`}</style>
		</div>
	);
}
