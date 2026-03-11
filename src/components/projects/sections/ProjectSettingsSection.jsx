import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Download, Trash2, AlertTriangle, Info, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useProjectStore } from '@/stores/projectStore';
import { formatDate } from '@/lib/dateUtils';
import {
	DEFAULT_LOCALE,
	isValidLocaleTag,
	normalizeLocaleTag,
	normalizeProjectLocalizationConfig,
} from '@/lib/localization/stringTable';
import {
	getLocalizationLocaleLabel,
	LOCALIZATION_LOCALE_OPTIONS,
} from '@/lib/localization/localeCatalog';

/**
 * Project Settings Section Component
 * Project settings and configuration
 */
export function ProjectSettingsSection({ project, onExport, onDelete, showHeader = true }) {
	const { t } = useTranslation();
	const { updateProject, updateProjectLocalization } = useProjectStore();
	const [isEditing, setIsEditing] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [formData, setFormData] = useState({
		name: project.name || '',
		description: project.description || '',
		version: project.version || '1.0.0',
	});
	const [localizationData, setLocalizationData] = useState(() =>
		normalizeProjectLocalizationConfig(project.localization || {})
	);
	const [selectedLocaleToAdd, setSelectedLocaleToAdd] = useState('');
	const [localizationError, setLocalizationError] = useState('');
	const [isSavingLocalization, setIsSavingLocalization] = useState(false);
	const [isLocalizationDirty, setIsLocalizationDirty] = useState(false);
	const availableLocaleOptions = useMemo(
		() =>
			LOCALIZATION_LOCALE_OPTIONS.filter(
				(option) => !localizationData.supportedLocales.includes(option.code)
			),
		[localizationData.supportedLocales]
	);
	const effectiveSelectedLocaleToAdd = useMemo(() => {
		if (
			selectedLocaleToAdd &&
			availableLocaleOptions.some((option) => option.code === selectedLocaleToAdd)
		) {
			return selectedLocaleToAdd;
		}
		return availableLocaleOptions[0]?.code || '';
	}, [availableLocaleOptions, selectedLocaleToAdd]);

	useEffect(() => {
		setFormData({
			name: project.name || '',
			description: project.description || '',
			version: project.version || '1.0.0',
		});
		setLocalizationData(normalizeProjectLocalizationConfig(project.localization || {}));
		setSelectedLocaleToAdd('');
		setLocalizationError('');
		setIsLocalizationDirty(false);
		setIsEditing(false);
	}, [project]);

	const updateLocalizationDraft = (next) => {
		setLocalizationData(normalizeProjectLocalizationConfig(next));
		setIsLocalizationDirty(true);
		setLocalizationError('');
	};

	const handleSave = async () => {
		if (!formData.name.trim()) return;

		setIsSaving(true);
		try {
			await updateProject(project.id, {
				name: formData.name,
				description: formData.description,
				version: formData.version,
			});
			setIsEditing(false);
		} catch (error) {
			console.error('Failed to update project:', error);
		} finally {
			setIsSaving(false);
		}
	};

	const handleCancel = () => {
		setFormData({
			name: project.name || '',
			description: project.description || '',
			version: project.version || '1.0.0',
		});
		setIsEditing(false);
	};

	const handleAddLocale = () => {
		const raw = String(effectiveSelectedLocaleToAdd || '').trim();
		if (!raw) return;
		if (!isValidLocaleTag(raw)) {
			setLocalizationError(
				t('settings.localization.invalidLocale', {
					defaultValue: 'Enter a valid BCP-47 locale tag (for example: en, en-US, cs-CZ).',
				})
			);
			return;
		}

		const normalized = normalizeLocaleTag(raw, '');
		if (!normalized) {
			setLocalizationError(
				t('settings.localization.invalidLocale', {
					defaultValue: 'Enter a valid BCP-47 locale tag (for example: en, en-US, cs-CZ).',
				})
			);
			return;
		}
		if (localizationData.supportedLocales.includes(normalized)) {
			setLocalizationError(
				t('settings.localization.duplicateLocale', {
					defaultValue: 'This locale is already in the supported list.',
				})
			);
			return;
		}

		updateLocalizationDraft({
			...localizationData,
			supportedLocales: [...localizationData.supportedLocales, normalized],
		});
	};

	const handleRemoveLocale = (locale) => {
		if (localizationData.enabled && locale === localizationData.defaultLocale) {
			setLocalizationError(
				t('settings.localization.removeDefaultBlocked', {
					defaultValue: 'You cannot remove the default locale while localization is enabled.',
				})
			);
			return;
		}

		const nextSupported = localizationData.supportedLocales.filter((item) => item !== locale);
		let nextDefault = localizationData.defaultLocale;
		if (!nextSupported.includes(nextDefault)) {
			nextDefault = nextSupported[0] || DEFAULT_LOCALE;
		}
		updateLocalizationDraft({
			...localizationData,
			defaultLocale: nextDefault,
			supportedLocales: nextSupported.length > 0 ? nextSupported : [nextDefault],
		});
	};

	const handleLocalizationSave = async () => {
		setIsSavingLocalization(true);
		setLocalizationError('');
		try {
			const invalid = localizationData.supportedLocales.find((locale) => !isValidLocaleTag(locale));
			if (invalid) {
				throw new Error(`Invalid locale tag: ${invalid}`);
			}
			if (!isValidLocaleTag(localizationData.defaultLocale)) {
				throw new Error(`Invalid locale tag: ${localizationData.defaultLocale}`);
			}

			let supportedLocales = [...localizationData.supportedLocales];
			if (!supportedLocales.includes(localizationData.defaultLocale)) {
				supportedLocales = [localizationData.defaultLocale, ...supportedLocales];
			}

			const nextLocalization = normalizeProjectLocalizationConfig({
				...localizationData,
				supportedLocales,
			});

			const persisted = await updateProjectLocalization(project.id, nextLocalization);
			setLocalizationData(normalizeProjectLocalizationConfig(persisted));
			setIsLocalizationDirty(false);
		} catch (error) {
			console.error('Failed to update localization settings:', error);
			setLocalizationError(
				error.message ||
					t('settings.localization.saveError', {
						defaultValue: 'Failed to update localization settings.',
					})
			);
		} finally {
			setIsSavingLocalization(false);
		}
	};

	const handleDelete = () => {
		onDelete();
	};

	return (
		<div className="space-y-6">
			{showHeader ? (
				<div>
					<h2 className="text-2xl font-bold">{t('settings.title')}</h2>
					<p className="text-sm text-muted-foreground mt-1">
						{t('settings.projectDescription')}
					</p>
				</div>
			) : null}

			{/* Project Information */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Info className="h-5 w-5 text-primary" />
								{t('settings.projectInfo')}
							</CardTitle>
							<CardDescription className="mt-1.5">
								{t('settings.projectInfoDescription')}
							</CardDescription>
						</div>
						{!isEditing && (
							<Button onClick={() => setIsEditing(true)} variant="outline">
								{t('common.edit')}
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-4">
						<div className="grid gap-2">
							<Label htmlFor="name">{t('projects.projectName')}</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								disabled={!isEditing}
								placeholder={t('projects.projectName')}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="description">{t('projects.projectDescription')}</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								disabled={!isEditing}
								placeholder={t('settings.descriptionPlaceholder')}
								rows={3}
							/>
						</div>

						<div className="grid gap-2">
							<Label htmlFor="version">{t('settings.version')}</Label>
							<Input
								id="version"
								value={formData.version}
								onChange={(e) =>
									setFormData({ ...formData, version: e.target.value })
								}
								disabled={!isEditing}
								placeholder="1.0.0"
							/>
						</div>
					</div>

					{isEditing && (
						<div className="flex justify-end gap-2 pt-4 border-t">
							<Button variant="outline" onClick={handleCancel} disabled={isSaving}>
								{t('common.cancel')}
							</Button>
							<Button onClick={handleSave} disabled={isSaving || !formData.name.trim()}>
								<Save className="h-4 w-4 mr-2" />
								{isSaving ? t('common.saving') : t('common.save')}
							</Button>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Localization */}
			<Card>
				<CardHeader>
					<CardTitle>
						{t('settings.localization.title', { defaultValue: 'Localization' })}
					</CardTitle>
					<CardDescription>
						{t('settings.localization.description', {
							defaultValue:
								'Enable per-project StringTable-style localization for dialogue content.',
						})}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
						<div className="space-y-1">
							<p className="text-sm font-medium">
								{t('settings.localization.enable', {
									defaultValue: 'Enable localization',
								})}
							</p>
							<p className="text-xs text-muted-foreground">
								{t('settings.localization.enableHint', {
									defaultValue:
										'When enabled, dialogue text is resolved through a per-project StringTable.',
								})}
							</p>
						</div>
						<Switch
							checked={Boolean(localizationData.enabled)}
							onCheckedChange={(checked) =>
								updateLocalizationDraft({ ...localizationData, enabled: checked })
							}
						/>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="default-locale">
							{t('settings.localization.defaultLocale', {
								defaultValue: 'Default locale',
							})}
						</Label>
						<NativeSelect
							id="default-locale"
							value={localizationData.defaultLocale}
							onChange={(event) =>
								updateLocalizationDraft({
									...localizationData,
									defaultLocale: normalizeLocaleTag(
										event.target.value,
										localizationData.defaultLocale
									),
								})
							}
						>
							{localizationData.supportedLocales.map((locale) => (
								<option key={locale} value={locale}>
									{getLocalizationLocaleLabel(locale)} ({locale})
								</option>
							))}
						</NativeSelect>
					</div>

					<div className="grid gap-2">
						<Label htmlFor="new-locale">
							{t('settings.localization.supportedLocales', {
								defaultValue: 'Supported locales',
							})}
						</Label>
						<div className="flex gap-2">
							<NativeSelect
								id="new-locale"
								value={effectiveSelectedLocaleToAdd}
								onChange={(event) => setSelectedLocaleToAdd(event.target.value)}
								disabled={availableLocaleOptions.length === 0}
								className="flex-1"
							>
								{availableLocaleOptions.length === 0 ? (
									<option value="">
										{t('settings.localization.allSuggestedAdded', {
											defaultValue: 'All suggested locales are already added.',
										})}
									</option>
								) : (
									availableLocaleOptions.map((option) => (
										<option key={option.code} value={option.code}>
											{option.label} ({option.code})
										</option>
									))
								)}
							</NativeSelect>
							<Button
								variant="outline"
								onClick={handleAddLocale}
								className="gap-2"
								disabled={availableLocaleOptions.length === 0}
							>
								<Plus className="h-4 w-4" />
								{t('common.add')}
							</Button>
						</div>
						<div className="flex flex-wrap gap-2">
							{localizationData.supportedLocales.map((locale) => (
								<div
									key={locale}
									className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-1 text-xs"
								>
									<span>{getLocalizationLocaleLabel(locale)}</span>
									<span className="text-muted-foreground">({locale})</span>
									{locale === localizationData.defaultLocale ? (
										<span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">
											{t('settings.localization.defaultTag', { defaultValue: 'default' })}
										</span>
									) : null}
									<Button
										variant="ghost"
										size="icon"
										className="h-5 w-5"
										onClick={() => handleRemoveLocale(locale)}
									>
										<X className="h-3 w-3" />
									</Button>
								</div>
							))}
						</div>
					</div>

					{localizationError ? (
						<p className="text-sm text-destructive">{localizationError}</p>
					) : null}

					<div className="flex justify-end gap-2 pt-2 border-t">
						<Button
							onClick={handleLocalizationSave}
							disabled={!isLocalizationDirty || isSavingLocalization}
							className="gap-2"
						>
							<Save className="h-4 w-4" />
							{isSavingLocalization ? t('common.saving') : t('common.save')}
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Project Metadata */}
			<Card>
				<CardHeader>
					<CardTitle>{t('settings.metadata')}</CardTitle>
					<CardDescription>{t('settings.metadataDescription')}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid gap-3">
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">{t('settings.projectId')}</span>
							<code className="text-sm font-mono bg-muted px-2 py-1 rounded">
								{project.id}
							</code>
						</div>
						<Separator />
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">{t('projects.created')}</span>
							<span className="text-sm font-medium">{formatDate(project.createdAt)}</span>
						</div>
						<Separator />
						<div className="flex justify-between py-2">
							<span className="text-sm text-muted-foreground">{t('projects.modified')}</span>
							<span className="text-sm font-medium">{formatDate(project.modifiedAt)}</span>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Export & Import */}
			<Card>
				<CardHeader>
					<CardTitle>{t('settings.dataManagement')}</CardTitle>
					<CardDescription>{t('settings.dataManagementDescription')}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Button onClick={onExport} variant="outline" className="w-full justify-start gap-2">
						<Download className="h-4 w-4" />
						{t('settings.exportProject')}
					</Button>
				</CardContent>
			</Card>

			{/* Danger Zone */}
			<Card className="border-destructive">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<AlertTriangle className="h-5 w-5" />
						{t('settings.dangerZone')}
					</CardTitle>
					<CardDescription>{t('settings.dangerZoneDescription')}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button
						variant="destructive"
						onClick={handleDelete}
						className="w-full justify-start gap-2"
					>
						<Trash2 className="h-4 w-4" />
						{t('projects.deleteProject')}
					</Button>
				</CardContent>
			</Card>

		</div>
	);
}
