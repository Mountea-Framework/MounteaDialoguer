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
	pullProjectAsNew,
	pullProject,
	pushProject as pushProjectToRemote,
	syncAllProjects as syncAllProjectsEngine,
} from '@/lib/sync/syncEngine';
import { getSyncAccount, upsertSyncAccount, clearSyncAccount } from '@/lib/sync/syncStorage';

const SYNC_STORAGE_KEY = 'mountea-dialoguer-sync';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const pushQueue = new Map();

export const useSyncStore = create(
	persist(
		(set, get) => ({
			provider: null,
			status: 'disconnected',
			accountLabel: '',
			lastSyncedAt: null,
			error: null,
			passphrase: '',
			clientId: getStoredClientId(),
			rememberPassphrase: true,
			hideLoginPrompt: false,
			loginDialogOpen: false,
			syncMode: 'pull',
			hasHydrated: false,
			pullState: {
				active: false,
				step: 'checking',
				progress: 0,
				projectId: null,
				mode: 'project',
				current: 0,
				total: 0,
			},

			setPassphrase: (value) => set({ passphrase: value }),
			setAccountLabel: (value) => set({ accountLabel: value }),
			setRememberPassphrase: (value) => set({ rememberPassphrase: value }),
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
				set({
					provider: 'googleDrive',
					status: 'connected',
					accountLabel: account.email || account.accountId || '',
					clientId: getConfiguredClientId(),
				});
			},

			connectGoogleDrive: async () => {
				const { passphrase } = get();
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
						refreshToken: existing?.refreshToken || '',
						expiresAt,
						scope: authResult.scope,
						tokenType: authResult.tokenType,
					});

					set({
						provider: 'googleDrive',
						status: 'connected',
						accountLabel: userInfo.email || userInfo.name || '',
						error: null,
					});
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
				set({
					provider: null,
					status: 'disconnected',
					accountLabel: '',
					lastSyncedAt: null,
					error: null,
					passphrase: '',
					pullState: {
						active: false,
						step: 'checking',
						progress: 0,
						projectId: null,
						mode: 'project',
						current: 0,
						total: 0,
					},
				});
			},

			syncAllProjects: async (options = {}) => {
				const { status, provider, passphrase, pullState, syncMode } = get();
				if (!provider) return;
				if (status === 'syncing') return;
				if (status !== 'connected') return;
				if (!passphrase || !passphrase.trim()) return;
				if (pullState?.active && pullState?.mode === 'project') return;
				const { mode = syncMode || 'full' } = options;

				set({ status: 'syncing' });
				const resetPullState = {
					active: false,
					step: 'checking',
					progress: 0,
					projectId: null,
					mode: 'bulk',
					current: 0,
					total: 0,
				};
				let shouldShow = false;
				let total = 0;
				try {
					if (mode === 'list') {
						console.log('[sync] Listing remote projects (debug)');
						const diff = await diffRemoteLocalEngine();
						console.log('[sync] Remote projects (raw)', diff.remoteRaw);
						const duplicateInfo = Array.from(diff.duplicates.entries()).map(([projectId, items]) => ({
							projectId,
							count: items.length,
						}));
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
						const duplicateInfo = Array.from(diff.duplicates.entries()).map(([projectId, items]) => ({
							projectId,
							count: items.length,
						}));
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
						set({ status: 'connected', lastSyncedAt: new Date().toISOString(), pullState: resetPullState });
						return;
					}

					if (mode === 'pull') {
						console.log('[sync] Pull-only sync start');
						const diff = await diffRemoteLocalEngine();
						const duplicateInfo = Array.from(diff.duplicates.entries()).map(([projectId, items]) => ({
							projectId,
							count: items.length,
						}));
						if (duplicateInfo.length > 0) {
							console.warn('[sync] Duplicate remote files detected', duplicateInfo);
						}

						if (diff.actions.toPull.length === 0) {
							console.log('[sync] No projects to pull');
							set({ status: 'connected', pullState: resetPullState });
							return;
						}

						const comparisonMap = new Map(diff.comparisons.map((item) => [item.projectId, item]));
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
								const result = await pullProjectAsNew({
									projectId,
									fileId: remote.fileId,
									revision: remote.revision,
									passphrase,
								});
								console.log('[sync] Pulled project as new', result);
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
				const { passphrase, syncMode } = get();
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
						pullState: {
							active: false,
							step: 'checking',
							progress: 0,
							projectId: null,
							mode: 'project',
							current: 0,
							total: 0,
						},
					});
				} else {
					set({
						pullState: {
							active: false,
							step: 'checking',
							progress: 0,
							projectId: null,
							mode: 'project',
							current: 0,
							total: 0,
						},
					});
				}
			},

			pushProject: async (projectId) => {
				const { passphrase, syncMode } = get();
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
				accountLabel: state.accountLabel,
				lastSyncedAt: state.lastSyncedAt,
				rememberPassphrase: state.rememberPassphrase,
				passphrase: state.rememberPassphrase ? state.passphrase : '',
				clientId: state.clientId,
				hideLoginPrompt: state.hideLoginPrompt,
			}),
			onRehydrateStorage: () => (state) => {
				if (!state) return;
				state.status = state.provider ? 'connected' : 'disconnected';
				state.clientId = getStoredClientId();
				state.hasHydrated = true;
				if (state.rememberPassphrase === undefined) {
					state.rememberPassphrase = true;
				}
				if (state.hideLoginPrompt === undefined) {
					state.hideLoginPrompt = false;
				}
			},
		}
	)
);
