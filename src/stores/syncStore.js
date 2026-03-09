import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
	diffRemoteLocal as diffRemoteLocalEngine,
	previewPullFromFile,
	previewPushProject,
	pullProjectFromFile,
	pullProject,
	pushProject as pushProjectToRemote,
	syncAllProjects as syncAllProjectsEngine,
} from '@/lib/sync/syncEngine';
import { getSyncAccount, upsertSyncAccount, clearSyncAccount } from '@/lib/sync/syncStorage';

const SYNC_STORAGE_KEY = 'mountea-dialoguer-sync';
const SYNC_PROVIDER_IDS = Object.freeze(['googleDrive', 'steam']);
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

function normalizeProviderId(value) {
	return String(value || '').trim();
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

			loadAccount: async () => {
				const account = await getSyncAccount('googleDrive');
				if (!account) return;

				set((state) => ({
					provider: 'googleDrive',
					status: 'connected',
					clientId: getConfiguredClientId(),
					providerInputs: withProviderInput(state, 'googleDrive', {
						accountLabel: account.email || account.accountId || '',
					}),
				}));
			},

			connectGoogleDrive: async () => {
				const passphrase = getProviderPassphraseFromState(get(), 'googleDrive');
				try {
					getGoogleClientId();
				} catch (error) {
					set({ error: 'missingClientId', status: 'error' });
					return false;
				}

				if (!passphrase || !passphrase.trim()) {
					set({ error: 'passphraseRequired' });
					return false;
				}

				set({ status: 'connecting', error: null });
				try {
					console.log('[sync] Starting Google auth');
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
					console.log('[sync] Google auth complete');
					return true;
				} catch (error) {
					console.error('Google Drive connect failed:', error);
					const message = (error?.message || '').toLowerCase();
					let errorCode = 'oauthFailed';
					if (message.includes('popup')) errorCode = 'popupBlocked';
					if (message.includes('redirect_uri_mismatch')) errorCode = 'redirectUriMismatch';
					if (message.includes('invalid_grant')) errorCode = 'invalidGrant';
					set({ status: 'error', error: errorCode });
					return false;
				}
			},

			disconnect: async () => {
				await clearSyncAccount('googleDrive');
				set((state) => ({
					provider: null,
					status: 'disconnected',
					lastSyncedAt: null,
					error: null,
					pullState: createResetPullState('project'),
					providerInputs: withProviderInput(state, 'googleDrive', {
						accountLabel: '',
						passphrase: '',
					}),
				}));
			},

			syncAllProjects: async (options = {}) => {
				const currentState = get();
				const { status, provider, pullState, syncMode } = currentState;
				const passphrase = getProviderPassphraseFromState(currentState, provider);
				if (!provider) return;
				if (status === 'syncing') return;
				if (status !== 'connected') return;
				if (!passphrase || !passphrase.trim()) return;
				if (pullState?.active && pullState?.mode === 'project') return;
				const { mode = syncMode || 'full' } = options;

				set({ status: 'syncing' });
				const resetPullState = createResetPullState('bulk');
				let shouldShow = false;
				let total = 0;
				try {
					if (mode === 'list') {
						console.log('[sync] Listing remote projects (debug)');
						const diff = await diffRemoteLocalEngine();
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
						const diff = await diffRemoteLocalEngine();
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
							set({ status: 'connected', pullState: resetPullState });
							return;
						}

						for (const projectId of diff.actions.toPush) {
							try {
								console.log('[sync] Pushing project', projectId);
								await pushProjectToRemote({ projectId, passphrase });
							} catch (error) {
								console.error('[sync] Push failed', projectId, error);
							}
						}
						console.log('[sync] Push-only sync complete');
						set({
							status: 'connected',
							lastSyncedAt: new Date().toISOString(),
							pullState: resetPullState,
						});
						return;
					}

					if (mode === 'pull') {
						console.log('[sync] Pull-only sync start');
						const diff = await diffRemoteLocalEngine();
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
								});
								console.log('[sync] Pulled project', result);
							} catch (error) {
								console.error('[sync] Pull failed', projectId, error);
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
						return;
					}

					await syncAllProjectsEngine({
						passphrase,
						onProgress: (info) => {
							if (info?.phase === 'start') {
								total = info.total || 0;
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
					set({ status: 'connected', lastSyncedAt: new Date().toISOString() });
					set({ pullState: resetPullState });
				} catch (error) {
					console.error('Sync all failed:', error);
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
				const { status, provider, syncMode } = get();
				if (status !== 'connected' || !provider) return;
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
				const { status, provider } = get();
				if (status !== 'connected' || !provider) return false;

				try {
					return await checkRemoteDiffEngine(projectId);
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
				const passphrase = getProviderPassphraseFromState(currentState, provider);
				if (syncMode !== 'full') {
					console.log('[sync] Skip pull (non-full mode)');
					return;
				}
				if (!passphrase || !passphrase.trim()) {
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
				const passphrase = getProviderPassphraseFromState(currentState, provider);
				if (syncMode === 'list') {
					console.log('[sync] Skip push (list mode)');
					return;
				}
				if (!passphrase || !passphrase.trim()) {
					set({ error: 'passphraseRequired' });
					return;
				}
				try {
					await pushProjectToRemote({ projectId, passphrase });
				} catch (error) {
					console.error('Push failed:', error);
					set({ error: 'syncFailed' });
				}
			},
		}),
		{
			name: SYNC_STORAGE_KEY,
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
