import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { useDecoratorStore } from '@/stores/decoratorStore';

export function EditDecoratorDialog({ open, onOpenChange, decorator, projectId }) {
	const { t } = useTranslation();
	const { updateDecorator } = useDecoratorStore();
	const [isUpdating, setIsUpdating] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		type: '',
		properties: [],
	});
	const [errors, setErrors] = useState({});

	useEffect(() => {
		if (open && decorator) {
			setFormData({
				name: decorator.name || '',
				type: decorator.type || '',
				properties: Array.isArray(decorator.properties) ? decorator.properties : [],
			});
		}
	}, [open, decorator]);

	useEffect(() => {
		if (!open) {
			setErrors({});
		}
	}, [open]);

	const addProperty = () => {
		setFormData((prev) => ({
			...prev,
			properties: [
				...prev.properties,
				{ name: '', type: 'string', defaultValue: '' },
			],
		}));
	};

	const updateProperty = (index, field, value) => {
		const updatedProperties = [...formData.properties];
		updatedProperties[index] = {
			...updatedProperties[index],
			[field]: value,
		};
		setFormData({ ...formData, properties: updatedProperties });
	};

	const removeProperty = (index) => {
		setFormData((prev) => ({
			...prev,
			properties: prev.properties.filter((_, i) => i !== index),
		}));
	};

	const asBoolean = (value) => {
		if (typeof value === 'boolean') return value;
		if (typeof value === 'string') return value.toLowerCase() === 'true';
		return Boolean(value);
	};

	const validate = () => {
		const newErrors = {};

		if (!formData.name.trim()) {
			newErrors.name = t('validation.required');
		} else if (/\s/.test(formData.name)) {
			newErrors.name = t('decorators.validation.noWhitespace');
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;

		setIsUpdating(true);
		try {
			await updateDecorator(decorator.id, {
				name: formData.name,
				type: formData.type,
				properties: formData.properties,
				projectId,
			});
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to update decorator:', error);
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle>{t('common.edit')} {t('decorators.title').slice(0, -1)}</DialogTitle>
					<DialogDescription>
						{t('decorators.updateDescription')}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4 sm:-mx-6 sm:px-6">
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
							<Label htmlFor="name">
								{t('decorators.name')} <span className="text-destructive">*</span>
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => {
									setFormData({ ...formData, name: e.target.value });
									if (errors.name) setErrors({ ...errors, name: null });
								}}
								placeholder={t('decorators.namePlaceholder')}
								className={errors.name ? 'border-destructive' : ''}
								required
							/>
							{errors.name && (
								<p className="text-xs text-destructive">{errors.name}</p>
							)}
						</div>
							<div className="grid gap-2">
							<Label htmlFor="type">{t('decorators.type')}</Label>
							<Input
								id="type"
								value={formData.type}
								onChange={(e) =>
									setFormData({ ...formData, type: e.target.value })
								}
								placeholder={t('decorators.typePlaceholder')}
							/>
						</div>

							<div className="grid gap-3 border-t pt-4">
								<div className="flex items-center justify-between">
								<Label>{t('decorators.properties.title')}</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addProperty}
									className="gap-2"
								>
									<Plus className="h-3 w-3" />
									{t('decorators.properties.add')}
								</Button>
							</div>

								{formData.properties.length === 0 && (
									<p className="text-sm text-muted-foreground text-center py-4">
										{t('decorators.properties.empty')}
									</p>
								)}

								{formData.properties.map((property, index) => (
									<div
										key={index}
										className="flex flex-col gap-2 bg-muted p-3 rounded-md md:grid md:grid-cols-[1fr,120px,1fr,auto] md:items-end"
									>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="flex md:hidden h-8 w-8"
											onClick={() => removeProperty(index)}
										>
											<X className="h-4 w-4 text-muted-foreground" />
										</Button>
										<div className="grid gap-1.5">
											<Label className="text-xs">
												{t('decorators.properties.name')}
											</Label>
											<Input
												value={property.name}
												onChange={(e) =>
													updateProperty(index, 'name', e.target.value)
												}
												placeholder={t('decorators.properties.namePlaceholder')}
												size="sm"
												required
											/>
										</div>

										<div className="grid gap-1.5">
											<Label className="text-xs">
												{t('decorators.properties.type')}
											</Label>
											<NativeSelect
												value={property.type}
												onChange={(e) =>
													updateProperty(index, 'type', e.target.value)
												}
											>
												{[
													{ value: 'string', label: t('decorators.types.string') },
													{ value: 'int', label: t('decorators.types.integer') },
													{ value: 'float', label: t('decorators.types.float') },
													{ value: 'bool', label: t('decorators.types.boolean') },
												].map((type) => (
													<option key={type.value} value={type.value}>
														{type.label}
													</option>
												))}
											</NativeSelect>
										</div>

										<div className="grid gap-1.5">
											<Label className="text-xs">
												{t('decorators.properties.defaultValue')}
											</Label>
											{property.type === 'bool' ? (
												<div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
													<Label className="text-xs font-medium">
														{asBoolean(property.defaultValue)
															? t('common.true')
															: t('common.false')}
													</Label>
													<Switch
														checked={asBoolean(property.defaultValue)}
														onCheckedChange={(checked) =>
															updateProperty(index, 'defaultValue', checked)
														}
													/>
												</div>
											) : (
												<Input
													value={property.defaultValue}
													onChange={(e) =>
														updateProperty(index, 'defaultValue', e.target.value)
													}
													placeholder={t('decorators.properties.placeholders.value')}
													size="sm"
												/>
											)}
										</div>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="hidden md:flex h-8 w-8"
											onClick={() => removeProperty(index)}
										>
											<X className="h-4 w-4 text-muted-foreground" />
										</Button>										
									</div>
								))}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isUpdating}
						>
							{t('common.cancel')}
						</Button>
						<Button type="submit" disabled={isUpdating || !formData.name.trim()}>
							{isUpdating ? t('common.saving') : t('common.save')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
