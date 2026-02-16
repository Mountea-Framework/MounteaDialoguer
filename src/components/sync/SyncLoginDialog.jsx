import { useMemo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, LogOut, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useSyncStore } from '@/stores/syncStore';
import { cn } from '@/lib/utils';
import { isMobileDevice } from '@/lib/deviceDetection';

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
		rememberPassphrase,
		error,
		setPassphrase,
		setAccountLabel,
		setRememberPassphrase,
		clearError,
		connectGoogleDrive,
		syncAllProjects,
		disconnect,
	} = useSyncStore();

	const isConnected = status === 'connected' && provider === 'googleDrive';
	const isConnecting = status === 'connecting';
	const isSyncing = status === 'syncing';
	const canConnect = passphrase.trim().length > 0 && !isConnecting;
	const [isDesktop, setIsDesktop] = useState(!isMobileDevice());

	useEffect(() => {
		const updateViewportType = () => setIsDesktop(!isMobileDevice());
		updateViewportType();
		window.addEventListener('resize', updateViewportType);
		window.addEventListener('orientationchange', updateViewportType);
		window.addEventListener('device-override', updateViewportType);
		return () => {
			window.removeEventListener('resize', updateViewportType);
			window.removeEventListener('orientationchange', updateViewportType);
			window.removeEventListener('device-override', updateViewportType);
		};
	}, []);

	const handleConnect = async () => {
		const success = await connectGoogleDrive();
		if (success) {
			onOpenChange(false);
		}
	};
	const isMobile = !isDesktop;

	const handleManualSync = async () => {
		await syncAllProjects({ mode: 'full' });
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

	const syncFormContent = (
		<>
			<div
				className={cn(
					'no-scrollbar flex-1 min-h-0 overflow-y-auto',
					isDesktop ? '-mx-4 px-4 sm:-mx-6 sm:px-6' : 'px-4'
				)}
			>
				<div className="space-y-4 pb-2">
					<div
						className={`flex md:flex-row gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3 sm:flex-row sm:items-center ${isMobile ? 'flex-row' : 'flex-col'}`}>
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

						<div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
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
							<div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
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
			</div>

			{isDesktop ? (
				<DialogFooter>
					{isConnected ? (
						<>
							<Button
								variant="outline"
								onClick={handleManualSync}
								className="gap-2 w-full sm:w-auto"
								disabled={isSyncing}
							>
								<Cloud className="h-4 w-4" />
								{isSyncing ? t('sync.status.syncing') : t('sync.syncNow')}
							</Button>
							<Button variant="destructive" onClick={disconnect} className="gap-2 w-full sm:w-auto">
								<LogOut className="h-4 w-4" />
								{t('sync.disconnect')}
							</Button>
						</>
					) : (
						<Button
							onClick={handleConnect}
							disabled={!canConnect}
							className={cn('gap-2 w-full sm:w-auto', isConnecting && 'opacity-80')}
						>
							<Cloud className="h-4 w-4" />
							{isConnecting ? t('sync.connecting') : t('sync.connect')}
						</Button>
					)}
					<Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
						{t('common.close')}
					</Button>
				</DialogFooter>
			) : (
				<DrawerFooter className="border-t border-border/60 bg-background">
					{isConnected ? (
						<>
							<Button
								variant="outline"
								onClick={handleManualSync}
								className="gap-2 w-full"
								disabled={isSyncing}
							>
								<Cloud className="h-4 w-4" />
								{isSyncing ? t('sync.status.syncing') : t('sync.syncNow')}
							</Button>
							<Button variant="destructive" onClick={disconnect} className="gap-2 w-full">
								<LogOut className="h-4 w-4" />
								{t('sync.disconnect')}
							</Button>
						</>
					) : (
						<Button
							onClick={handleConnect}
							disabled={!canConnect}
							className={cn('gap-2 w-full', isConnecting && 'opacity-80')}
						>
							<Cloud className="h-4 w-4" />
							{isConnecting ? t('sync.connecting') : t('sync.connect')}
						</Button>
					)}
					<Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
						{t('common.close')}
					</Button>
				</DrawerFooter>
			)}
		</>
	);

	return isDesktop ? (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{t('sync.title')}</DialogTitle>
					<DialogDescription>{t('sync.description')}</DialogDescription>
				</DialogHeader>
				{syncFormContent}
			</DialogContent>
		</Dialog>
	) : (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<DrawerContent className="max-h-[92vh] flex flex-col">
				<DrawerHeader className="text-left">
					<DrawerTitle>{t('sync.title')}</DrawerTitle>
					<DrawerDescription>{t('sync.description')}</DrawerDescription>
				</DrawerHeader>
				{syncFormContent}
			</DrawerContent>
		</Drawer>
	);
}
