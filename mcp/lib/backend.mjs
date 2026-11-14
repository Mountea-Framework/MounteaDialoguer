// The project store the tools read and write. The hosted server installs the revision-file store (store.mjs,
// fileBackend); the desktop app installs its IndexedDB repository (src/lib/automation/dexieBackend.js). Contract:
//   listAllProjects()                    -> [{ id, name, modifiedAt, conflict? }] sorted by name
//   loadSnapshot(projectId)              -> canonical project snapshot (throws ToolError NOT_FOUND)
//   mutateProject(projectId, fn, { operation: 'update' | 'delete' })
//                                        -> fn's result; fn mutates a canonical snapshot copy in place
//   createProject(snapshot)              -> writes a brand new project
let backend = null;

export function setBackend(impl) { backend = impl; }

function current() {
	if (!backend) throw new Error('No project backend installed');
	return backend;
}

export const listAllProjects = () => current().listAllProjects();
export const loadSnapshot = (projectId) => current().loadSnapshot(projectId);
export const mutateProject = (projectId, fn, options) => current().mutateProject(projectId, fn, options);
export const createProject = (snapshot) => current().createProject(snapshot);
