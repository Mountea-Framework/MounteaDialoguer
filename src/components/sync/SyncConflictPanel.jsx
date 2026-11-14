import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { liveQuery } from 'dexie';
import { getRepositoryContext } from '@/lib/db';
import { subscribeProfileChanges } from '@/lib/profile/activeProfile';
import { useSyncStore } from '@/stores/syncStore';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';

function selectedRemote(conflict, selection) {
	const competing = conflict.revisions.filter(row => row.id !== conflict.localRevisionId);
	return competing.find(row => row.id === selection)?.id || competing[0]?.id;
}

function RevisionTimestamp({ value, formatter, t }) {
	const date = typeof value === 'string' && value.trim() ? new Date(value) : null;
	if (!date || !Number.isFinite(date.getTime())) return <span>{t('syncConflicts.unknownDate')}</span>;
	return <time dateTime={date.toISOString()}>{formatter.format(date)}</time>;
}

/** Global placement includes projects deleted locally while a competing edit exists. */
export function SyncConflictPanel() {
	const { t, i18n } = useTranslation();
	const [conflicts, setConflicts] = useState([]);
	const [choices, setChoices] = useState({});
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const formatter = new Intl.DateTimeFormat(i18n.resolvedLanguage || i18n.language, {
		year: 'numeric', month: 'short', day: 'numeric',
		hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short',
	});

	useEffect(() => {
		let subscription;
		const subscribe = () => {
			subscription?.unsubscribe();
			setConflicts([]);
			subscription = liveQuery(async () => {
				const context = await getRepositoryContext();
				const rows = await context.db.syncConflicts.where('status').equals('unresolved').toArray();
				const items = await Promise.all(rows.map(async row => {
					const loaded = await context.db.projectRevisions.bulkGet([...new Set(row.revisionIds)]);
					const revisions = loaded.filter(Boolean).sort((left, right) => {
						if (left.id === right.id) return 0;
						if (left.id === row.localRevisionId) return -1;
						if (right.id === row.localRevisionId) return 1;
						return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
					});
					return { ...row, revisions, incomplete: row.incomplete || loaded.some(revision => !revision) || revisions.length < 2 };
				}));
				context.assertCurrent();
				return items;
			}).subscribe({
				next: setConflicts,
				error: failure => { if (failure.code !== 'STALE_PROFILE') setError(failure.message); },
			});
		};
		subscribe();
		const unsubscribe = subscribeProfileChanges(subscribe);
		return () => { subscription?.unsubscribe(); unsubscribe(); };
	}, []);

	const resolve = async (conflict, choice) => {
		setBusy(true);
		setError('');
		try {
			await useSyncStore.getState().resolveConflict(conflict.id, choice,
				choice === 'remote' ? selectedRemote(conflict, choices[conflict.id]) : undefined);
		} catch (failure) {
			setError(failure.message || t('syncConflicts.resolveError'));
		} finally {
			setBusy(false);
		}
	};
	if (!conflicts.length && !error) return null;
	return (
		<aside className="fixed bottom-4 right-4 z-50 w-96 max-w-[95vw] max-h-[70vh] overflow-auto rounded-lg border bg-background p-4 shadow-xl space-y-3" aria-label={t('syncConflicts.title')}>
			<h2 className="font-semibold">{t('syncConflicts.title')}</h2>
			<p>{t('syncConflicts.description')}</p>
			{error && <p role="alert">{error}</p>}
			{conflicts.map(conflict => {
				const versions = conflict.revisions.map((revision, index) => {
					const label = t('syncConflicts.versionLabel', {
						number: index + 1, name: revision.snapshot.project?.name || conflict.projectId,
						source: t(revision.id === conflict.localRevisionId ? 'syncConflicts.thisBrowser' : 'syncConflicts.otherVersion'),
					});
					return { revision, label: revision.operation === 'delete' ? `${label} · ${t('syncConflicts.deleted')}` : label };
				});
				const remoteId = selectedRemote(conflict, choices[conflict.id]);
				return (
					<section key={conflict.id} data-conflict-id={conflict.id} className="border-t pt-3 space-y-2 min-w-0 [overflow-wrap:anywhere]">
						<h3>{conflict.revisions[0]?.snapshot.project?.name || conflict.projectId}</h3>
						{conflict.incomplete ? <p>{t('syncConflicts.incomplete')}</p> : <>
							<ul className="text-sm space-y-3" data-testid="conflict-summary">
								{versions.map(({ revision, label }) => (
									<li key={revision.id} data-revision-id={revision.id} className="space-y-1">
										<strong className="block">{label}</strong>
										<RevisionTimestamp value={revision.createdAt} formatter={formatter} t={t} />
										{revision.operation !== 'delete' && <p>
											{t('syncConflicts.dialogueCount', { count: revision.snapshot.dialogues?.length || 0 })}
											{' · '}{t('syncConflicts.nodeCount', { count: revision.snapshot.nodes?.length || 0 })}
										</p>}
										<details>
											<summary className="cursor-pointer">{t('syncConflicts.revisionDetails')}</summary>
											<code className="block whitespace-normal [overflow-wrap:anywhere]">{revision.id}</code>
										</details>
									</li>
								))}
							</ul>
							<p className="text-xs text-muted-foreground">{t('syncConflicts.hint')}</p>
							<NativeSelect aria-label={t('syncConflicts.selectRevision')} value={remoteId || ''} disabled={busy || !remoteId}
								onChange={event => setChoices(current => ({ ...current, [conflict.id]: event.target.value }))}>
								{versions.filter(({ revision }) => revision.id !== conflict.localRevisionId).map(({ revision, label }) => (
									<option key={revision.id} value={revision.id}>{label}</option>
								))}
							</NativeSelect>
							<div className="flex gap-2 flex-wrap">
								<Button disabled={busy || !conflict.revisions.some(row => row.id === conflict.localRevisionId)} onClick={() => resolve(conflict, 'local')}>{t('syncConflicts.keepLocal')}</Button>
								<Button disabled={busy || !remoteId} onClick={() => resolve(conflict, 'remote')}>{t('syncConflicts.keepRemote')}</Button>
								<Button disabled={busy} onClick={() => resolve(conflict, 'both')}>{t(versions.length > 2 ? 'syncConflicts.keepAll' : 'syncConflicts.keepBoth')}</Button>
							</div>
						</>}
					</section>
				);
			})}
		</aside>
	);
}
