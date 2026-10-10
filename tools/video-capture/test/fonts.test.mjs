import test from 'node:test';
import assert from 'node:assert/strict';
import { missingFontFaces } from '../shared/fonts.js';

test('missingFontFaces names every required face that is not loaded', () => {
	const faces = [
		{ family: '"Inter"', weight: '400', status: 'loaded' },
		{ family: 'Inter', weight: '600', status: 'error' },
	];
	assert.deepEqual(missingFontFaces(faces), ['600', '700']);
	assert.deepEqual(missingFontFaces([...faces.slice(0, 1), { family: 'Inter', weight: '600', status: 'loaded' }, { family: 'Inter', weight: '700', status: 'loaded' }]), []);
});
