import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, Upload, Sparkles, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateDecoratorDialog } from '@/components/dialogs/CreateDecoratorDialog';
import { DecoratorCard } from '@/components/projects/DecoratorCard';
import { useDecoratorStore } from '@/stores/decoratorStore';
import { isMobileDevice } from '@/lib/deviceDetection';

/**
 * Decorators Section Component
 * Manages decorators within a project
 */
export function DecoratorsSection({ projectId, decorators = [] }) {
	const { t } = useTranslation();
	const { importDecorators, exportDecorators } = useDecoratorStore();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const fileInputRef = useRef(null);

	const handleExport = async () => {
		try {
			const data = await exportDecorators(projectId);
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `decorators-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to export decorators:', error);
		}
	};

	const handleImport = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setIsImporting(true);
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			await importDecorators(projectId, Array.isArray(data) ? data : [data]);
		} catch (error) {
			console.error('Failed to import decorators:', error);
		} finally {
			setIsImporting(false);
			if (fileInputRef.current) {
				fileInputRef.current.value = '';
			}
		}
	};

	return (
		<div>
			{/* Header */}
			<div className="flex items-top justify-between mb-6">
				<div>
					<h2 className="text-2xl font-bold">
						{t('decorators.title')} ({decorators.length})
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						{t('decorators.description')}
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
				{/* Mobile: Dropdown Menu */}
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
								disabled={decorators.length === 0}
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
						{!isMobileDevice && t("decorators.addNew")}
					</Button>
				</div>
				{/* Desktop: Full Buttons */}
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
						disabled={decorators.length === 0}
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
						{t('decorators.addNew')}
					</Button>
				</div>
			</div>
			</div>

			{/* Decorators Grid */}
			{decorators.length === 0 ? (
				<Card>
					<CardContent className="p-12">
						<div className="flex flex-col items-center justify-center text-center">
							<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
								<Sparkles className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-semibold mb-2">
								{t('decorators.noDecorators')}
							</h3>
							<p className="text-sm text-muted-foreground mb-4 max-w-sm">
								{t('decorators.noDecoratorsDescription')}
							</p>
							<Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
								<Plus className="h-4 w-4" />
								{t('decorators.addNew')}
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{decorators.map((decorator) => (
						<DecoratorCard key={decorator.id} decorator={decorator} />
					))}
				</div>
			)}

			{/* Create Dialog */}
			<CreateDecoratorDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				projectId={projectId}
			/>
		</div>
	);
}
