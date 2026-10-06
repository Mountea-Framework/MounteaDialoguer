import { create } from 'zustand';
import { getRepositoryContext } from '@/lib/db';
import { credentialCapabilities, readSecret, writeSecret } from '@/lib/sync/credentialStore';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
	startGoogleDriveAuth,
	fetchUserInfo,
	getGoogleClientId,
	getStoredClientId,
	setStoredClientId,
	getConfiguredClientId,
} from '@/lib/sync/googleDriveAuth';
import { syncRevisions, resolveRevisionConflict } from '@/lib/sync/core/revisionProtocol';
import {
	getSyncAccount,
	upsertSyncAccount,
	clearSyncAccount,
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
	rememberPassphrase: false,
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

const pushQueue = new Map();

// One mounted worker retries durable intent. A busy/offline interval never queues
// another run, and reconnect bursts share the same minimum retry interval.
export function startSyncRetryWorker({ eventTarget = window, intervalMs = 30000, syncOptions = {} } = {}) {
	let stopped = false, inFlight = false, lastAttempt = -Infinity;
	const tick = async () => {
		const state = useSyncStore.getState();
		if (stopped || inFlight || navigator.onLine === false || !['connected', 'error'].includes(state.status) || state.syncMode === 'list' || Date.now() - lastAttempt < intervalMs) return;
		lastAttempt = Date.now(); inFlight = true;
		try { await state.syncAllProjects({ ...syncOptions, mode: state.syncMode, trigger: 'durable-retry' }); }
		finally { inFlight = false; }
	};
	const timer = setInterval(() => { void tick(); }, intervalMs);
	eventTarget.addEventListener('online', tick);
	return () => { stopped = true; clearInterval(timer); eventTarget.removeEventListener('online', tick); };
}

const STEAM_CONNECT_SYNC_COOLDOWN_MS = 5000;
let steamConnectSyncInFlight = false;
let lastSteamConnectSyncAt = 0;
let activeAuthController = null;

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
			input?.rememberPassphrase === undefined ? false : Boolean(input.rememberPassphrase),
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
			passphrase: '',
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
			canRememberCredentials: false,
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
			cancelAuthentication: () => activeAuthController?.abort(),
			setLoginDialogOpen: (value) => { if (!value) activeAuthController?.abort(); set({ loginDialogOpen: value }); },
			setSyncMode: (value) => set({ syncMode: value }),

			loadAccount: async (options = {}) => {
				const context = options.context || await getRepositoryContext();
				const capability = await credentialCapabilities();
				context.assertCurrent();
				const legacyPassphrase = getProviderPassphraseFromState(get(), 'googleDrive');
				if (legacyPassphrase && capability.canRemember && getProviderInputFromState(get(), 'googleDrive').rememberPassphrase) {
					await writeSecret('googleDrive-passphrase', legacyPassphrase, { remember: true, context });
				}
				const savedPassphrase = await readSecret('googleDrive-passphrase', context);
				context.assertCurrent();
				set((state) => ({ canRememberCredentials: capability.canRemember, providerInputs: withProviderInput(state, 'googleDrive', { passphrase: savedPassphrase || legacyPassphrase, rememberPassphrase: capability.canRemember && getProviderInputFromState(state, 'googleDrive').rememberPassphrase }) }));
				const steamStatus = options?.steamStatus || null;
				const preferredProvider = normalizeProviderId(get().provider);
				const steamAvailable = Boolean(steamStatus?.available);
				const steamChannel =
					String(steamStatus?.channel || '').trim().toLowerCase() === 'steam';
				const steamIdentity = String(
					steamStatus?.personaName || steamStatus?.steamId || ''
				);
				const account = await getSyncAccount('googleDrive', context);
				context.assertCurrent();
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
				const currentState = get();
				const alreadyConnected =
					currentState.provider === 'steam' &&
					(currentState.status === 'connected' || currentState.status === 'syncing');

				if (alreadyConnected && isAvailable) {
					if (identity) {
						set((state) => ({
							providerInputs: withProviderInput(state, 'steam', {
								accountLabel: identity,
							}),
						}));
					}
					return true;
				}

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
				if (isAvailable && !alreadyConnected) {
					const nowMs = Date.now();
					if (steamConnectSyncInFlight) {
						traceSyncEvent('SKIP', {
							reason: 'steam-connect-sync-in-flight',
							provider: 'steam',
						});
					} else if (nowMs - lastSteamConnectSyncAt < STEAM_CONNECT_SYNC_COOLDOWN_MS) {
						traceSyncEvent('SKIP', {
							reason: 'steam-connect-sync-cooldown',
							provider: 'steam',
							cooldownMs: STEAM_CONNECT_SYNC_COOLDOWN_MS,
						});
					} else {
						steamConnectSyncInFlight = true;
						lastSteamConnectSyncAt = nowMs;
						try {
							await get().syncAllProjects({
								mode: 'full',
								trigger: 'steam-connect',
							});
						} finally {
							steamConnectSyncInFlight = false;
						}
					}
				}
				return isAvailable;
			},

			connectGoogleDrive: async () => {
				const context = await getRepositoryContext();
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

				activeAuthController?.abort();
				const controller = new AbortController();
				activeAuthController = controller;
				const abortForProfile = () => controller.abort();
				context.signal.addEventListener('abort', abortForProfile, { once: true });
				set({ status: 'connecting', error: null });
				try {
					traceSyncEvent('AUTH_START', { provider: 'googleDrive' });
					const authResult = await startGoogleDriveAuth({ signal: controller.signal });
					context.assertCurrent();
					const accessToken = authResult.accessToken;
					const expiresIn = Number(authResult.expiresIn || 3600);
					const expiresAt = Date.now() + expiresIn * 1000;

					const userInfo = await fetchUserInfo(accessToken);
					context.assertCurrent();
					if (controller.signal.aborted) throw new DOMException('Authentication cancelled', 'AbortError');

					const existing = await getSyncAccount('googleDrive', context);
					await upsertSyncAccount('googleDrive', {
						accountId: userInfo.sub || userInfo.id || '',
						email: userInfo.email || '',
						accessToken,
						refreshToken: authResult.refreshToken || existing?.refreshToken || '',
						expiresAt,
						scope: authResult.scope,
						tokenType: authResult.tokenType,
					}, context);
					await writeSecret('googleDrive-passphrase', passphrase, { remember: get().canRememberCredentials && getProviderInputFromState(get(), 'googleDrive').rememberPassphrase, context });
					context.assertCurrent();

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
					if (context.signal.aborted) return false;
					if (controller.signal.aborted) { set({ status: stateBeforeAuth.status, error: null }); return false; }
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
				} finally {
					context.signal.removeEventListener('abort', abortForProfile);
					if (activeAuthController === controller) activeAuthController = null;
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

            // Deletion intent is committed with authoring data by the repository.
            // These compatibility hooks only wake the durable revision worker.
            processPendingTombstones: async () => get().syncAllProjects({ mode: 'push' }),
            scheduleProjectDeletion: (projectId) => get().schedulePush(projectId),
            scheduleDialogueDeletion: (_dialogueId, projectId) => get().schedulePush(projectId),

            conflicts: [],
            syncResults: null,
            queueState: null,
            refreshConflicts: async () => {
                const context = await getRepositoryContext();
                const conflicts = await context.db.syncConflicts.where('status').equals('unresolved').toArray();
                context.assertCurrent(); set({ conflicts }); return conflicts;
            },
            resolveConflict: async (id, choice, revisionId) => {
                const context = await getRepositoryContext();
                const result = await resolveRevisionConflict(id, choice, { context, revisionId });
                context.assertCurrent(); await get().refreshConflicts();
                get().schedulePush(result.projectId);
                if (result.copiedProjectId) get().schedulePush(result.copiedProjectId);
                return result;
            },
            syncAllProjects: async (options = {}) => {
                const state = get(), provider = resolveCloudProviderId(state);
                const mode = options.mode || state.syncMode || 'full';
                if (!provider || !['connected', 'syncing', 'error'].includes(state.status)) return;
                const passphrase = resolveSyncPassphrase(state, provider);
                if (getSyncProviderConfig(provider)?.requiresPassphrase !== false && !passphrase?.trim()) {
                    set({ error: 'passphraseRequired' }); return;
                }
                const context = await getRepositoryContext();
                set({ status: 'syncing', error: null });
                try {
                    const result = await syncRevisions({ ...options, provider, passphrase, context, mode });
                    context.assertCurrent();
                    set({ status: 'connected', error: result.failures.length ? 'syncFailed' : null, syncResults: result, queueState: result.queue,
                        ...(mode !== 'list' && !result.failures.length ? { lastSyncedAt: new Date().toISOString() } : {}), pullState: createResetPullState() });
                    await get().refreshConflicts();
                    traceSyncEvent('COMPLETE', { provider, mode, failures: result.failures.length, conflicts: result.conflicts.length, queue: result.queue });
                    return result;
                } catch (failure) {
                    if (!context.signal.aborted) set({ status: 'error', error: 'syncFailed', pullState: createResetPullState() });
                    traceSyncEvent('FAILED', { provider, mode, code: failure.code || 'SYNC_FAILED' });
                    return { failures: [{ code: failure.code || 'SYNC_FAILED', message: failure.message }] };
                }
            },
            schedulePush: (projectId) => {
                if (!projectId) return;
                const profileId = getActiveProfileId(), key = `${profileId}:${projectId}`;
                clearTimeout(pushQueue.get(key));
                pushQueue.set(key, setTimeout(() => {
                    pushQueue.delete(key);
                    if (getActiveProfileId() !== profileId) return;
                    const state = get();
                    if (['full', 'push'].includes(state.syncMode)) void state.syncAllProjects({ mode: state.syncMode, projectId });
                }, 1500));
            },
            checkRemoteDiff: async (projectId) => {
                const result = await get().syncAllProjects({ mode: 'list', projectId });
                return !!result?.comparisons?.some(item => item.projectId === projectId && item.remoteRevisionIds.some(id => id !== item.localRevisionId));
            },
            startPull: async (projectId) => get().syncAllProjects({ mode: 'pull', projectId }),
            pushProject: async (projectId) => {
                if (!['full', 'push'].includes(get().syncMode)) return;
                return get().syncAllProjects({ mode: 'push', projectId });
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











