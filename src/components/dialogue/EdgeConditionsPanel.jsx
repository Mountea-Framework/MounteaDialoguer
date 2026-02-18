import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect } from '@/components/ui/native-select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2 } from 'lucide-react';
import {
	createConditionInstance,
	getConditionDefaultValues,
} from '@/config/edgeConditions';

const asBoolean = (value) => {
	if (typeof value === 'boolean') return value;
	if (typeof value === 'string') return value.toLowerCase() === 'true';
	return Boolean(value);
};

export function EdgeConditionsPanel({
	conditionGroup,
	availableConditions = [],
	onChange,
}) {
	const { t } = useTranslation();
	const [selectedConditionId, setSelectedConditionId] = useState('');

	const normalizedGroup = useMemo(
		() => ({
			mode: conditionGroup?.mode === 'any' ? 'any' : 'all',
			rules: Array.isArray(conditionGroup?.rules) ? conditionGroup.rules : [],
		}),
		[conditionGroup]
	);

	const updateGroup = (next) => {
		onChange?.({
			mode: next?.mode === 'any' ? 'any' : 'all',
			rules: Array.isArray(next?.rules) ? next.rules : [],
		});
	};

	const updateRuleValue = (index, propName, value) => {
		const nextRules = [...normalizedGroup.rules];
		const targetRule = nextRules[index];
		if (!targetRule) return;

		nextRules[index] = {
			...targetRule,
			values: {
				...(targetRule.values || {}),
				[propName]: value,
			},
		};
		updateGroup({ ...normalizedGroup, rules: nextRules });
	};

	const addRule = () => {
		if (!selectedConditionId) return;
		const definition = availableConditions.find((item) => item.id === selectedConditionId);
		if (!definition) return;

		updateGroup({
			...normalizedGroup,
			rules: [...normalizedGroup.rules, createConditionInstance(definition)],
		});
		setSelectedConditionId('');
	};

	const removeRule = (index) => {
		updateGroup({
			...normalizedGroup,
			rules: normalizedGroup.rules.filter((_, idx) => idx !== index),
		});
	};

	const toggleNegate = (index, checked) => {
		const nextRules = [...normalizedGroup.rules];
		const targetRule = nextRules[index];
		if (!targetRule) return;
		nextRules[index] = {
			...targetRule,
			negate: checked,
		};
		updateGroup({ ...normalizedGroup, rules: nextRules });
	};

	return (
		<div className="space-y-4">
			<div className="grid gap-2">
				<Label>{t('editor.conditions.passWhen')}</Label>
				<NativeSelect
					value={normalizedGroup.mode}
					onChange={(event) =>
						updateGroup({ ...normalizedGroup, mode: event.target.value })
					}
				>
					<option value="all">{t('editor.conditions.modeAll')}</option>
					<option value="any">{t('editor.conditions.modeAny')}</option>
				</NativeSelect>
			</div>

			{normalizedGroup.rules.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{t('editor.conditions.empty')}
				</p>
			) : (
				<div className="space-y-3">
					{normalizedGroup.rules.map((rule, index) => {
						const definition = availableConditions.find((item) => item.id === rule.id);
						const properties = definition?.properties || [];
						const values = {
							...getConditionDefaultValues(definition),
							...(rule.values || {}),
						};

						return (
							<div
								key={`${rule.id}-${index}`}
								className="rounded-lg border border-border p-3 space-y-3 bg-card"
							>
								<div className="flex items-center justify-between gap-2">
									<div>
										<p className="text-sm font-semibold">{rule.name || rule.id}</p>
										{definition?.description && (
											<p className="text-xs text-muted-foreground">
												{definition.description}
											</p>
										)}
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 shrink-0"
										onClick={() => removeRule(index)}
									>
										<Trash2 className="h-3.5 w-3.5 text-destructive" />
									</Button>
								</div>

								<div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
									<Label className="text-sm">{t('editor.conditions.negate')}</Label>
									<Switch
										checked={asBoolean(rule.negate)}
										onCheckedChange={(checked) => toggleNegate(index, checked)}
									/>
								</div>

								{properties.map((property) => (
									<div key={property.name} className="space-y-2">
										<Label>
											{property.name}
											<span className="ml-2 text-xs text-muted-foreground">
												({property.type})
											</span>
										</Label>

										{property.type === 'string' && (
											<Input
												value={values[property.name] ?? ''}
												onChange={(event) =>
													updateRuleValue(index, property.name, event.target.value)
												}
											/>
										)}

										{(property.type === 'int' || property.type === 'float') && (
											<Input
												type="number"
												step={property.type === 'int' ? 1 : 0.01}
												value={values[property.name] ?? 0}
												onChange={(event) => {
													const raw = event.target.value;
													const parsed =
														property.type === 'int'
															? parseInt(raw, 10)
															: parseFloat(raw);
													updateRuleValue(
														index,
														property.name,
														Number.isNaN(parsed) ? 0 : parsed
													);
												}}
											/>
										)}

										{property.type === 'bool' && (
											<div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
												<Label className="text-sm font-medium">
													{asBoolean(values[property.name])
														? t('common.true')
														: t('common.false')}
												</Label>
												<Switch
													checked={asBoolean(values[property.name])}
													onCheckedChange={(checked) =>
														updateRuleValue(index, property.name, checked)
													}
												/>
											</div>
										)}
									</div>
								))}
							</div>
						);
					})}
				</div>
			)}

			<div className="flex gap-2">
				<NativeSelect
					value={selectedConditionId}
					onChange={(event) => setSelectedConditionId(event.target.value)}
					className="flex-1"
				>
					<option value="">{t('editor.conditions.selectPlaceholder')}</option>
					{availableConditions.map((condition) => (
						<option key={condition.id} value={condition.id}>
							{condition.name}
						</option>
					))}
				</NativeSelect>
				<Button
					variant="outline"
					size="sm"
					onClick={addRule}
					disabled={!selectedConditionId}
					className="gap-2 shrink-0"
				>
					<Plus className="h-3.5 w-3.5" />
					{t('common.add')}
				</Button>
			</div>
		</div>
	);
}
