// Shared target helpers for the tutorial chapters. Labels are i18n keys, never copied text.
export const sidebar = (nameKey) => ({ role: 'button', nameKey, within: { css: 'aside nav' } });
export const dialogButton = (nameKey) => ({ role: 'button', nameKey, exact: true, within: { role: 'dialog' } });
export const inDialog = (target) => ({ ...target, within: { role: 'dialog' } });
