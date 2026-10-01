// Keep the session locked until cleanup completes, including token exchange.
function createOAuthSession() {
	let active = null;
	return {
		async run(operation) {
			if (active) throw new Error('Authentication already in progress');
			const controller = new AbortController();
			active = controller;
			try {
				const result = await operation(controller.signal);
				controller.signal.throwIfAborted();
				return result;
			} finally { if (active === controller) active = null; }
		},
		cancel() { active?.abort(new Error('Authentication cancelled')); },
	};
}
module.exports = { createOAuthSession };
