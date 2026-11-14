import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { liveQuery } from 'dexie';
import { getRepositoryContext, getRecoveryDiagnostics } from '@/lib/db';
import { serializeRecoveryEvidence } from '@/lib/recoveryEvidence';
import { subscribeProfileChanges } from '@/lib/profile/activeProfile';
import { useSettingsCommandStore } from '@/stores/settingsCommandStore';
import { useDialogueStore } from '@/stores/dialogueStore';
import { Button } from '@/components/ui/button';
import { describeError } from '@/lib/errorPresentation';

// Dialogues blocked because their text exists nowhere can be migrated with those texts left blank.
const missingTranslationsDialogueId = diagnostic => diagnostic.code === 'LOCALIZATION_REPAIR_REQUIRED' && String(diagnostic.id || '').startsWith('localization:') ? diagnostic.original?.id : null;

/** Profile-wide evidence remains accessible even when no project survived migration. */
export function RecoverySummary() {
 const { t } = useTranslation();
 const [report, setReport] = useState({ diagnostics: [], projects: [] });
 const [error, setError] = useState('');
 const [repairing, setRepairing] = useState(null);
 const [repairError, setRepairError] = useState({});
 const openSettings = useSettingsCommandStore(state => state.openWithContext);
 const repairMissingTranslations = useDialogueStore(state => state.repairMissingTranslations);
 const repair = async (diagnostic, dialogueId) => {
  setRepairing(diagnostic.id); setRepairError(current => ({ ...current, [diagnostic.id]: '' }));
  try { await repairMissingTranslations(dialogueId); }
  catch (failure) { setRepairError(current => ({ ...current, [diagnostic.id]: failure.message })); }
  finally { setRepairing(null); }
 };
 useEffect(() => {
  let subscription, generation = 0;
  const subscribe = () => {
   const ticket = ++generation;
   subscription?.unsubscribe(); setReport({ diagnostics: [], projects: [] }); setError('');
   subscription = liveQuery(async () => {
    const context = await getRepositoryContext();
    const [diagnostics, projects] = await Promise.all([getRecoveryDiagnostics(undefined, context), context.db.projects.toArray()]);
    const evidence = await serializeRecoveryEvidence(diagnostics);
    context.assertCurrent(); return { diagnostics: evidence, projects };
   }).subscribe({ next: value => { if (ticket === generation) setReport(value); }, error: failure => { if (ticket === generation && failure.code !== 'STALE_PROFILE') setError(failure.message); } });
  };
  subscribe(); const unsubscribe = subscribeProfileChanges(subscribe);
  return () => { generation += 1; subscription?.unsubscribe(); unsubscribe(); };
 }, []);
 if (!report.diagnostics.length && !error) return null;
 const download = value => `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(value, null, 2))}`;
 return <section className="m-4 rounded-lg border bg-background p-4" aria-label={t('recovery.globalTitle')}>
  <details>
   <summary className="cursor-pointer font-semibold">{t('recovery.globalTitle')} ({report.diagnostics.length})</summary>
   <p>{t('recovery.globalDescription')}</p>
   {error && <div role="alert"><p>{t('recovery.failed')}</p><details><summary>{t('recovery.details')}</summary>{error}</details></div>}
   <a className="underline" download="recovery-report.json" href={download(report.diagnostics)}>{t('recovery.reportDownload')}</a>
   {report.diagnostics.map(diagnostic => {
    const project = report.projects.find(item => item.id === diagnostic.projectId);
    const blankDialogueId = project ? missingTranslationsDialogueId(diagnostic) : null;
    return <details key={diagnostic.id} className="my-2 rounded border p-3">
     <summary>{diagnostic.table}: {describeError(diagnostic, t)}</summary>
     <p>{t('recovery.record')}: {diagnostic.original?.id ?? t('recovery.unknown')} · {diagnostic.code}</p>
     {project ? <Button onClick={() => openSettings({ context: { type: 'project', projectId: project.id }, mode: 'detail' })}>{t('recovery.openProject')}: {project.name}</Button> : <p>{t('recovery.orphanGuidance')}</p>}
     {blankDialogueId && <Button variant="outline" className="ml-2" disabled={repairing === diagnostic.id} onClick={() => { void repair(diagnostic, blankDialogueId); }}>{t('recovery.leaveMissingBlank')}</Button>}
     {repairError[diagnostic.id] && <div role="alert"><p>{t('recovery.failed')}</p><details><summary>{t('recovery.details')}</summary>{repairError[diagnostic.id]}</details></div>}
     <a className="block underline" download={`recovery-${diagnostic.id}.json`} href={download(diagnostic)}>{t('recovery.download')}</a>
     <pre className="max-h-64 overflow-auto text-xs">{JSON.stringify(diagnostic.original, null, 2)}</pre>
    </details>;
   })}
  </details>
 </section>;
}
