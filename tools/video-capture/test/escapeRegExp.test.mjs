import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeRegExp } from '../shared/escapeRegExp.js';

test('escapeRegExp matches special characters literally', () => {
	const name = 'Buy (2) items? [now] a+b.c*d|e^f$g{1}\\';
	assert.ok(new RegExp(escapeRegExp(name), 'i').test(`Click: ${name}`));
	assert.ok(!new RegExp(escapeRegExp('a.c'), 'i').test('abc'));
});

test('escapeRegExp keeps plain names case-insensitive', () => {
	assert.ok(new RegExp(escapeRegExp('Stop'), 'i').test('STOP'));
});
