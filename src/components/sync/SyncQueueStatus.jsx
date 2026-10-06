import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { useTranslation } from 'react-i18next';
import { getRevisionQueueStatus } from '@/lib/sync/core/revisionProtocol';
import { useSyncStore } from '@/stores/syncStore';
import { subscribeProfileChanges } from '@/lib/profile/activeProfile';

export function SyncQueueStatus() {
 const { t } = useTranslation();
 const provider = useSyncStore(state => state.provider);
 const [queue, setQueue] = useState(null);
 useEffect(() => {
  let subscription;
  const subscribe = () => {
   subscription?.unsubscribe(); setQueue(null);
   if (provider) subscription = liveQuery(() => getRevisionQueueStatus(provider)).subscribe({ next: setQueue, error: () => setQueue(null) });
  };
  subscribe(); const unsubscribe = subscribeProfileChanges(subscribe);
  return () => { subscription?.unsubscribe(); unsubscribe(); };
 }, [provider]);
 if (!queue) return null;
 return <section className="rounded border p-3 text-sm space-y-1" aria-label={t('syncQueue.title', 'Pending synchronization')}>
  <p>{t('syncQueue.counts', { defaultValue: 'Queued: {{queued}} · Uploaded: {{uploaded}} · Verified: {{verified}}', ...queue })}</p>
  {!!queue.pending && <p>{t('syncQueue.age', { defaultValue: 'Oldest pending change: {{minutes}} minutes', minutes: Math.floor(queue.oldestPendingAgeMs / 60000) })}</p>}
  {!!queue.conflicts && <p>{t('syncQueue.conflicts', { defaultValue: 'Unresolved conflicts: {{count}}', count: queue.conflicts })}</p>}
  {!!queue.errorCodes.length && <p role="status">{t('syncQueue.errors', { defaultValue: 'Delivery errors: {{codes}}', codes: queue.errorCodes.join(', ') })}</p>}
 </section>;
}
