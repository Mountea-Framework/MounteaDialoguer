import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, LogOut, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSyncStore } from '@/stores/syncStore';
import { cn } from '@/lib/utils';
import { getConfiguredClientId } from '@/lib/sync/googleDriveAuth';

export function SyncLoginDialog({
	open,
	onOpenChange,
	showPromptControls = false,
	hideLoginPrompt = false,
	onHideLoginPromptChange,
}) {
	const { t } = useTranslation();
	const {
		provider,
		status,
		accountLabel,
		passphrase,
		clientId,
		rememberPassphrase,
		error,
		setPassphrase,
		setAccountLabel,
		setRememberPassphrase,
		setClientId,
		clearError,
		connectGoogleDrive,
		disconnect,
	} = useSyncStore();

	const isConnected = status === 'connected' && provider === 'googleDrive';
	const isConnecting = status === 'connecting';
	const canConnect = passphrase.trim().length > 0 && !isConnecting;
	const configuredClientId = getConfiguredClientId();
	const clientIdValue = clientId || configuredClientId;
	const [showClientId, setShowClientId] = useState(!clientIdValue);

	const handleConnect = async () => {
		const success = await connectGoogleDrive();
		if (success) {
			onOpenChange(false);
		}
	};

	const statusLabel = useMemo(() => {
		if (status === 'connected') return t('sync.status.connected');
		if (status === 'connecting') return t('sync.status.connecting');
		if (status === 'syncing') return t('sync.status.syncing');
		if (status === 'error') return t('sync.status.error');
		return t('sync.status.disconnected');
	}, [status, t]);

	const errorMessage = useMemo(() => {
		if (!error) return '';
		const map = {
			passphraseRequired: t('sync.errors.passphraseRequired'),
			missingClientId: t('sync.errors.missingClientId'),
			oauthFailed: t('sync.errors.oauthFailed'),
			popupBlocked: t('sync.errors.popupBlocked'),
			syncFailed: t('sync.errors.syncFailed'),
			tokenExpired: t('sync.errors.tokenExpired'),
			redirectUriMismatch: t('sync.errors.redirectUriMismatch'),
			invalidGrant: t('sync.errors.invalidGrant'),
		};
		return map[error] || t('common.error');
	}, [error, t]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl">
				<DialogHeader>
					<DialogTitle>{t('sync.title')}</DialogTitle>
					<DialogDescription>{t('sync.description')}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3">
						<div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-blue-500 text-white flex items-center justify-center">
							<Cloud className="h-5 w-5" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-semibold">{t('sync.providers.googleDrive')}</p>
							<p className="text-xs text-muted-foreground truncate">
								{isConnected && accountLabel
									? t('sync.connectedAs', { account: accountLabel })
									: statusLabel}
							</p>
						</div>
						<div className="text-xs font-medium text-muted-foreground">{statusLabel}</div>
					</div>

					<div className="grid gap-4">
						{!showClientId && clientIdValue && (
							<div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
								<div>
									<p className="text-sm font-medium">{t('sync.clientIdConfigured')}</p>
									<p className="text-xs text-muted-foreground">{t('sync.clientIdHiddenHint')}</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onClick={() => setShowClientId(true)}
								>
									{t('sync.clientIdChange')}
								</Button>
							</div>
						)}

						{(showClientId || !clientIdValue) && (
							<div className="grid gap-2">
								<Label htmlFor="sync-client-id">{t('sync.clientId')}</Label>
								<Input
									id="sync-client-id"
									value={clientIdValue}
									onChange={(e) => {
										setClientId(e.target.value);
										clearError?.();
									}}
									placeholder={t('sync.clientIdPlaceholder')}
									disabled={isConnected}
								/>
								<p className="text-xs text-muted-foreground">
									{t('sync.clientIdHint')}
								</p>
							</div>
						)}

						<div className="grid gap-2">
							<Label htmlFor="sync-account">{t('sync.accountLabel')}</Label>
							<Input
								id="sync-account"
								value={accountLabel}
								onChange={(e) => {
									setAccountLabel(e.target.value);
									clearError?.();
								}}
								placeholder={t('sync.accountPlaceholder')}
								disabled={isConnected}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="sync-passphrase" className="flex items-center gap-2">
								<Shield className="h-4 w-4 text-primary" />
								{t('sync.passphrase')}
							</Label>
							<Input
								id="sync-passphrase"
								type="password"
								value={passphrase}
								onChange={(e) => {
									setPassphrase(e.target.value);
									clearError?.();
								}}
								placeholder={t('sync.passphrasePlaceholder')}
								disabled={isConnected}
							/>
							<p className="text-xs text-muted-foreground">
								{t('sync.passphraseHint')}
							</p>
						</div>

						<div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
							<div>
								<p className="text-sm font-medium">{t('sync.remember')}</p>
								<p className="text-xs text-muted-foreground">{t('sync.rememberHint')}</p>
							</div>
							<Switch
								checked={rememberPassphrase}
								onCheckedChange={setRememberPassphrase}
								disabled={isConnected}
							/>
						</div>

						{showPromptControls && (
							<div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
								<div>
									<p className="text-sm font-medium">{t('sync.promptDontShow')}</p>
									<p className="text-xs text-muted-foreground">
										{t('sync.promptDontShowHint')}
									</p>
								</div>
								<Switch
									checked={hideLoginPrompt}
									onCheckedChange={onHideLoginPromptChange}
								/>
							</div>
						)}

						{error && (
							<p className="text-xs text-destructive">
								{errorMessage}
							</p>
						)}
					</div>
				</div>

				<DialogFooter className="mt-4">
					{isConnected ? (
						<Button variant="destructive" onClick={disconnect} className="gap-2">
							<LogOut className="h-4 w-4" />
							{t('sync.disconnect')}
						</Button>
					) : (
						<Button
							onClick={handleConnect}
							disabled={!canConnect}
							className={cn('gap-2', isConnecting && 'opacity-80')}
						>
							<Cloud className="h-4 w-4" />
							{isConnecting ? t('sync.connecting') : t('sync.connect')}
						</Button>
					)}
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						{t('common.close')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
