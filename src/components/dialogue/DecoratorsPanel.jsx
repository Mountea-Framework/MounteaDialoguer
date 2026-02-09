import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, Trash2, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

/**
 * DecoratorsPanel Component
 * Displays and manages decorators for a node with collapsible design
 */
export function DecoratorsPanel({
	decorators = [],
	availableDecorators = [],
	onAddDecorator,
	onRemoveDecorator,
	onUpdateDecorator,
}) {
	const { t } = useTranslation();
	const [expandedDecorators, setExpandedDecorators] = useState(new Set([0]));
	const [selectedDecoratorId, setSelectedDecoratorId] = useState('');

	const toggleDecorator = (index) => {
		const newExpanded = new Set(expandedDecorators);
		if (newExpanded.has(index)) {
			newExpanded.delete(index);
		} else {
			newExpanded.add(index);
		}
		setExpandedDecorators(newExpanded);
	};

	const handleAddDecorator = () => {
		if (!selectedDecoratorId) return;

		const decoratorDef = availableDecorators.find((d) => d.id === selectedDecoratorId);
		if (decoratorDef) {
			onAddDecorator(decoratorDef);
			setSelectedDecoratorId('');
			// Expand the newly added decorator
			setExpandedDecorators(new Set([...expandedDecorators, decorators.length]));
		}
	};

	const updateDecoratorValue = (index, propName, value) => {
		const decorator = decorators[index];
		const updatedValues = { ...decorator.values, [propName]: value };
		onUpdateDecorator(index, updatedValues);
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-bold">{t('decorators.panelTitle')}</Label>
				<span className="text-xs text-muted-foreground">
					{t('decorators.count', { count: decorators.length })}
				</span>
			</div>

			{decorators.length === 0 ? (
				<div className="text-center py-6 border border-dashed border-border rounded-lg">
					<p className="text-sm text-muted-foreground mb-3">
						{t('decorators.none')}
					</p>
				</div>
			) : (
				<div className="space-y-2">
					{decorators.map((decorator, index) => {
						const isExpanded = expandedDecorators.has(index);
						const decoratorDef = availableDecorators.find((d) => d.id === decorator.id);
						const hasProperties =
							decoratorDef?.properties && decoratorDef.properties.length > 0;

						return (
							<div
								key={`${decorator.id}-${index}`}
								className="border border-border rounded-lg overflow-hidden bg-card"
							>
								{/* Decorator Header */}
								<div
									className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
									onClick={() => toggleDecorator(index)}
								>
									<div className="flex items-center gap-2 flex-1 min-w-0">
										{isExpanded ? (
											<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
										) : (
											<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
										)}
										<span className="text-xs font-medium text-muted-foreground shrink-0">
											[{index}]
										</span>
										<div className="flex items-center gap-1.5 flex-1 min-w-0">
											<Tag className="h-3.5 w-3.5 text-primary shrink-0" />
											<span className="text-sm font-medium truncate">
												{decorator.name || t('decorators.unnamed')}
											</span>
										</div>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 shrink-0"
										onClick={(e) => {
											e.stopPropagation();
											onRemoveDecorator(index);
										}}
									>
										<Trash2 className="h-3.5 w-3.5 text-destructive" />
									</Button>
								</div>

								{/* Decorator Content */}
								{isExpanded && hasProperties && (
									<div className="p-4 pt-0 space-y-4 border-t border-border">
										{decoratorDef.properties.map((prop) => (
											<div key={prop.name} className="space-y-2">
												<Label htmlFor={`${decorator.id}-${index}-${prop.name}`}>
													{prop.name}
													<span className="ml-2 text-xs text-muted-foreground">
														({prop.type})
													</span>
												</Label>

												{prop.type === 'string' && (
													<Input
														id={`${decorator.id}-${index}-${prop.name}`}
														value={decorator.values[prop.name] || ''}
														onChange={(e) =>
															updateDecoratorValue(
																index,
																prop.name,
																e.target.value
															)
														}
														placeholder={t('decorators.enterProperty', {
															name: prop.name,
														})}
													/>
												)}

												{prop.type === 'number' && (
													<Input
														id={`${decorator.id}-${index}-${prop.name}`}
														type="number"
														value={decorator.values[prop.name] || 0}
														onChange={(e) =>
															updateDecoratorValue(
																index,
																prop.name,
																parseFloat(e.target.value) || 0
															)
														}
														placeholder={t('decorators.enterProperty', {
															name: prop.name,
														})}
													/>
												)}

												{prop.type === 'boolean' && (
													<Select
														value={
															decorator.values[prop.name]?.toString() || 'false'
														}
														onValueChange={(value) =>
															updateDecoratorValue(
																index,
																prop.name,
																value === 'true'
															)
														}
													>
														<SelectTrigger>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="true">
																{t('common.true')}
															</SelectItem>
															<SelectItem value="false">
																{t('common.false')}
															</SelectItem>
														</SelectContent>
													</Select>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Add Decorator */}
			<div className="flex gap-2">
				<Select value={selectedDecoratorId} onValueChange={setSelectedDecoratorId}>
					<SelectTrigger className="flex-1">
						<SelectValue placeholder={t('decorators.selectPlaceholder')} />
					</SelectTrigger>
					<SelectContent>
						{availableDecorators.map((decorator) => (
							<SelectItem key={decorator.id} value={decorator.id}>
								{decorator.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button
					variant="outline"
					size="sm"
					onClick={handleAddDecorator}
					disabled={!selectedDecoratorId}
					className="gap-2 shrink-0"
				>
					<Plus className="h-3.5 w-3.5" />
					{t('common.add')}
				</Button>
			</div>
		</div>
	);
}
