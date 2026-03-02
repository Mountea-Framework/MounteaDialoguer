const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
	isElectron: true,
	startGoogleOAuth: (payload) => ipcRenderer.invoke('auth:start-google-oauth', payload),
	openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
	setMenuContext: (context) => ipcRenderer.send('menu:set-context', context),
	onMenuCommand: (listener) => {
		if (typeof listener !== 'function') return () => {};
		const handler = (_event, payload) => listener(payload);
		ipcRenderer.on('menu:command', handler);
		return () => ipcRenderer.removeListener('menu:command', handler);
	},
});
