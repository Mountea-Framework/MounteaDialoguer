/** Deterministic shared remote backend. Separate clients see one remote store.
 * Explicit gates avoid timing sleeps. A fault after a write models a lost reply. */
export function createProviderBackend() {
	const files = new Map();
	const calls = [];
	let serial = 0;
	return {
		files, calls,
		createClient(clientId) {
			const faults = [];
			const gates = [];
			let duplicates = false;
			const invoke = async (method, args, operation) => {
				calls.push({ clientId, method, args: structuredClone(args) });
				const gateIndex = gates.findIndex((gate) => gate.method === method);
				if (gateIndex !== -1) await gates.splice(gateIndex, 1)[0].promise;
				const faultIndex = faults.findIndex((fault) => fault.method === method);
				const fault = faultIndex === -1 ? null : faults.splice(faultIndex, 1)[0];
				if (fault && !fault.afterCommit) throw fault.error;
				const result = operation();
				if (fault) throw fault.error;
				return structuredClone(result);
			};
			return {
				id: 'fake', supportsCloudSync: true,
				failNext(method, { afterCommit = false, message = 'Injected provider failure' } = {}) { faults.push({ method, afterCommit, error: new Error(message) }); },
				holdNext(method) {
					let release;
					const promise = new Promise((resolve) => { release = resolve; });
					gates.push({ method, promise });
					return release;
				},
				duplicateListings(value = true) { duplicates = value; },
				findFileByName: (name) => invoke('findFileByName', name, () => [...files.values()].find((file) => file.name === name) || null),
				listFiles: (options = {}) => invoke('listFiles', options, () => {
					const matches = [...files.values()].filter((file) => file.name.startsWith(options.namePrefix || ''));
					return duplicates ? [...matches, ...matches] : matches;
				}),
				downloadFile: (id) => invoke('downloadFile', id, () => {
					if (!files.has(id)) throw new Error('File not found');
					return files.get(id).content;
				}),
				createFile: (payload) => invoke('createFile', payload, () => {
					const id = `remote-${++serial}`;
					const file = { ...structuredClone(payload), id, modifiedTime: new Date(serial * 1000).toISOString() };
					files.set(id, file);
					return file;
				}),
				updateFile: (payload) => invoke('updateFile', payload, () => {
					const id = payload.fileId || payload.id;
					if (!files.has(id)) throw new Error('File not found');
					const file = { ...files.get(id), ...structuredClone(payload), id };
					files.set(id, file);
					return file;
				}),
				deleteFile: (id) => invoke('deleteFile', id, () => files.delete(id)),
			};
		},
	};
}
