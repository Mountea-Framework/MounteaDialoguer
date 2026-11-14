import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Terminal } from 'lucide-react';

/** Desktop only: turns the local endpoint used by the Mountea Dialoguer CLI on or off (electron/automation.cjs). */
export function CliAccessToggle() {
	const { t } = useTranslation();
	const api = typeof window === 'undefined' ? null : window.electronAPI;
	const [status, setStatus] = useState(null);
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		let active = true;
		api?.getAutomationStatus?.().then((next) => { if (active) setStatus(next); }).catch(() => {});
		return () => { active = false; };
	}, [api]);

	if (typeof api?.setAutomationEnabled !== 'function') return null;

	const enabled = Boolean(status?.enabled || status?.headless);
	const toggle = async () => {
		setBusy(true);
		try { setStatus(await api.setAutomationEnabled(!status?.enabled)); }
		catch { /* the switch keeps its previous state */ }
		finally { setBusy(false); }
	};
	const detail = status?.running
		? t('automation.cliAccess.running', { port: status.port })
		: t('automation.cliAccess.off');

	return (
		<label className="flex items-center gap-3 rounded-md border bg-card px-3 py-2">
			<Terminal className="h-4 w-4 text-muted-foreground" />
			<span className="text-sm min-w-[6rem]">{t('automation.cliAccess.label')}</span>
			<span className="flex-1 text-xs text-muted-foreground">{detail}</span>
			<input
				type="checkbox"
				className="h-4 w-4"
				checked={enabled}
				disabled={busy || !status || status.headless}
				onChange={() => { void toggle(); }}
				aria-describedby="cli-access-detail"
			/>
			<span id="cli-access-detail" className="sr-only">{t('automation.cliAccess.description')}</span>
		</label>
	);
}
