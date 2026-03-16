export {
	buildFileName,
	checkRemoteDiff,
	extractProjectId,
	getRevisionFromFile,
	listRemoteProjects,
} from '@/lib/sync/core/remoteCatalog';

export { dedupeRemoteProjects, diffRemoteLocal } from '@/lib/sync/core/syncPlanner';

export {
	previewPullFromFile,
	previewPushProject,
	pullProject,
	pullProjectAsNew,
	pullProjectFromFile,
	pushProject,
	publishTombstone,
	applyMergedTombstones,
	gcExpiredTombstones,
	deleteRemoteProject,
	deleteLocalProject,
	syncAllProjects,
} from '@/lib/sync/core/syncActions';

export {
	readProviderCatalog,
	writeProviderCatalog,
	mergeProviderCatalogs,
} from '@/lib/sync/core/providerCatalog';
