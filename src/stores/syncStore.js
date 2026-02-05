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
			rememberPassphrase: false,
			pullState: {
				active: false,
				step: 'checking',
				progress: 0,
				projectId: null,
			},

			setPassphrase: (value) => set({ passphrase: value }),
			setAccountLabel: (value) => set({ accountLabel: value }),
			setRememberPassphrase: (value) => set({ rememberPassphrase: value }),
			setClientId: (value) => {
				setStoredClientId(value);
				set({ clientId: value });
			},
			clearError: () => set({ error: null }),

			loadAccount: async () => {
				const account = await getSyncAccount('googleDrive');
				if (!account) return;
				set({
					provider: 'googleDrive',
					status: 'connected',
					accountLabel: account.email || account.accountId || '',
					clientId: getConfiguredClientId(),
				});
				const { passphrase } = get();
				if (passphrase && passphrase.trim()) {
					get().syncAllProjects();
				}
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
					await get().syncAllProjects();
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
					pullState: { active: false, step: 'checking', progress: 0, projectId: null },
				});
			},

			syncAllProjects: async () => {
				const { status, provider, passphrase } = get();
				if (status !== 'connected' || !provider) return;
				if (!passphrase || !passphrase.trim()) return;

				set({ status: 'syncing' });
				try {
					await syncAllProjectsEngine({ passphrase });
					set({ status: 'connected', lastSyncedAt: new Date().toISOString() });
				} catch (error) {
					console.error('Sync all failed:', error);
					const message = (error?.message || '').toLowerCase();
					if (message.includes('tokenexpired')) {
						set({ status: 'error', error: 'tokenExpired' });
					} else {
						set({ status: 'error', error: 'syncFailed' });
					}
				}
			},

			schedulePush: (projectId) => {
				const { status, provider } = get();
				if (status !== 'connected' || !provider) return;
				if (!projectId) return;

				const existing = pushQueue.get(projectId);
				if (existing) {
					clearTimeout(existing);
				}

				const timer = setTimeout(() => {
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
				const { passphrase } = get();
				if (!passphrase || !passphrase.trim()) {
					set({ error: 'passphraseRequired', status: 'error' });
					return;
				}

				set({
					status: 'syncing',
					error: null,
					pullState: { active: true, step: 'checking', progress: 10, projectId },
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
						pullState: { active: false, step: 'checking', progress: 0, projectId: null },
					});
				} else {
					set({
						pullState: { active: false, step: 'checking', progress: 0, projectId: null },
					});
				}
			},

			pushProject: async (projectId) => {
				const { passphrase } = get();
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
			}),
			onRehydrateStorage: () => (state) => {
				if (!state) return;
				state.status = state.provider ? 'connected' : 'disconnected';
				state.clientId = getStoredClientId();
			},
		}
	)
);
