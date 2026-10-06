import { describeError } from '@/lib/errorPresentation';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Import always defaults to a copy. Replacement names its intended target. */
export function ArchiveImportDialog({ file, targets = [], kind, onClose, onImport }) {
	const { t } = useTranslation();
	const [mode, setMode] = useState('copy');
	const [targetId, setTargetId] = useState(targets[0]?.id || '');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState(false);
	const returnFocus = useRef(null);
	return <Dialog open={Boolean(file)} onOpenChange={(open) => { if (!open && !busy) onClose(); }}>
		<DialogContent onOpenAutoFocus={() => { returnFocus.current = document.activeElement; }} onCloseAutoFocus={(event) => { if (returnFocus.current?.isConnected) { event.preventDefault(); returnFocus.current.focus(); } }}>
			<DialogHeader><DialogTitle>{t('archive.importTitle', { defaultValue: 'Import archive' })}</DialogTitle><DialogDescription>{file?.name}</DialogDescription></DialogHeader>
			<label className="flex gap-2"><input type="radio" name="archive-mode" checked={mode === 'copy'} onChange={() => setMode('copy')} disabled={busy} />{t('archive.copy', { defaultValue: 'Import as a new copy' })}</label>
			{targets.length > 0 && <>
				<label className="flex gap-2"><input type="radio" name="archive-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} disabled={busy} />{t('archive.replace', { defaultValue: 'Replace an existing item' })}</label>
				{mode === 'replace' && <>
					<label>{t('archive.target', { defaultValue: 'Item to replace' })}<select className="mt-2 block w-full rounded border bg-background p-2" value={targetId} onChange={(event) => setTargetId(event.target.value)} disabled={busy}>{targets.map((target) => <option key={target.id} value={target.id}>{target.name} ({target.id.slice(0, 8)})</option>)}</select></label>
					<p className="text-sm text-destructive">{t('archive.replaceWarning', { defaultValue: 'The selected item and its graph content will be replaced. Export a backup first if you want to keep the current version.' })}</p>
				</>}
			</>}
			{error && <p role="alert">{t('archive.failed')} {describeError(error, t)}</p>}
			<DialogFooter><Button variant="outline" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button><Button disabled={busy || (mode === 'replace' && !targetId)} onClick={async () => { setBusy(true); setError(false); try { await onImport({ mode, ...(mode === 'replace' ? { [kind === 'project' ? 'projectId' : 'dialogueId']: targetId } : {}) }); onClose(); } catch (failure) { setError(failure); } finally { setBusy(false); } }}>{mode === 'replace' ? t('archive.confirmReplace', { defaultValue: 'Replace selected item' }) : t('archive.copy', { defaultValue: 'Import as a new copy' })}</Button></DialogFooter>
		</DialogContent>
	</Dialog>;
}
