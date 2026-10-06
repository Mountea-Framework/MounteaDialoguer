import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

export const NATIVE_TEST_VIEWPORT = { width: 1280, height: 900 };

// macOS exposes /var through /private/var; lexical equality rejects the same
// isolated directory. Resolve both, while still rejecting any other profile.
export async function assertSameProfileDirectory(actual, expected) {
	assert.equal(await fs.realpath(actual), await fs.realpath(expected), 'Native validation must use the disposable profile directory');
}
