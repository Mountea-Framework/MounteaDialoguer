import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
	startGoogleDriveAuth,
	fetchUserInfo,
	getGoogleClientId,
	getStoredClientId,
	setStoredClientId,
	getConfiguredClientId,
} from '@/lib/sync/googleDriveAuth';
import {
	checkRemoteDiff as checkRemoteDiffEngine,
	deleteRemoteProject as deleteRemoteProjectEngine,
	diffRemoteLocal as diffRemoteLocalEngine,
	previewPullFromFile,
	previewPushProject,
	pullProjectFromFile,
	pullProject,
	pushProject as pushProjectToRemote,
	syncAllProjects as syncAllProjectsEngine,
} from '@/lib/sync/syncEngine';
import {
	getSyncAccount,
	upsertSyncAccount,
	clearSyncAccount,
	upsertSyncDeletion,
	listSyncDeletions,
	clearSyncDeletion,
} from '@/lib/sync/syncStorage';
import {
	SYNC_PROVIDER_IDS,
	getSyncProviderConfig,
	normalizeSyncProviderId,
	supportsCloudSync,
} from '@/lib/sync/providers/providerRegistry';
import { buildProfileScopedKey, getActiveProfileId } from '@/lib/profile/activeProfile';

const SYNC_STORAGE_KEY = 'mountea-dialoguer-sync';
const DEFAULT_PROVIDER_INPUT = Object.freeze({
	accountLabel: '',
	passphrase: '',
	rememberPassphrase: true,
});
const DEFAULT_PULL_STATE = Object.freeze({
	active: false,
	step: 'checking',
	progress: 0,
	projectId: null,
	mode: 'project',
	current: 0,
	total: 0,
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pushQueue = new Map();

const NOOP_PROFILE_STORAGE = Object.freeze({
	getItem: () => null,
	setItem: () => {},
	removeItem: () => {},
});

const profileScopedSyncStorage = createJSONStorage(() => {
	if (typeof window === 'undefined' || !window.localStorage) {
		return NOOP_PROFILE_STORAGE;
	}

	return {
		getItem: (name) => {
			const key = buildProfileScopedKey(name);
			return window.localStorage.getItem(key);
		},
		setItem: (name, value) => {
			const key = buildProfileScopedKey(name);
			window.localStorage.setItem(key, value);
		},
		removeItem: (name) => {
			const key = buildProfileScopedKey(name);
			window.localStorage.removeItem(key);
		},
	};
});

function traceSyncEvent(event, details = {}) {
	const eventName = String(event || 'event');
	const safeDetails = details && typeof details === 'object' ? details : {};
	const stampedDetails = {
		...safeDetails,
		atIso: new Date().toISOString(),
		atMs: Date.now(),
	};
	console.log(`[sync] ${eventName}`, stampedDetails);
	if (typeof window === 'undefined') return;
	const electronApi = window.electronAPI;
	if (typeof electronApi?.traceSyncEvent !== 'function') return;
	electronApi.traceSyncEvent({
		event: eventName,
		details: stampedDetails,
	});
}

function normalizeProviderId(value) {
	return normalizeSyncProviderId(value);
}

function createProviderInput(input = {}) {
	return {
		accountLabel: String(input?.accountLabel || ''),
		passphrase: String(input?.passphrase || ''),
		rememberPassphrase:
			input?.rememberPassphrase === undefined ? true : Boolean(input.rememberPassphrase),
	};
}

function createProviderInputs(seed = {}) {
	const inputs = {};
	for (const providerId of SYNC_PROVIDER_IDS) {
		inputs[providerId] = createProviderInput(seed?.[providerId]);
	}
	return inputs;
}

function withProviderInput(state, providerId, patch = {}) {
	const id = normalizeProviderId(providerId);
	if (!id || !SYNC_PROVIDER_IDS.includes(id)) {
		return createProviderInputs(state.providerInputs);
	}

	const currentInputs = createProviderInputs(state.providerInputs);
	currentInputs[id] = {
		...currentInputs[id],
		...patch,
	};
	return currentInputs;
}

function getProviderInputFromState(state, providerId) {
	const id = normalizeProviderId(providerId);
	if (!id) return { ...DEFAULT_PROVIDER_INPUT };
	const value = state?.providerInputs?.[id];
	return createProviderInput(value);
}

function getProviderPassphraseFromState(state, providerId) {
	const input = getProviderInputFromState(state, providerId);
	return String(input.passphrase || '');
}

function resolveSyncPassphrase(state, providerId) {
	const explicitPassphrase = getProviderPassphraseFromState(state, providerId);
	if (explicitPassphrase && explicitPassphrase.trim()) {
		return explicitPassphrase;
	}

	const providerConfig = getSyncProviderConfig(providerId);
	if (providerConfig?.requiresPassphrase === false) {
		const profileId = getActiveProfileId();
		return `auto:${providerId}:${profileId}:v1`;
	}

	return '';
}

function createResetPullState(mode = 'project') {
	return {
		...DEFAULT_PULL_STATE,
		mode,
	};
}

function createPersistedProviderInputs(providerInputs) {
	const normalized = createProviderInputs(providerInputs);
	const persisted = {};
	for (const providerId of SYNC_PROVIDER_IDS) {
		const input = normalized[providerId];
		persisted[providerId] = {
			...input,
			passphrase: input.rememberPassphrase ? input.passphrase : '',
		};
	}
	return persisted;
}

function resolveCloudProviderId(state) {
	const providerId = normalizeProviderId(state?.provider);
	if (!providerId) return '';
	if (!canUseCloudSyncProvider(providerId)) return '';
	return providerId;
}

function canUseCloudSyncProvider(providerId) {
	return Boolean(providerId) && supportsCloudSync(providerId);
}

function canRunSyncForStatus(providerId, status) {
	const normalizedProvider = normalizeProviderId(providerId);
	if (normalizedProvider === 'steam') {
		// Steam provider should remain usable even if Google auth set a global error.
		return status !== 'syncing';
	}
	return status === 'connected';
}

export const useSyncStore = create(
	persist(
		(set, get) => ({
			provider: null,
			status: 'disconnected',
			providerInputs: createProviderInputs(),
			lastSyncedAt: null,
			error: null,
			clientId: getStoredClientId(),
			hideLoginPrompt: false,
			loginDialogOpen: false,
			syncMode: 'pull',
			hasHydrated: false,
			pullState: createResetPullState('project'),

			getProviderInput: (providerId) => {
				return getProviderInputFromState(get(), providerId);
			},
			getProviderPassphrase: (providerId = null) => {
				const currentState = get();
				const activeProvider = providerId || currentState.provider;
				return getProviderPassphraseFromState(currentState, activeProvider);
			},
			setProviderInput: (providerId, patch = {}) => {
				set((state) => ({
					providerInputs: withProviderInput(state, providerId, patch),
				}));
			},
			setProviderPassphrase: (providerId, value) => {
				get().setProviderInput(providerId, { passphrase: String(value || '') });
			},
			setProviderAccountLabel: (providerId, value) => {
				get().setProviderInput(providerId, { accountLabel: String(value || '') });
			},
			setProviderRememberPassphrase: (providerId, value) => {
				get().setProviderInput(providerId, { rememberPassphrase: Boolean(value) });
			},

			// Backward-compatible aliases (Google provider only).
			setPassphrase: (value) => {
				get().setProviderPassphrase('googleDrive', value);
			},
			setAccountLabel: (value) => {
				get().setProviderAccountLabel('googleDrive', value);
			},
			setRememberPassphrase: (value) => {
				get().setProviderRememberPassphrase('googleDrive', value);
			},

			setClientId: (value) => {
				setStoredClientId(value);
				set({ clientId: value });
			},
			clearError: () => set({ error: null }),
			setHasHydrated: () => set({ hasHydrated: true }),
			setHideLoginPrompt: (value) => set({ hideLoginPrompt: value }),
			setLoginDialogOpen: (value) => set({ loginDialogOpen: value }),
			setSyncMode: (value) => set({ syncMode: value }),

			loadAccount: async (options = {}) => {
				const steamStatus = options?.steamStatus || null;
				const preferredProvider = normalizeProviderId(get().provider);
				const steamAvailable = Boolean(steamStatus?.available);
				const steamChannel =
					String(steamStatus?.channel || '').trim().toLowerCase() === 'steam';
				const steamIdentity = String(
					steamStatus?.personaName || steamStatus?.steamId || ''
				);
				const account = await getSyncAccount('googleDrive');
				const shouldPreferSteam =
					steamAvailable && (steamChannel || preferredProvider === 'steam');

				if (shouldPreferSteam) {
					set((state) => ({
						provider: 'steam',
						status: 'connected',
						clientId: getConfiguredClientId(),
						error: null,
						providerInputs: withProviderInput(state, 'steam', {
							accountLabel: steamIdentity,
						}),
					}));
					traceSyncEvent('AUTH_CONNECTED', {
						provider: 'steam',
						account: steamIdentity,
						available: true,
						source: 'auto-load',
					});
					return;
				}

				if (account) {
					set((state) => ({
						provider: 'googleDrive',
						status: 'connected',
						clientId: getConfiguredClientId(),
						providerInputs: withProviderInput(state, 'googleDrive', {
							accountLabel: account.email || account.accountId || '',
						}),
					}));
					return;
				}

				if (steamAvailable) {
					set((state) => ({
						provider: 'steam',
						status: 'connected',
						error: null,
						providerInputs: withProviderInput(state, 'steam', {
							accountLabel: steamIdentity,
						}),
					}));
					return;
				}

				set({ provider: null, status: 'disconnected' });
			},

			connectSteamProvider: async (steamStatus) => {
				const isAvailable = Boolean(steamStatus?.available);
				const identity = String(steamStatus?.personaName || steamStatus?.steamId || '');
				set((state) => ({
					provider: 'steam',
					status: isAvailable ? 'connected' : 'disconnected',
					error: null,
					providerInputs: withProviderInput(state, 'steam', {
						accountLabel: identity,
					}),
				}));
				traceSyncEvent('AUTH_CONNECTED', {
					provider: 'steam',
					account: identity,
					available: isAvailable,
				});
				if (isAvailable) {
					await get().syncAllProjects({
						mode: 'full',
						trigger: 'steam-connect',
					});
				}
				return isAvailable;
			},

			connectGoogleDrive: async () => {
				const stateBeforeAuth = get();
				const passphrase = getProviderPassphraseFromState(get(), 'googleDrive');
				try {
					getGoogleClientId();
				} catch (error) {
					set((state) => ({
						error: 'missingClientId',
						status:
							normalizeProviderId(state.provider) === 'steam'
								? state.status || 'connected'
								: 'error',
					}));
					return false;
				}

				if (!passphrase || !passphrase.trim()) {
					set({ error: 'passphraseRequired' });
					return false;
				}

				set({ status: 'connecting', error: null });
				try {
					traceSyncEvent('AUTH_START', { provider: 'googleDrive' });
					const authResult = await startGoogleDriveAuth();
					const accessToken = authResult.accessToken;
					const expiresIn = Number(authResult.expiresIn || 3600);
					const expiresAt = Date.now() + expiresIn * 1000;

					const userInfo = await fetchUserInfo(accessToken);

					const existing = await getSyncAccount('googleDrive');
					await upsertSyncAccount('googleDrive', {
						accountId: userInfo.sub || userInfo.id || '',
						email: userInfo.email || '',
						accessToken,
						refreshToken: authResult.refreshToken || existing?.refreshToken || '',
						expiresAt,
						scope: authResult.scope,
						tokenType: authResult.tokenType,
					});

					set((state) => ({
						provider: 'googleDrive',
						status: 'connected',
						error: null,
						providerInputs: withProviderInput(state, 'googleDrive', {
							accountLabel: userInfo.email || userInfo.name || '',
						}),
					}));
					traceSyncEvent('AUTH_CONNECTED', {
						provider: 'googleDrive',
						account: userInfo.email || userInfo.name || '',
					});
					return true;
				} catch (error) {
					console.error('Google Drive connect failed:', error);
					const message = (error?.message || '').toLowerCase();
					let errorCode = 'oauthFailed';
					if (message.includes('popup')) errorCode = 'popupBlocked';
					if (message.includes('redirect_uri_mismatch')) errorCode = 'redirectUriMismatch';
					if (message.includes('invalid_grant')) errorCode = 'invalidGrant';
					if (message.includes('missing google client id')) errorCode = 'missingClientId';
					set((state) => {
						const currentProvider = normalizeProviderId(state.provider);
						const shouldPreserveSteamStatus =
							currentProvider === 'steam' ||
							normalizeProviderId(stateBeforeAuth.provider) === 'steam';
						return {
							status: shouldPreserveSteamStatus ? 'connected' : 'error',
							error: errorCode,
						};
					});
					return false;
				}
			},

			disconnect: async () => {
				const providerId = normalizeProviderId(get().provider);
				if (providerId) {
					await clearSyncAccount(providerId);
				}
				set((state) => ({
					provider: null,
					status: 'disconnected',
					lastSyncedAt: null,
					error: null,
					pullState: createResetPullState('project'),
					providerInputs: withProviderInput(state, providerId || 'googleDrive', {
						accountLabel: '',
						passphrase: '',
					}),
				}));
			},

			processPendingDeletions: async (providerId = null) => {
				const state = get();
				const resolvedProviderId = normalizeProviderId(
					providerId || resolveCloudProviderId(state)
				);
				if (!resolvedProviderId || !canUseCloudSyncProvider(resolvedProviderId)) {
					return { processed: 0, pending: 0 };
				}

				const pending = await listSyncDeletions(resolvedProviderId);
				if (!pending.length) {
					return { processed: 0, pending: 0 };
				}

				traceSyncEvent('DELETE_SWEEP_START', {
					provider: resolvedProviderId,
					count: pending.length,
				});

				let processed = 0;
				for (const entry of pending) {
					const projectId = String(entry?.projectId || '').trim();
					if (!projectId) continue;
					try {
						await deleteRemoteProjectEngine({
							projectId,
							provider: resolvedProviderId,
						});
						await clearSyncDeletion(projectId, resolvedProviderId);
						processed += 1;
						traceSyncEvent('DELETE_SWEEP_ITEM_DONE', {
							provider: resolvedProviderId,
							projectId,
						});
					} catch (error) {
						traceSyncEvent('DELETE_SWEEP_ITEM_ERROR', {
							provider: resolvedProviderId,
							projectId,
							message: String(error?.message || error),
						});
					}
				}

				traceSyncEvent('DELETE_SWEEP_DONE', {
					provider: resolvedProviderId,
					processed,
					pending: pending.length - processed,
				});
				return { processed, pending: pending.length - processed };
			},

			scheduleProjectDeletion: async (projectId, options = {}) => {
				const normalizedProjectId = String(projectId || '').trim();
				if (!normalizedProjectId) return;

				const currentState = get();
				const explicitProviders = Array.isArray(options?.providers)
					? options.providers.map((id) => normalizeProviderId(id)).filter(Boolean)
					: [];
				const activeCloudProviderId = resolveCloudProviderId(currentState);
				const providers = Array.from(
					new Set([
						...explicitProviders,
						...(activeCloudProviderId ? [activeCloudProviderId] : []),
					])
				).filter((id) => canUseCloudSyncProvider(id));

				if (!providers.length) {
					traceSyncEvent('DELETE_QUEUE_SKIP', {
						projectId: normalizedProjectId,
						reason: 'no-provider',
					});
					return;
				}

				const deletedAt = new Date().toISOString();
				for (const providerId of providers) {
					await upsertSyncDeletion(normalizedProjectId, providerId, {
						deletedAt,
					});
					traceSyncEvent('DELETE_QUEUED', {
						projectId: normalizedProjectId,
						provider: providerId,
					});
				}

				if (
					activeCloudProviderId &&
					providers.includes(activeCloudProviderId) &&
					canRunSyncForStatus(activeCloudProviderId, currentState.status)
				) {
					await get().syncAllProjects({
						mode: 'full',
						trigger: 'project-delete',
					});
				}
			},

			syncAllProjects: async (options = {}) => {
				const syncStartedAt = Date.now();
				const currentState = get();
				const { status, provider, pullState, syncMode } = currentState;
				const cloudProviderId = resolveCloudProviderId(currentState);
				const passphrase = resolveSyncPassphrase(currentState, provider);
				const providerConfig = getSyncProviderConfig(provider);
				const requiresPassphrase = providerConfig?.requiresPassphrase !== false;
				if (!provider) {
					traceSyncEvent('SKIP', { reason: 'missing-provider' });
					return;
				}
				if (!cloudProviderId) {
					traceSyncEvent('SKIP', {
						reason: 'provider-not-cloud-capable',
						provider,
					});
					return;
				}
				if (status === 'syncing') {
					traceSyncEvent('SKIP', {
						reason: 'already-syncing',
						provider: cloudProviderId,
					});
					return;
				}
				if (!canRunSyncForStatus(cloudProviderId, status)) {
					traceSyncEvent('SKIP', {
						reason: 'provider-not-connected',
						provider: cloudProviderId,
						status,
					});
					return;
				}
				if (requiresPassphrase && (!passphrase || !passphrase.trim())) {
					traceSyncEvent('SKIP', {
						reason: 'missing-passphrase',
						provider: cloudProviderId,
					});
					return;
				}
				if (pullState?.active && pullState?.mode === 'project') {
					traceSyncEvent('SKIP', {
						reason: 'project-pull-active',
						provider: cloudProviderId,
					});
					return;
				}
				const { mode = syncMode || 'full', trigger = 'unknown' } = options;
				traceSyncEvent('START', {
					mode,
					trigger,
					provider: cloudProviderId,
				});

				set({ status: 'syncing' });
				const resetPullState = createResetPullState('bulk');
				let shouldShow = false;
				let total = 0;
				try {
					await get().processPendingDeletions(cloudProviderId);

					if (mode === 'list') {
						console.log('[sync] Listing remote projects (debug)');
						const diff = await diffRemoteLocalEngine({ provider: cloudProviderId });
						console.log('[sync] Remote projects (raw)', diff.remoteRaw);
						const duplicateInfo = Array.from(diff.duplicates.entries()).map(
							([projectId, items]) => ({
								projectId,
								count: items.length,
							})
						);
						if (duplicateInfo.length > 0) {
							console.warn('[sync] Duplicate remote files detected', duplicateInfo);
						}

						console.log('[sync] Remote/local comparison', diff.comparisons);
						console.log('[sync] Actions (would pull/push)', diff.actions);
						const previewPulls = [];
						const previewPushes = [];
						for (const item of diff.comparisons) {
							if (item.decision === 'pull' && item.remote?.fileId) {
								try {
									const preview = await previewPullFromFile({
										projectId: item.projectId,
										fileId: item.remote.fileId,
										revision: item.remote.revision,
										passphrase,
										provider: cloudProviderId,
									});
									previewPulls.push(preview);
								} catch (error) {
									console.error('[sync] Preview pull failed', item.projectId, error);
								}
							}
						}

						for (const projectId of diff.actions.toPush) {
							try {
								const preview = await previewPushProject({ projectId });
								previewPushes.push(preview);
							} catch (error) {
								console.error('[sync] Preview push failed', projectId, error);
							}
						}

						if (previewPulls.length > 0) {
							console.log('[sync] Preview pulled snapshots', previewPulls);
						} else {
							console.log('[sync] No pull previews available');
						}

						if (previewPushes.length > 0) {
							console.log('[sync] Preview push snapshots', previewPushes);
						} else {
							console.log('[sync] No push previews available');
						}
						set({ status: 'connected', pullState: resetPullState });
						return;
					}

					if (mode === 'push') {
						console.log('[sync] Push-only sync start');
						const diffStartedAt = Date.now();
						traceSyncEvent('PUSH_DIFF_START', { provider: cloudProviderId });
						const diff = await diffRemoteLocalEngine({ provider: cloudProviderId });
						traceSyncEvent('PUSH_DIFF_DONE', {
							elapsedMs: Date.now() - diffStartedAt,
							toPull: diff.actions.toPull.length,
							toPush: diff.actions.toPush.length,
							remoteOnly: diff.actions.remoteOnly.length,
							localOnly: diff.actions.localOnly.length,
						});
						console.log('[sync] Remote projects (raw)', diff.remoteRaw);
						const duplicateInfo = Array.from(diff.duplicates.entries()).map(
							([projectId, items]) => ({
								projectId,
								count: items.length,
							})
						);
						if (duplicateInfo.length > 0) {
							console.warn('[sync] Duplicate remote files detected', duplicateInfo);
						}
						if (diff.actions.toPull.length > 0) {
							console.log('[sync] Remote is newer for', diff.actions.toPull);
						}
						if (diff.actions.toPush.length === 0) {
							console.log('[sync] No projects to push');
							traceSyncEvent('NOOP', {
								mode: 'push',
								reason: 'nothing-to-push',
								elapsedMs: Date.now() - syncStartedAt,
							});
							set({ status: 'connected', pullState: resetPullState });
							return;
						}

						for (const projectId of diff.actions.toPush) {
							try {
								console.log('[sync] Pushing project', projectId);
								traceSyncEvent('PUSH_PROJECT_START', { projectId });
								await pushProjectToRemote({
									projectId,
									passphrase,
									provider: cloudProviderId,
								});
								traceSyncEvent('PUSH_PROJECT_DONE', { projectId });
							} catch (error) {
								console.error('[sync] Push failed', projectId, error);
								traceSyncEvent('PUSH_PROJECT_ERROR', {
									projectId,
									message: String(error?.message || error),
								});
							}
						}
						console.log('[sync] Push-only sync complete');
						traceSyncEvent('COMPLETE', {
							mode: 'push',
							elapsedMs: Date.now() - syncStartedAt,
						});
						set({
							status: 'connected',
							lastSyncedAt: new Date().toISOString(),
							pullState: resetPullState,
						});
						return;
					}

					if (mode === 'pull') {
						console.log('[sync] Pull-only sync start');
						const diffStartedAt = Date.now();
						traceSyncEvent('PULL_DIFF_START', { provider: cloudProviderId });
						const diff = await diffRemoteLocalEngine({ provider: cloudProviderId });
						traceSyncEvent('PULL_DIFF_DONE', {
							elapsedMs: Date.now() - diffStartedAt,
							toPull: diff.actions.toPull.length,
							toPush: diff.actions.toPush.length,
							remoteOnly: diff.actions.remoteOnly.length,
							localOnly: diff.actions.localOnly.length,
						});
						const duplicateInfo = Array.from(diff.duplicates.entries()).map(
							([projectId, items]) => ({
								projectId,
								count: items.length,
							})
						);
						if (duplicateInfo.length > 0) {
							console.warn('[sync] Duplicate remote files detected', duplicateInfo);
						}

						if (diff.actions.toPull.length === 0) {
							console.log('[sync] No projects to pull');
							traceSyncEvent('NOOP', {
								mode: 'pull',
								reason: 'nothing-to-pull',
								elapsedMs: Date.now() - syncStartedAt,
							});
							set({ status: 'connected', pullState: resetPullState });
							return;
						}

						const comparisonMap = new Map(
							diff.comparisons.map((item) => [item.projectId, item])
						);
						const startedAt = Date.now();
						const total = diff.actions.toPull.length;
						let index = 0;

						set({
							pullState: {
								active: true,
								step: 'checking',
								progress: 10,
								projectId: null,
								mode: 'bulk',
								current: 0,
								total,
							},
						});

						for (const projectId of diff.actions.toPull) {
							index += 1;
							const comparison = comparisonMap.get(projectId);
							const remote = comparison?.remote;
							const pullProjectStartedAt = Date.now();
							traceSyncEvent('PULL_PROJECT_START', {
								projectId,
								index,
								total,
							});

							set({
								pullState: {
									active: true,
									step: 'downloading',
									progress: Math.min(95, Math.round((index / total) * 90)),
									projectId,
									mode: 'bulk',
									current: index,
									total,
								},
							});

							if (!remote?.fileId) {
								console.warn('[sync] Missing remote file for pull', projectId);
								continue;
							}

							try {
								const result = await pullProjectFromFile({
									projectId,
									fileId: remote.fileId,
									revision: remote.revision,
									passphrase,
									provider: cloudProviderId,
								});
								console.log('[sync] Pulled project', result);
								traceSyncEvent('PULL_PROJECT_DONE', {
									projectId,
									index,
									total,
									elapsedMs: Date.now() - pullProjectStartedAt,
								});
							} catch (error) {
								console.error('[sync] Pull failed', projectId, error);
								traceSyncEvent('PULL_PROJECT_ERROR', {
									projectId,
									index,
									total,
									elapsedMs: Date.now() - pullProjectStartedAt,
									message: String(error?.message || error),
								});
							}
						}

						const elapsed = Date.now() - startedAt;
						if (elapsed < 2000) {
							await delay(2000 - elapsed);
						}

						set({
							status: 'connected',
							lastSyncedAt: new Date().toISOString(),
							pullState: resetPullState,
						});
						console.log('[sync] Pull-only sync complete');
						traceSyncEvent('COMPLETE', {
							mode: 'pull',
							elapsedMs: Date.now() - syncStartedAt,
						});
						return;
					}

					traceSyncEvent('FULL_SYNC_ENGINE_START', { provider: cloudProviderId });
					await syncAllProjectsEngine({
						passphrase,
						provider: cloudProviderId,
						onProgress: (info) => {
							if (info?.phase === 'start') {
								total = info.total || 0;
								traceSyncEvent('FULL_SYNC_ENGINE_PROGRESS', {
									phase: 'start',
									total: info.total || 0,
									remoteCount: info.remoteCount || 0,
									localCount: info.localCount || 0,
								});
								if (info.remoteCount > 0) {
									shouldShow = true;
									set({
										pullState: {
											active: true,
											step: 'checking',
											progress: 5,
											projectId: null,
											mode: 'bulk',
											current: 0,
											total,
										},
									});
								}
								return;
							}

							if (!shouldShow || !total) return;
							const progress = Math.min(100, Math.round((info.index / total) * 100));
							traceSyncEvent('FULL_SYNC_ENGINE_PROGRESS', {
								phase: info.phase || 'sync',
								index: info.index || 0,
								total,
								projectId: info.projectId || null,
								progress,
							});
							set({
								pullState: {
									active: true,
									step: info.phase === 'pull' ? 'downloading' : 'applying',
									progress,
									projectId: info.projectId || null,
									mode: 'bulk',
									current: info.index || 0,
									total,
								},
							});
						},
					});
					traceSyncEvent('FULL_SYNC_ENGINE_DONE', {
						elapsedMs: Date.now() - syncStartedAt,
					});
					set({ status: 'connected', lastSyncedAt: new Date().toISOString() });
					set({ pullState: resetPullState });
					traceSyncEvent('COMPLETE', {
						mode,
						elapsedMs: Date.now() - syncStartedAt,
					});
				} catch (error) {
					console.error('Sync all failed:', error);
					traceSyncEvent('ERROR', {
						mode,
						elapsedMs: Date.now() - syncStartedAt,
						message: String(error?.message || error),
					});
					const message = (error?.message || '').toLowerCase();
					if (message.includes('tokenexpired')) {
						set({ status: 'error', error: 'tokenExpired' });
					} else {
						set({ status: 'error', error: 'syncFailed' });
					}
					set({ pullState: resetPullState });
				}
			},

			schedulePush: (projectId) => {
				const state = get();
				const { status, provider, syncMode } = state;
				const cloudProviderId = resolveCloudProviderId(state);
				if (!provider) return;
				if (!canRunSyncForStatus(cloudProviderId, status)) return;
				if (!cloudProviderId) return;
				if (!projectId) return;
				if (syncMode === 'list') {
					console.log('[sync] Skip auto-push (list mode)');
					return;
				}

				const existing = pushQueue.get(projectId);
				if (existing) {
					clearTimeout(existing);
				}

				const timer = setTimeout(() => {
					console.log('[sync] Auto-push project', projectId);
					pushQueue.delete(projectId);
					get().pushProject(projectId);
				}, 1500);
				pushQueue.set(projectId, timer);
			},

			checkRemoteDiff: async (projectId) => {
				const currentState = get();
				const { status, provider } = currentState;
				const cloudProviderId = resolveCloudProviderId(currentState);
				if (status !== 'connected' || !provider) return false;
				if (!cloudProviderId) return false;

				try {
					return await checkRemoteDiffEngine(projectId, { provider: cloudProviderId });
				} catch (error) {
					console.error('Remote diff check failed:', error);
					const message = (error?.message || '').toLowerCase();
					if (message.includes('tokenexpired')) {
						set({ status: 'error', error: 'tokenExpired' });
					} else {
						set({ error: 'syncFailed' });
					}
					return false;
				}
			},

			startPull: async (projectId, options = {}) => {
				const { simulate = false } = options;
				const currentState = get();
				const { syncMode, provider } = currentState;
				const cloudProviderId = resolveCloudProviderId(currentState);
				const passphrase = resolveSyncPassphrase(currentState, provider);
				const providerConfig = getSyncProviderConfig(provider);
				const requiresPassphrase = providerConfig?.requiresPassphrase !== false;
				if (syncMode !== 'full') {
					console.log('[sync] Skip pull (non-full mode)');
					return;
				}
				if (!cloudProviderId) return;
				if (requiresPassphrase && (!passphrase || !passphrase.trim())) {
					set({ error: 'passphraseRequired', status: 'error' });
					return;
				}

				set({
					status: 'syncing',
					error: null,
					pullState: {
						active: true,
						step: 'checking',
						progress: 10,
						projectId,
						mode: 'project',
						current: 0,
						total: 0,
					},
				});

				let didError = false;

				if (simulate) {
					const steps = [
						{ step: 'checking', progress: 20 },
						{ step: 'downloading', progress: 45 },
						{ step: 'decrypting', progress: 70 },
						{ step: 'applying', progress: 95 },
					];

					for (const item of steps) {
						await delay(450);
						set({
							pullState: {
								active: true,
								step: item.step,
								progress: item.progress,
								projectId,
							},
						});
					}

					await delay(300);
				}

				try {
					await pullProject({
						projectId,
						passphrase,
						provider: cloudProviderId,
						onProgress: (step, progress) =>
							set({
								pullState: {
									active: true,
									step,
									progress,
									projectId,
									mode: 'project',
									current: 0,
									total: 0,
								},
							}),
					});
				} catch (error) {
					console.error('Pull failed:', error);
					didError = true;
					const message = (error?.message || '').toLowerCase();
					if (message.includes('tokenexpired')) {
						set({ status: 'error', error: 'tokenExpired' });
					} else {
						set({ status: 'error', error: 'syncFailed' });
					}
				}

				if (!didError) {
					set({
						status: 'connected',
						lastSyncedAt: new Date().toISOString(),
						pullState: createResetPullState('project'),
					});
				} else {
					set({
						pullState: createResetPullState('project'),
					});
				}
			},

			pushProject: async (projectId) => {
				const currentState = get();
				const { syncMode, provider } = currentState;
				const cloudProviderId = resolveCloudProviderId(currentState);
				const passphrase = resolveSyncPassphrase(currentState, provider);
				const providerConfig = getSyncProviderConfig(provider);
				const requiresPassphrase = providerConfig?.requiresPassphrase !== false;
				if (syncMode === 'list') {
					console.log('[sync] Skip push (list mode)');
					return;
				}
				if (!cloudProviderId) return;
				if (requiresPassphrase && (!passphrase || !passphrase.trim())) {
					set({ error: 'passphraseRequired' });
					return;
				}
				try {
					await pushProjectToRemote({ projectId, passphrase, provider: cloudProviderId });
				} catch (error) {
					console.error('Push failed:', error);
					set({ error: 'syncFailed' });
				}
			},
		}),
		{
			name: SYNC_STORAGE_KEY,
			storage: profileScopedSyncStorage,
			partialize: (state) => ({
				provider: state.provider,
				providerInputs: createPersistedProviderInputs(state.providerInputs),
				lastSyncedAt: state.lastSyncedAt,
				clientId: state.clientId,
				hideLoginPrompt: state.hideLoginPrompt,
			}),
			onRehydrateStorage: () => (state) => {
				if (!state) return;

				const legacyRemember =
					state.rememberPassphrase === undefined
						? true
						: Boolean(state.rememberPassphrase);
				const legacyGoogleInput = {
					accountLabel: String(state.accountLabel || ''),
					passphrase: legacyRemember ? String(state.passphrase || '') : '',
					rememberPassphrase: legacyRemember,
				};

				const rememberedGooglePassphrase =
					state?.providerInputs?.googleDrive?.rememberPassphrase;
				const existingProviderInputs = createProviderInputs(state.providerInputs);
				state.providerInputs = createProviderInputs({
					...existingProviderInputs,
					googleDrive: {
						...existingProviderInputs.googleDrive,
						accountLabel:
							existingProviderInputs.googleDrive.accountLabel ||
							legacyGoogleInput.accountLabel,
						passphrase:
							existingProviderInputs.googleDrive.passphrase ||
							legacyGoogleInput.passphrase,
						rememberPassphrase:
							rememberedGooglePassphrase === undefined
								? legacyGoogleInput.rememberPassphrase
								: Boolean(rememberedGooglePassphrase),
					},
				});

				state.status = state.provider ? 'connected' : 'disconnected';
				state.pullState = createResetPullState('project');
				state.clientId = getStoredClientId();
				state.hasHydrated = true;
				if (state.hideLoginPrompt === undefined) {
					state.hideLoginPrompt = false;
				}
			},
		}
	)
);
