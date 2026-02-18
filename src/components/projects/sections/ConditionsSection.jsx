import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, Upload, SlidersHorizontal, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateConditionDialog } from '@/components/dialogs/CreateConditionDialog';
import { ConditionCard } from '@/components/projects/ConditionCard';
import { useConditionStore } from '@/stores/conditionStore';
import { isMobileDevice } from '@/lib/deviceDetection';

export function ConditionsSection({ projectId, conditions = [] }) {
	const { t } = useTranslation();
	const { importConditions, exportConditions } = useConditionStore();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const fileInputRef = useRef(null);
	const isMobile = isMobileDevice();

	const handleExport = async () => {
		try {
			const data = await exportConditions(projectId);
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			anchor.href = url;
			anchor.download = `conditions-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(anchor);
			anchor.click();
			document.body.removeChild(anchor);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to export conditions:', error);
		}
	};

	const handleImport = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setIsImporting(true);
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			await importConditions(projectId, Array.isArray(data) ? data : [data]);
		} catch (error) {
			console.error('Failed to import conditions:', error);
		} finally {
			setIsImporting(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	return (
		<div>
			<div className="flex items-top justify-between mb-6">
				<div>
					<h2 className="text-2xl font-bold">
						{t('conditions.title')} ({conditions.length})
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						{t('conditions.description')}
					</p>
				</div>
				<div className="flex gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept=".json"
						onChange={handleImport}
						className="hidden"
					/>
					<div className="md:hidden flex gap-2 flex-1">
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="icon" className="rounded-full">
									<MoreVertical className="h-4 w-4" />
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									onClick={() => fileInputRef.current?.click()}
									disabled={isImporting}
								>
									<Upload className="h-4 w-4 mr-2" />
									{t('common.import')}
								</DropdownMenuItem>
								<DropdownMenuItem
									onClick={handleExport}
									disabled={conditions.length === 0}
								>
									<Download className="h-4 w-4 mr-2" />
									{t('common.export')}
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<Button
							size="icon"
							onClick={() => setIsCreateDialogOpen(true)}
							className="gap-2 flex-1 rounded-full"
						>
							<Plus className="h-4 w-4" />
							{!isMobile && t('conditions.addNew')}
						</Button>
					</div>
					<div className="hidden md:flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => fileInputRef.current?.click()}
							disabled={isImporting}
							className="gap-2"
						>
							<Upload className="h-4 w-4" />
							{t('common.import')}
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={handleExport}
							disabled={conditions.length === 0}
							className="gap-2"
						>
							<Download className="h-4 w-4" />
							{t('common.export')}
						</Button>
						<Button
							size="sm"
							onClick={() => setIsCreateDialogOpen(true)}
							className="gap-2"
						>
							<Plus className="h-4 w-4" />
							{t('conditions.addNew')}
						</Button>
					</div>
				</div>
			</div>

			{conditions.length === 0 ? (
				<Card>
					<CardContent className="p-12">
						<div className="flex flex-col items-center justify-center text-center">
							<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
								<SlidersHorizontal className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-semibold mb-2">{t('conditions.noConditions')}</h3>
							<p className="text-sm text-muted-foreground mb-4 max-w-sm">
								{t('conditions.noConditionsDescription')}
							</p>
							<Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
								<Plus className="h-4 w-4" />
								{t('conditions.addNew')}
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{conditions.map((condition) => (
						<ConditionCard key={condition.id} condition={condition} />
					))}
				</div>
			)}

			<CreateConditionDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				projectId={projectId}
			/>
		</div>
	);
}
