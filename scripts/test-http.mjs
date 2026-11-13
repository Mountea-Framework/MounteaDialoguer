/** Test requests may only reach the server started by the current test. */
export function localTestFetch(base, input, init = {}) {
	const origin = new URL(base);
	const url = new URL(input, origin);
	if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || url.origin !== origin.origin || url.username || url.password) {
		throw new Error('Test request must target its local server');
	}
	return fetch(url, { ...init, redirect: 'error' });
}
