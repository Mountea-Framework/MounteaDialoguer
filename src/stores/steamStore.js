import { create } from 'zustand';
import {
	getSteamStatus as getSteamStatusClient,
	openSteamOverlay as openSteamOverlayClient,
	unlockSteamAchievement as unlockSteamAchievementClient,
} from '@/lib/steam/steamClient';

const DEFAULT_STATUS = Object.freeze({
	initialized: false,
	available: false,
	channel: 'desktop',
	appId: 0,
	steamId: '',
	personaName: '',
	overlayEnabled: false,
	error: '',
});

export const useSteamStore = create((set, get) => ({
	status: { ...DEFAULT_STATUS },
	isLoading: false,

	loadStatus: async () => {
		set({ isLoading: true });
		try {
			const status = await getSteamStatusClient();
			set({ status: { ...DEFAULT_STATUS, ...status }, isLoading: false });
			return status;
		} catch (error) {
			const nextStatus = {
				...DEFAULT_STATUS,
				initialized: true,
				error: String(error?.message || 'Failed to load Steam status'),
			};
			set({ status: nextStatus, isLoading: false });
			return nextStatus;
		}
	},

	openOverlay: async (dialog = 'Friends') => {
		return await openSteamOverlayClient(dialog);
	},

	unlockAchievement: async (achievementId) => {
		return await unlockSteamAchievementClient(achievementId);
	},

	isSteamAvailable: () => Boolean(get().status?.available),
}));
