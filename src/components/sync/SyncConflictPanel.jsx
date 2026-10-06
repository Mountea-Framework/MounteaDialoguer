import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { liveQuery } from 'dexie';
import { getRepositoryContext } from '@/lib/db';
import { subscribeProfileChanges } from '@/lib/profile/activeProfile';
import { useSyncStore } from '@/stores/syncStore';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

/** Global placement includes projects deleted locally while a competing edit exists. */
export function SyncConflictPanel() {
 const { t } = useTranslation();
 const [conflicts, setConflicts] = useState([]), [choices, setChoices] = useState({}), [error, setError] = useState(''), [busy, setBusy] = useState(false);
 useEffect(() => {
  let subscription;
  const subscribe = () => {
   subscription?.unsubscribe(); setConflicts([]);
   subscription = liveQuery(async () => {
    const context = await getRepositoryContext();
    const rows = await context.db.syncConflicts.where('status').equals('unresolved').toArray();
    const items = await Promise.all(rows.map(async row => ({ ...row, revisions: (await context.db.projectRevisions.bulkGet(row.revisionIds)).filter(Boolean) })));
    context.assertCurrent(); return items;
   }).subscribe({ next: setConflicts, error: failure => { if (failure.code !== 'STALE_PROFILE') setError(failure.message); } });
  };
  subscribe(); const unsubscribe = subscribeProfileChanges(subscribe);
  return () => { subscription?.unsubscribe(); unsubscribe(); };
 }, []);
 const resolve = async (conflict, choice) => {
  setBusy(true); setError('');
  try { await useSyncStore.getState().resolveConflict(conflict.id, choice, choice === 'remote' ? choices[conflict.id] || conflict.revisions.find(row => row.id !== conflict.localRevisionId)?.id : undefined); }
  catch (failure) { setError(failure.message || t('syncConflicts.resolveError')); }
  finally { setBusy(false); }
 };
 if (!conflicts.length && !error) return null;
 return <aside className="fixed bottom-4 right-4 z-50 w-96 max-w-[95vw] max-h-[70vh] overflow-auto rounded-lg border bg-background p-4 shadow-xl space-y-3" aria-label={t('syncConflicts.title', 'Synchronization conflicts')}>
  <h2 className="font-semibold">{t('syncConflicts.title', 'Synchronization conflicts')}</h2>
  <p>{t('syncConflicts.description', 'Both versions are preserved. Choose which version to keep.')}</p>
  {error && <p role="alert">{error}</p>}
  {conflicts.map(conflict => <section key={conflict.id} className="border-t pt-3 space-y-2">
   <h3>{conflict.revisions.find(row => row.id === conflict.localRevisionId)?.snapshot.project.name || conflict.revisions[0]?.snapshot.project.name || conflict.projectId}</h3>
   {conflict.incomplete ? <p>{t('syncConflicts.incomplete', 'Some revision history is unavailable. Synchronize again before resolving.')}</p> : <>
    <NativeSelect aria-label={t('syncConflicts.selectRevision', 'Competing version')} value={choices[conflict.id] || conflict.revisions.find(row => row.id !== conflict.localRevisionId)?.id || ''} onChange={event => setChoices(current => ({ ...current, [conflict.id]: event.target.value }))}>
     {conflict.revisions.filter(row => row.id !== conflict.localRevisionId).map(row => <option key={row.id} value={row.id}>{row.operation === 'delete' ? t('syncConflicts.deleted', 'Deleted project') : row.snapshot.project.name} · {row.id}</option>)}
    </NativeSelect>
    <div className="flex gap-2 flex-wrap">
     <Button disabled={busy || !conflict.localRevisionId} onClick={() => resolve(conflict, 'local')}>{t('syncConflicts.keepLocal', 'Keep local')}</Button>
     <Button disabled={busy} onClick={() => resolve(conflict, 'remote')}>{t('syncConflicts.keepRemote', 'Keep remote')}</Button>
     <Button disabled={busy} onClick={() => resolve(conflict, 'both')}>{t('syncConflicts.keepBoth', 'Keep both projects')}</Button>
    </div>
   </>}
  </section>)}
 </aside>;
}
