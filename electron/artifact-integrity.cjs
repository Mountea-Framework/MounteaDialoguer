const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

// Electron's patched fs also reads files inside app.asar. Include the validation
// records themselves so the installed renderer must match every validated byte.
function fingerprintDirectory(directory) {
	const files = {};
	function visit(root, prefix = '') {
		for (const entry of fs.readdirSync(root, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
			const name = prefix + entry.name, location = path.join(root, entry.name);
			if (entry.isSymbolicLink()) throw new Error(`Packaged renderer contains a symbolic link: ${name}`);
			if (entry.isDirectory()) visit(location, `${name}/`);
			else if (entry.isFile()) files[name] = createHash('sha256').update(fs.readFileSync(location)).digest('hex');
			else throw new Error(`Unsupported renderer entry: ${name}`);
		}
	}
	visit(directory);
	return files;
}
module.exports = { fingerprintDirectory };
