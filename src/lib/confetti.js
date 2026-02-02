import confetti from 'canvas-confetti';

/**
 * Confetti utility for celebrations
 * Provides preset confetti animations for different achievement types
 */

/**
 * Basic confetti burst
 * @param {Object} options - Custom confetti options
 */
export const celebrate = (options = {}) => {
	confetti({
		particleCount: 100,
		spread: 70,
		origin: { y: 0.6 },
		...options,
	});
};

/**
 * Confetti for creating first dialogue
 */
export const celebrateFirstDialogue = () => {
	const duration = 3 * 1000;
	const animationEnd = Date.now() + duration;
	const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

	function randomInRange(min, max) {
		return Math.random() * (max - min) + min;
	}

	const interval = setInterval(function () {
		const timeLeft = animationEnd - Date.now();

		if (timeLeft <= 0) {
			return clearInterval(interval);
		}

		const particleCount = 50 * (timeLeft / duration);

		confetti({
			...defaults,
			particleCount,
			origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
		});
		confetti({
			...defaults,
			particleCount,
			origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
		});
	}, 250);
};

/**
 * Confetti for saving/exporting
 */
export const celebrateSuccess = () => {
	confetti({
		particleCount: 50,
		angle: 60,
		spread: 55,
		origin: { x: 0 },
		colors: ['#10b981', '#22c55e', '#86efac'],
	});

	confetti({
		particleCount: 50,
		angle: 120,
		spread: 55,
		origin: { x: 1 },
		colors: ['#10b981', '#22c55e', '#86efac'],
	});
};

/**
 * Confetti cannon from bottom
 */
export const celebrateMilestone = () => {
	const count = 200;
	const defaults = {
		origin: { y: 0.7 },
	};

	function fire(particleRatio, opts) {
		confetti({
			...defaults,
			...opts,
			particleCount: Math.floor(count * particleRatio),
		});
	}

	fire(0.25, {
		spread: 26,
		startVelocity: 55,
	});

	fire(0.2, {
		spread: 60,
	});

	fire(0.35, {
		spread: 100,
		decay: 0.91,
		scalar: 0.8,
	});

	fire(0.1, {
		spread: 120,
		startVelocity: 25,
		decay: 0.92,
		scalar: 1.2,
	});

	fire(0.1, {
		spread: 120,
		startVelocity: 45,
	});
};

/**
 * Fireworks effect for special achievements
 */
export const celebrateFireworks = () => {
	const duration = 5 * 1000;
	const animationEnd = Date.now() + duration;
	const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

	function randomInRange(min, max) {
		return Math.random() * (max - min) + min;
	}

	const interval = setInterval(function () {
		const timeLeft = animationEnd - Date.now();

		if (timeLeft <= 0) {
			return clearInterval(interval);
		}

		const particleCount = 50 * (timeLeft / duration);

		confetti({
			...defaults,
			particleCount,
			origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
			colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981'],
		});
	}, 250);
};

/**
 * Gentle sparkle effect for small wins
 */
export const celebrateSmallWin = () => {
	confetti({
		particleCount: 30,
		spread: 40,
		origin: { y: 0.5 },
		scalar: 0.8,
		gravity: 1.2,
		colors: ['#fbbf24', '#f59e0b', '#fb923c'],
	});
};
