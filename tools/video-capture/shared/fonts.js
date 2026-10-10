/** Inter weights the sandbox bundles (see sandbox/capture.css and README "Fonts"). */
export const REQUIRED_FONT_WEIGHTS = ['400', '600', '700'];

/** Names the required faces that are not loaded. `faces` is [{ family, weight, status }] from document.fonts. */
export function missingFontFaces(faces, required = REQUIRED_FONT_WEIGHTS, family = 'Inter') {
	return required.filter((weight) => !faces.some((f) => String(f.family).replace(/["']/g, '') === family && String(f.weight) === weight && f.status === 'loaded'));
}
