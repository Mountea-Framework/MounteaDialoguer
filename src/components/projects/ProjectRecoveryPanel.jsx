import { describeError } from '@/lib/errorPresentation';
import { useTranslation } from 'react-i18next';
import { serializeRecoveryEvidence } from '@/lib/recoveryEvidence';
import { useEffect, useState } from 'react';
import { getRepositoryContext, getRecoveryDiagnostics, revalidateProjectRecovery, restoreQuarantinedNode, repairIdentityReference, readProjectRecords } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';

export function ProjectRecoveryPanel({ projectId }) {
 const { t } = useTranslation();
 const [diagnostics, setDiagnostics] = useState([]), [records, setRecords] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [drafts, setDrafts] = useState({});
 useEffect(() => {
  let active = true;
  (async () => { const context = await getRepositoryContext(); const data = await serializeRecoveryEvidence(await getRecoveryDiagnostics(projectId, context)); const source = await readProjectRecords(projectId, context); context.assertCurrent(); if (active) { setDiagnostics(data); setRecords(source); } })().catch((failure) => { if (active && failure.code !== 'STALE_PROFILE') setError(failure); });
  return () => { active = false; };
 }, [projectId]);
 const run = async (operation) => {
  const context = await getRepositoryContext(); setBusy(true); setError('');
  try { await operation(context); const data = await serializeRecoveryEvidence(await getRecoveryDiagnostics(projectId, context)); const source = await readProjectRecords(projectId, context); context.assertCurrent(); setDiagnostics(data); setRecords(source); }
  catch (failure) { if (!context.signal.aborted) setError(failure); }
  finally { if (!context.signal.aborted) setBusy(false); }
 };
 if (!diagnostics.length && !error) return null;
 return <section className="border rounded-lg p-4 space-y-3" aria-label={t('recovery.title')}>
  <h3 className="font-semibold">{t('recovery.title')} ({diagnostics.length})</h3>
  <p>{t('recovery.description')}</p>
  {error && <div role="alert"><p>{t('recovery.failed')}</p><details><summary>{t('recovery.details')}</summary>{describeError(error, t)}</details></div>}
  <Button disabled={busy} onClick={() => run((context) => revalidateProjectRecovery(projectId, context))}>{t('recovery.revalidate')}</Button>
  {diagnostics.map((diagnostic) => {
   const options = diagnostic.table === 'participants' && diagnostic.path === 'categoryId' ? records?.categories : diagnostic.table === 'nodes' && (diagnostic.path === 'participantId' || diagnostic.rowId) ? records?.participants : null;
   const quarantine = diagnostic.table === 'nodes' && diagnostic.code === 'duplicate_identity';
   return <details key={diagnostic.id} className="border rounded p-3">
    <summary>{describeError(diagnostic, t)}</summary>
    <p>{t('recovery.record')}: {diagnostic.original?.id || t('recovery.unknown')} · {diagnostic.code}</p>
    <a download={`recovery-${diagnostic.id}.json`} href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(diagnostic, null, 2))}`}>{t('recovery.download')}</a>
    {options && <div className="flex gap-2 mt-2"><NativeSelect aria-label={t('recovery.replacement', { id: diagnostic.original?.id, row: diagnostic.rowId || '' })} value={drafts[diagnostic.id] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [diagnostic.id]: event.target.value }))}><option value="">{t('recovery.choose')}</option>{options.map((record) => <option key={record.id} value={record.id}>{record.name} ({record.id})</option>)}</NativeSelect><Button disabled={busy || !drafts[diagnostic.id]} onClick={() => run((context) => repairIdentityReference(diagnostic.id, drafts[diagnostic.id], context))}>{t('recovery.assign')}</Button></div>}
    {quarantine && <div className="space-y-2"><p>{t('recovery.restoreDescription')}</p><Button onClick={() => setDrafts((current) => ({ ...current, [diagnostic.id]: JSON.stringify({ ...diagnostic.original, id: crypto.randomUUID() }, null, 2) }))}>{t('recovery.prepare')}</Button><Textarea aria-label={t('recovery.nodeJson')} value={drafts[diagnostic.id] || ''} onChange={(event) => setDrafts((current) => ({ ...current, [diagnostic.id]: event.target.value }))}/><Button disabled={busy || !drafts[diagnostic.id]} onClick={() => run((context) => restoreQuarantinedNode(diagnostic.id, JSON.parse(drafts[diagnostic.id]), context))}>{t('recovery.restore')}</Button></div>}
    <pre className="overflow-auto max-h-64 text-xs">{JSON.stringify(diagnostic.original, null, 2)}</pre>
   </details>;
  })}
 </section>;
}
