import { useMemo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, Shield } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import { useSyncStore } from '@/stores/syncStore';
import { useSteamStore } from '@/stores/steamStore';
import { cn } from '@/lib/utils';
import { isMobileDevice } from '@/lib/deviceDetection';
import { GoogleDriveIcon } from '@/components/sync/GoogleDriveIcon';
import { SteamIcon } from '@/components/sync/SteamIcon';
import { isGoogleSyncEnabled, isSteamChannel } from '@/lib/runtimeConfig';
import { isElectronRuntime } from '@/lib/electronRuntime';

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
		error,
		clearError,
		connectGoogleDrive,
		connectSteamProvider,
		syncAllProjects,
		disconnect,
		getProviderInput,
		setProviderPassphrase,
		setProviderAccountLabel,
		setProviderRememberPassphrase,
	} = useSyncStore();
	const steamStatus = useSteamStore((state) => state.status);
	const openSteamOverlay = useSteamStore((state) => state.openOverlay);
	const googleSyncEnabled = isGoogleSyncEnabled();
	const steamChannel = isSteamChannel();
	const runtimeSteamChannel = String(steamStatus?.channel || '').toLowerCase() === 'steam';
	const showSteamProvider = isElectronRuntime() && (steamChannel || runtimeSteamChannel);
	const [activeProvider, setActiveProvider] = useState(
		googleSyncEnabled ? 'googleDrive' : showSteamProvider ? 'steam' : ''
	);
	const steamAutoConnectAttemptedRef = useRef(false);

	const googleInput = getProviderInput('googleDrive');
	const googleAccountLabel = googleInput.accountLabel || '';
	const googlePassphrase = googleInput.passphrase || '';
	const googleRememberPassphrase = Boolean(googleInput.rememberPassphrase);
	const steamIdentity = steamStatus?.personaName || steamStatus?.steamId || '';
	const isSteamProviderSelected = provider === 'steam';
	const isSteamProviderConnected = provider === 'steam' && status === 'connected';
	const isSteamSyncing = status === 'syncing' && provider === 'steam';

	const isGoogleConnected = status === 'connected' && provider === 'googleDrive';
	const isGoogleConnecting = status === 'connecting';
	const isGoogleSyncing = status === 'syncing' && provider === 'googleDrive';
	const isGoogleBusy = isGoogleConnecting || isGoogleSyncing;
	const showGoogleError = Boolean(error);
	const canConnectGoogle =
		googleSyncEnabled && googlePassphrase.trim().length > 0 && !isGoogleBusy;
	const [isDesktop, setIsDesktop] = useState(!isMobileDevice());

	useEffect(() => {
		if (!open) return;
		setActiveProvider((current) => {
			if (current === 'googleDrive' && !googleSyncEnabled) {
				return showSteamProvider ? 'steam' : '';
			}
			if (current === 'steam' && !showSteamProvider) {
				return googleSyncEnabled ? 'googleDrive' : '';
			}
			if (current) return current;
			if (googleSyncEnabled) return 'googleDrive';
			if (showSteamProvider) return 'steam';
			return '';
		});
	}, [open, googleSyncEnabled, showSteamProvider]);

	useEffect(() => {
		if (open) return;
		steamAutoConnectAttemptedRef.current = false;
	}, [open]);

	useEffect(() => {
		if (provider === 'steam' && showSteamProvider) {
			setActiveProvider('steam');
			return;
		}
		if (provider === 'googleDrive' && googleSyncEnabled) {
			setActiveProvider('googleDrive');
		}
	}, [googleSyncEnabled, provider, showSteamProvider]);

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

	useEffect(() => {
		if (!open) return;
		if (!showSteamProvider || !steamStatus?.available) return;
		if (steamAutoConnectAttemptedRef.current) return;
		// Prevent reconnect loops when a Steam sync error occurs while the dialog is open.
		// Manual "Sync now" remains available for explicit retry.
		if (provider === 'steam') return;
		if (provider === 'googleDrive' && status === 'connected') return;

		steamAutoConnectAttemptedRef.current = true;
		connectSteamProvider(steamStatus).catch((error) => {
			console.warn('[sync] Failed to auto-connect Steam provider:', error);
			steamAutoConnectAttemptedRef.current = false;
		});
	}, [
		connectSteamProvider,
		open,
		provider,
		showSteamProvider,
		status,
		steamStatus,
	]);

	const handleConnectGoogle = async () => {
		if (!googleSyncEnabled) return;
		const success = await connectGoogleDrive();
		if (success) {
			onOpenChange(false);
		}
	};

	const handleManualSyncGoogle = async () => {
		await syncAllProjects({ mode: 'full', trigger: 'manual-google-sync' });
	};

	const handleManualSyncSteam = async () => {
		await syncAllProjects({ mode: 'full', trigger: 'manual-steam-sync' });
	};

	const googleStatusLabel = useMemo(() => {
		if (status === 'connected' && provider === 'googleDrive') return t('sync.status.connected');
		if (status === 'connecting') return t('sync.status.connecting');
		if (status === 'syncing' && provider === 'googleDrive') return t('sync.status.syncing');
		if (status === 'error') return t('sync.status.error');
		return t('sync.status.disconnected');
	}, [provider, status, t]);

	const steamStatusLabel = useMemo(() => {
		if (!steamStatus?.available) return t('sync.status.disconnected');
		if (isSteamSyncing) return t('sync.status.syncing');
		if (isSteamProviderConnected) return t('sync.status.connected');
		return t('sync.status.disconnected');
	}, [isSteamProviderConnected, isSteamSyncing, steamStatus?.available, t]);

	const steamHeaderSubtitle = useMemo(() => {
		if (steamStatus?.available && steamIdentity) {
			return t('sync.steam.profile', { account: steamIdentity });
		}
		if (steamStatus?.available) return t('sync.status.connected');
		if (steamStatus?.error) return String(steamStatus.error);
		return t('sync.providers.none');
	}, [steamIdentity, steamStatus?.available, steamStatus?.error, t]);

	const steamDetailLines = useMemo(() => {
		const lines = [];

		if (steamStatus?.available && steamStatus?.launchedViaSteam && steamStatus?.overlayEnabled) {
			lines.push(t('sync.steam.overlayReady'));
		}

		if (steamStatus?.available && !steamStatus?.launchedViaSteam) {
			lines.push(t('sync.steam.overlayUnavailable'));
			lines.push(t('sync.steam.overlayUnavailableHint'));
		}

		if (!steamStatus?.available && steamStatus?.error) {
			lines.push(String(steamStatus.error));
		}

		return lines;
	}, [
		steamStatus?.available,
		steamStatus?.launchedViaSteam,
		steamStatus?.overlayEnabled,
		steamStatus?.error,
		t,
	]);

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

	const syncInputClassName =
		'focus-visible:ring-1 focus-visible:ring-border/70 focus-visible:ring-offset-0 focus-visible:border-border';

	const syncFormContent = (
		<>
			<div
				className={cn(
					'no-scrollbar flex-1 min-h-0 overflow-y-auto',
					isDesktop ? '-mx-4 px-4 sm:-mx-6 sm:px-6' : 'px-4'
				)}
			>
				<div className="space-y-4 pb-2">
					<Accordion
						type="single"
						collapsible
						value={activeProvider}
						onValueChange={setActiveProvider}
						className="space-y-3"
					>
						{showSteamProvider ? (
							<AccordionItem
								value="steam"
								className="overflow-hidden rounded-lg border border-border bg-muted/40 px-3 border-b"
							>
								<AccordionTrigger className="py-3 hover:no-underline">
									<div className="flex min-w-0 flex-1 items-center gap-3">
										<div className="h-10 w-12 overflow-hidden rounded-lg border border-border bg-background flex items-center justify-center px-1 shadow-sm">
											<SteamIcon className="h-5 w-full object-contain" />
										</div>
										<div className="min-w-0 flex-1 text-left">
											<p className="text-sm font-semibold">{t('sync.providers.steam')}</p>
											<p className="text-xs text-muted-foreground truncate">{steamHeaderSubtitle}</p>
										</div>
										<div className="text-xs font-medium text-muted-foreground">
											{steamStatusLabel}
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent className="space-y-3">
									{steamStatus?.available && steamStatus?.launchedViaSteam ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => openSteamOverlay('Friends')}
										>
											{t('sync.steam.openOverlay')}
										</Button>
									) : null}

									{steamStatus?.available ? (
										<div className="flex flex-wrap gap-2">
											{!isSteamProviderConnected ? (
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={isSteamSyncing}
													onClick={() => connectSteamProvider(steamStatus)}
												>
													{t('sync.steam.connectCta', { defaultValue: 'Use Steam Sync' })}
												</Button>
											) : null}
											{isSteamProviderSelected ? (
												<Button
													type="button"
													size="sm"
													variant="outline"
													disabled={isSteamSyncing}
													onClick={handleManualSyncSteam}
												>
													{isSteamSyncing
														? t('sync.status.syncing')
														: t('sync.syncNow')}
												</Button>
											) : null}
										</div>
									) : null}

									{steamDetailLines.length > 0 ? (
										<div className="rounded-md border border-border/70 bg-background/60 p-3">
											<div className="grid gap-1.5 text-xs">
												{steamDetailLines.map((line, index) => (
													<p key={`${line}-${index}`} className="text-muted-foreground">
														{line}
													</p>
												))}
											</div>
										</div>
									) : null}
								</AccordionContent>
							</AccordionItem>
						) : null}

						{googleSyncEnabled ? (
							<AccordionItem
								value="googleDrive"
								className="overflow-hidden rounded-lg border border-border bg-muted/40 px-3 border-b"
							>
								<AccordionTrigger className="py-3 hover:no-underline">
									<div className="flex min-w-0 flex-1 items-center gap-3">
										<div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center border border-border shadow-sm">
											<GoogleDriveIcon className="h-6 w-6" />
										</div>
										<div className="min-w-0 flex-1 text-left">
											<p className="text-sm font-semibold">{t('sync.providers.googleDrive')}</p>
											{isGoogleConnected && googleAccountLabel ? (
												<p className="text-xs text-muted-foreground truncate">
													{t('sync.connectedAs', { account: googleAccountLabel })}
												</p>
											) : (
												<p className="text-xs text-muted-foreground truncate">
													{t('sync.providers.none')}
												</p>
											)}
										</div>
										<div className="text-xs font-medium text-muted-foreground">
											{googleStatusLabel}
										</div>
									</div>
								</AccordionTrigger>
								<AccordionContent>
									<div className="grid gap-4">
										<div className="grid gap-2">
											<Label htmlFor="sync-google-account">{t('sync.accountLabel')}</Label>
											<Input
												id="sync-google-account"
												value={googleAccountLabel}
												onChange={(e) => {
													setProviderAccountLabel('googleDrive', e.target.value);
													clearError?.();
												}}
												placeholder={t('sync.accountPlaceholder')}
												disabled={isGoogleConnected || isGoogleBusy}
												className={syncInputClassName}
											/>
										</div>

										<div className="grid gap-2">
											<Label htmlFor="sync-google-passphrase" className="flex items-center gap-2">
												<Shield className="h-4 w-4 text-primary" />
												{t('sync.passphrase')}
											</Label>
											<Input
												id="sync-google-passphrase"
												type="password"
												value={googlePassphrase}
												onChange={(e) => {
													setProviderPassphrase('googleDrive', e.target.value);
													clearError?.();
												}}
												placeholder={t('sync.passphrasePlaceholder')}
												disabled={isGoogleConnected || isGoogleBusy}
												className={syncInputClassName}
											/>
											<p className="text-xs text-muted-foreground">{t('sync.passphraseHint')}</p>
										</div>

										<div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
											<div>
												<p className="text-sm font-medium">{t('sync.remember')}</p>
												<p className="text-xs text-muted-foreground">{t('sync.rememberHint')}</p>
											</div>
											<Switch
												checked={googleRememberPassphrase}
												onCheckedChange={(value) =>
													setProviderRememberPassphrase('googleDrive', value)
												}
												disabled={isGoogleConnected || isGoogleBusy}
											/>
										</div>

										{showGoogleError ? (
											<p className="text-xs text-destructive">{errorMessage}</p>
										) : null}

										<div className="flex flex-wrap gap-2">
											{isGoogleConnected ? (
												<>
													<Button
														variant="outline"
														onClick={handleManualSyncGoogle}
														className="gap-2"
														disabled={isGoogleSyncing}
													>
														{isGoogleSyncing
															? t('sync.status.syncing')
															: t('sync.syncNow')}
													</Button>
													<Button
														variant="destructive"
														onClick={disconnect}
														className="gap-2"
													>
														<LogOut className="h-4 w-4" />
														{t('sync.disconnect')}
													</Button>
												</>
											) : (
												<Button
													onClick={handleConnectGoogle}
													disabled={!canConnectGoogle}
													className={cn('gap-2', isGoogleConnecting && 'opacity-80')}
												>
													{isGoogleConnecting
														? t('sync.connecting')
														: t('sync.connect')}
												</Button>
											)}
										</div>
									</div>
								</AccordionContent>
							</AccordionItem>
						) : (
							<div className="rounded-lg border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
								{t('sync.googleDisabled')}
							</div>
						)}
					</Accordion>

					{showPromptControls ? (
						<div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="text-sm font-medium">{t('sync.promptDontShow')}</p>
								<p className="text-xs text-muted-foreground">{t('sync.promptDontShowHint')}</p>
							</div>
							<Switch checked={hideLoginPrompt} onCheckedChange={onHideLoginPromptChange} />
						</div>
					) : null}
				</div>
			</div>

			{isDesktop ? (
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
						{t('common.close')}
					</Button>
				</DialogFooter>
			) : (
				<DrawerFooter className="border-t border-border/60 bg-background">
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
