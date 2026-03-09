const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	isElectron: true,
	startGoogleOAuth: (payload) => ipcRenderer.invoke('auth:start-google-oauth', payload),
	openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
	getSteamStatus: () => ipcRenderer.invoke('steam:get-status'),
	openSteamOverlay: (payload) => ipcRenderer.invoke('steam:open-overlay', payload),
	setSteamRichPresence: (payload) => ipcRenderer.invoke('steam:set-rich-presence', payload),
	unlockSteamAchievement: (payload) =>
		ipcRenderer.invoke('steam:unlock-achievement', payload),
	setMenuContext: (context) => ipcRenderer.send('menu:set-context', context),
	onMenuCommand: (listener) => {
		if (typeof listener !== 'function') return () => {};
		const handler = (_event, payload) => listener(payload);
		ipcRenderer.on('menu:command', handler);
		return () => ipcRenderer.removeListener('menu:command', handler);
	},
});
