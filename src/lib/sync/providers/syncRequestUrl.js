/** Resolve only supported API routes within the app's own deployment base. */
export function syncRequestUrl(appBase, location, service, route) {
	const invalid = () => { throw Object.assign(new Error('Invalid sync path'), { code: 'INVALID_PATH' }); };
	if (typeof route !== 'string') invalid();
	if (service === 'auth') {
		if (!['/status', '/setup', '/login', '/logout'].includes(route)) invalid();
	} else if (service === 'sync') {
		if (!/^\/files(?:\?[^#\\]*|\/[^/?#\\]+)?$/.test(route)) invalid();
	} else invalid();
	const page = new URL(location);
	const base = new URL(appBase, page);
	if (base.origin !== page.origin || base.username || base.password || base.search || base.hash) invalid();
	const api = new URL(`api/${service}/`, base);
	const url = new URL(`.${route}`, api);
	if (url.origin !== page.origin || url.pathname !== `${api.pathname}${route.split('?')[0].slice(1)}` || url.hash) invalid();
	return url;
}
