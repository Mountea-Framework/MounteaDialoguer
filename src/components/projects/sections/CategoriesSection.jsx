import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Download, Upload, Tag, MoreVertical, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CreateCategoryDialog } from '@/components/dialogs/CreateCategoryDialog';
import { CategoryCard } from '@/components/projects/CategoryCard';
import { useCategoryStore } from '@/stores/categoryStore';
import { isMobileDevice } from '@/lib/deviceDetection';

/**
 * Categories Section Component
 * Manages categories within a project
 */
export function CategoriesSection({ projectId, categories = [] }) {
	const { t } = useTranslation();
	const { importCategories, exportCategories } = useCategoryStore();
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const fileInputRef = useRef(null);
	const isMobile = isMobileDevice();
	const [collapsedCategories, setCollapsedCategories] = useState(new Set());

	const childrenByParent = new Map();
	categories.forEach((category) => {
		const parentId = category.parentCategoryId || null;
		if (!childrenByParent.has(parentId)) {
			childrenByParent.set(parentId, []);
		}
		childrenByParent.get(parentId).push(category);
	});

	const rootCategories = (childrenByParent.get(null) || []).slice().sort((a, b) =>
		a.name.localeCompare(b.name)
	);

	const toggleCategory = (categoryId) => {
		setCollapsedCategories((prev) => {
			const next = new Set(prev);
			if (next.has(categoryId)) {
				next.delete(categoryId);
			} else {
				next.add(categoryId);
			}
			return next;
		});
	};

	const renderCategoryNode = (node) => {
		const nodeChildren = (childrenByParent.get(node.id) || [])
			.slice()
			.sort((a, b) => a.name.localeCompare(b.name));
		const isCollapsed = collapsedCategories.has(node.id);

		return (
			<div key={node.id} className="border border-border rounded-lg overflow-hidden bg-card">
				<div
					className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
					onClick={() => toggleCategory(node.id)}
				>
					<div className="flex items-center gap-2 min-w-0">
						{isCollapsed ? (
							<ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
						) : (
							<ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
						)}
						<span className="text-sm font-semibold truncate">{node.name}</span>
					</div>
				</div>

				{!isCollapsed && (
					<div className="p-4 pt-4 space-y-5 border-t border-border">
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							<CategoryCard category={node} />
						</div>

						{nodeChildren.length > 0 && (
							<div className="space-y-5 pl-4 -ml-4 border-l border-border/60">
								{nodeChildren.map((child) => renderCategoryNode(child))}
							</div>
						)}
					</div>
				)}
			</div>
		);
	};

	const handleExport = async () => {
		try {
			const data = await exportCategories(projectId);
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: 'application/json',
			});
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `categories-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to export categories:', error);
		}
	};

	const handleImport = async (event) => {
		const file = event.target.files?.[0];
		if (!file) return;

		setIsImporting(true);
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			await importCategories(projectId, Array.isArray(data) ? data : [data]);
		} catch (error) {
			console.error('Failed to import categories:', error);
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
						{t('categories.title')} ({categories.length})
					</h2>
					<p className="text-sm text-muted-foreground mt-1">
						{t('categories.description')}
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
								disabled={categories.length === 0}
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
						{!isMobile && t("categories.addNew")}
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
						disabled={categories.length === 0}
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
						{t('categories.addNew')}
					</Button>
				</div>
			</div>
			</div>

			{/* Categories Grid */}
			{categories.length === 0 ? (
				<Card>
					<CardContent className="p-12">
						<div className="flex flex-col items-center justify-center text-center">
							<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
								<Tag className="h-8 w-8 text-muted-foreground" />
							</div>
							<h3 className="text-lg font-semibold mb-2">
								{t('categories.noCategories')}
							</h3>
							<p className="text-sm text-muted-foreground mb-4 max-w-sm">
								{t('categories.noCategoriesDescription')}
							</p>
							<Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
								<Plus className="h-4 w-4" />
								{t('categories.addNew')}
							</Button>
						</div>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-6">
					{rootCategories.map((category) => renderCategoryNode(category))}
				</div>
			)}

			{/* Create Dialog */}
			<CreateCategoryDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				projectId={projectId}
			/>
		</div>
	);
}
