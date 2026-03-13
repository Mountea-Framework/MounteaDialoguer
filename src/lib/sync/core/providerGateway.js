import { DEFAULT_SYNC_PROVIDER_ID } from '@/lib/sync/providers/providerRegistry';
import {
	assertCloudSyncStorageProvider,
	resolveSyncProviderId,
} from '@/lib/sync/providers/storageProviders';

export function getSyncContext(options = {}) {
	const providerId = resolveSyncProviderId(options?.provider || DEFAULT_SYNC_PROVIDER_ID);
	const storage = assertCloudSyncStorageProvider(providerId);
	return { providerId, storage };
}
