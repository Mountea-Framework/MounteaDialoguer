import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const SYNC_STORAGE_KEY = 'mountea-dialoguer-sync';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const useSyncStore = create(
	persist(
		(set, get) => ({
			provider: null,
			status: 'disconnected',
			accountLabel: '',
			lastSyncedAt: null,
			error: null,
			passphrase: '',
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

			connectGoogleDrive: async () => {
				const { passphrase } = get();
				if (!passphrase || !passphrase.trim()) {
					set({ error: 'Passphrase required' });
					return false;
				}

				set({ status: 'connecting', error: null });
				await delay(350);

				set({
					provider: 'googleDrive',
					status: 'connected',
					error: null,
				});
				return true;
			},

			disconnect: () =>
				set({
					provider: null,
					status: 'disconnected',
					accountLabel: '',
					lastSyncedAt: null,
					error: null,
					passphrase: '',
					pullState: { active: false, step: 'checking', progress: 0, projectId: null },
				}),

			checkRemoteDiff: async (projectId) => {
				void projectId;
				const { status, provider } = get();
				if (status !== 'connected' || !provider) return false;

				// Placeholder until Google Drive adapter is implemented
				return false;
			},

			startPull: async (projectId, options = {}) => {
				const { simulate = true } = options;

				set({
					status: 'syncing',
					error: null,
					pullState: { active: true, step: 'checking', progress: 10, projectId },
				});

				if (!simulate) return;

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

				set({
					status: 'connected',
					lastSyncedAt: new Date().toISOString(),
					pullState: { active: false, step: 'checking', progress: 0, projectId: null },
				});
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
			}),
			onRehydrateStorage: () => (state) => {
				if (!state) return;
				state.status = state.provider ? 'connected' : 'disconnected';
			},
		}
	)
);
