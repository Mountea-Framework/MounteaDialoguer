import { useState } from 'react';
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useDecoratorStore } from '@/stores/decoratorStore';

const PROPERTY_TYPES = [
	{ value: 'string', label: 'String' },
	{ value: 'int', label: 'Integer' },
	{ value: 'float', label: 'Float' },
	{ value: 'bool', label: 'Boolean' },
];

export function CreateDecoratorDialog({ open, onOpenChange, projectId }) {
	const { t } = useTranslation();
	const { createDecorator } = useDecoratorStore();
	const [isCreating, setIsCreating] = useState(false);
	const [formData, setFormData] = useState({
		name: '',
		type: '',
		properties: [],
	});
	const [errors, setErrors] = useState({});

	const addProperty = () => {
		setFormData({
			...formData,
			properties: [
				...formData.properties,
				{ name: '', type: 'string', defaultValue: '' },
			],
		});
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
		setFormData({
			...formData,
			properties: formData.properties.filter((_, i) => i !== index),
		});
	};

	const validate = () => {
		const newErrors = {};

		if (!formData.name.trim()) {
			newErrors.name = t('validation.required');
		} else if (/\s/.test(formData.name)) {
			newErrors.name = 'Name cannot contain whitespace';
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!validate()) return;

		setIsCreating(true);
		try {
			await createDecorator({
				...formData,
				projectId,
			});
			setFormData({ name: '', type: '', properties: [] });
			setErrors({});
			onOpenChange(false);
		} catch (error) {
			console.error('Failed to create decorator:', error);
		} finally {
			setIsCreating(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{t('decorators.addNew')}</DialogTitle>
					<DialogDescription>
						{t('decorators.createDescription')}
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
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

						{/* Properties Section */}
						<div className="grid gap-3 border-t pt-4">
							<div className="flex items-center justify-between">
								<Label>Properties</Label>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={addProperty}
									className="gap-2"
								>
									<Plus className="h-3 w-3" />
									Add Property
								</Button>
							</div>

							{formData.properties.length === 0 && (
								<p className="text-sm text-muted-foreground text-center py-4">
									No properties defined. Add properties to customize this decorator.
								</p>
							)}

							{formData.properties.map((property, index) => (
								<div
									key={index}
									className="grid grid-cols-[1fr,120px,1fr,auto] gap-2 items-end bg-muted p-3 rounded-md"
								>
									<div className="grid gap-1.5">
										<Label className="text-xs">Property Name</Label>
										<Input
											value={property.name}
											onChange={(e) =>
												updateProperty(index, 'name', e.target.value)
											}
											placeholder="e.g., Speed"
											size="sm"
											required
										/>
									</div>

									<div className="grid gap-1.5">
										<Label className="text-xs">Type</Label>
										<Select
											value={property.type}
											onValueChange={(value) =>
												updateProperty(index, 'type', value)
											}
										>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{PROPERTY_TYPES.map((type) => (
													<SelectItem key={type.value} value={type.value}>
														{type.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									</div>

									<div className="grid gap-1.5">
										<Label className="text-xs">Default Value</Label>
										<Input
											value={property.defaultValue}
											onChange={(e) =>
												updateProperty(index, 'defaultValue', e.target.value)
											}
											placeholder={
												property.type === 'bool'
													? 'true/false'
													: property.type === 'int'
													? '0'
													: property.type === 'float'
													? '0.0'
													: 'value'
											}
											size="sm"
										/>
									</div>

									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => removeProperty(index)}
										className="h-9 w-9"
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							disabled={isCreating}
						>
							{t('common.cancel')}
						</Button>
						<Button type="submit" disabled={isCreating || !formData.name.trim()}>
							{isCreating ? t('common.creating') : t('common.create')}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
