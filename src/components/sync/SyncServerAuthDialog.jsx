import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSyncAuthStatus, loginSyncServer, setupSyncServer } from '@/lib/sync/providers/storageProviders';

const TOO_MANY = 'Too many attempts. Wait 15 minutes and try again.';
const MESSAGES = {
	INVALID_SETUP_CODE: ['syncAuth.invalidSetupCode', 'That setup code is wrong. Check the server log.'],
	WEAK_PASSWORD: ['syncAuth.weakPassword', 'Use at least 8 characters.'],
	INVALID_PASSWORD: ['syncAuth.invalidPassword', 'Wrong password.'],
	TOO_MANY_ATTEMPTS: ['syncAuth.tooManyAttempts', TOO_MANY],
};

export function SyncServerAuthDialog({ open, onOpenChange, onAuthenticated }) {
	const { t } = useTranslation();
	const [mode, setMode] = useState(null); // 'setup' | 'login' | null while loading
	const [code, setCode] = useState('');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		if (!open) return undefined;
		let cancelled = false;
		setMode(null); setCode(''); setPassword(''); setConfirm(''); setError('');
		getSyncAuthStatus()
			.then((status) => { if (!cancelled) setMode(status.configured ? 'login' : 'setup'); })
			.catch(() => { if (!cancelled) { setMode('login'); setError(t('syncAuth.unreachable', 'Could not reach the sync server.')); } });
		return () => { cancelled = true; };
	}, [open, t]);

	const submit = async (event) => {
		event.preventDefault();
		if (mode === 'setup' && password !== confirm) { setError(t('syncAuth.mismatch', 'The passwords do not match.')); return; }
		setBusy(true); setError('');
		try {
			if (mode === 'setup') await setupSyncServer({ code: code.trim(), password });
			else await loginSyncServer({ password });
			onOpenChange(false);
			onAuthenticated?.();
		} catch (failure) {
			if (failure.code === 'ALREADY_CONFIGURED') setMode('login');
			else if (failure.code === 'SETUP_REQUIRED') setMode('setup');
			else {
				const [key, text] = MESSAGES[failure.code] || ['syncAuth.failed', 'Something went wrong. Try again.'];
				setError(t(key, text));
			}
			setPassword(''); setConfirm('');
		} finally {
			setBusy(false);
		}
	};

	const isSetup = mode === 'setup';

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<form onSubmit={submit} className="space-y-4">
					<DialogHeader>
						<DialogTitle>{isSetup ? t('syncAuth.setupTitle', 'Set up your sync server') : t('syncAuth.loginTitle', 'Sign in to sync')}</DialogTitle>
						<DialogDescription>
							{isSetup
								? t('syncAuth.setupDescription', 'Choose a password to protect your synced projects. The setup code is shown in the server log.')
								: t('syncAuth.loginDescription', 'Enter your sync password to continue syncing.')}
						</DialogDescription>
					</DialogHeader>
					{mode && (
						<div className="space-y-3">
							{isSetup && (
								<div className="space-y-1.5">
									<Label htmlFor="sync-setup-code">{t('syncAuth.setupCode', 'Setup code')}</Label>
									<Input id="sync-setup-code" value={code} placeholder="XXXX-XXXX" autoComplete="off" onChange={(e) => setCode(e.target.value)} />
								</div>
							)}
							<div className="space-y-1.5">
								<Label htmlFor="sync-password">{isSetup ? t('syncAuth.newPassword', 'New password') : t('syncAuth.password', 'Sync password')}</Label>
								<Input id="sync-password" type="password" minLength={isSetup ? 8 : undefined} autoComplete={isSetup ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} />
							</div>
							{isSetup && (
								<div className="space-y-1.5">
									<Label htmlFor="sync-password-confirm">{t('syncAuth.confirmPassword', 'Confirm password')}</Label>
									<Input id="sync-password-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
								</div>
							)}
						</div>
					)}
					{error && <p role="alert" className="text-sm text-destructive">{error}</p>}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel', 'Cancel')}</Button>
						<Button type="submit" disabled={busy || !mode || !password || (isSetup && !code.trim())}>
							{isSetup ? t('syncAuth.setupSubmit', 'Set password') : t('syncAuth.loginSubmit', 'Sign in')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
