const listeners = new Set();
let state = { language: 'en', theme: 'dark', scene: null, view: null, ready: false };

export const getState = () => state;
export const subscribe = (listener) => {
	listeners.add(listener);
	return () => listeners.delete(listener);
};
export const setState = (partial) => {
	state = { ...state, ...partial };
	listeners.forEach((listener) => listener());
};
