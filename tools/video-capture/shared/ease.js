export const clamp01 = (value) => Math.min(1, Math.max(0, value));

const power = (n) => ({
	out: (t) => 1 - (1 - t) ** n,
	inOut: (t) => (t < 0.5 ? 0.5 * (2 * t) ** n : 1 - 0.5 * (2 * (1 - t)) ** n),
});

const TABLE = {
	none: (t) => t,
	linear: (t) => t,
	'power2.out': power(2).out,
	'power2.inOut': power(2).inOut,
	'power3.out': power(3).out,
	'power3.inOut': power(3).inOut,
	'sine.inOut': (t) => {
		const v = -(Math.cos(Math.PI * t) - 1) / 2;
		return Object.is(v, -0) ? 0 : v;
	},
};

export const EASES = Object.keys(TABLE);

export function ease(name, t) {
	const fn = TABLE[name];
	if (!fn) throw new Error(`Unknown ease "${name}". Known: ${EASES.join(', ')}`);
	return fn(clamp01(t));
}
