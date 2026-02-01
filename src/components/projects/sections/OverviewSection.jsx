import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { Download, Upload, Trash2, Edit3, ArrowRight, MessageCircle, FolderOpen, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { formatDate, formatDistanceToNow } from '@/lib/dateUtils';

/**
 * Overview Section Component
 * Shows project overview with metrics, recent dialogues, and metadata
 */
export function OverviewSection({
	project,
	dialogues = [],
	participants = [],
	categories = [],
	decorators = [],
	onExport,
	onImport,
	onDelete,
	onSectionChange,
	fileInputRef,
	isImporting = false,
}) {
	const { t } = useTranslation();

	// Calculate metrics
	const totalNodes = dialogues.reduce((sum, d) => sum + (d.nodeCount || 0), 0);
	const recentDialogues = [...dialogues]
		.sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
		.slice(0, 5);

	return (
		<div>
			{/* Breadcrumbs */}
			<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-4">
				<Link to="/" className="hover:text-primary cursor-pointer">
					{t('projects.title')}
				</Link>
				<ArrowRight className="h-3 w-3" />
				<span className="text-foreground">{project.name}</span>
			</div>

			{/* Project Header */}
			<div className="flex items-start justify-between mb-10">
				<div className="group flex-1">
					<label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
						{t('projects.projectName')}
					</label>
					<div className="flex items-center gap-3">
						<h1 className="text-4xl font-bold tracking-tight">{project.name}</h1>
						{project.version && (
							<Badge variant="success">v{project.version}</Badge>
						)}
						<button
							onClick={() => onSectionChange?.('settings')}
							className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-primary transition-all"
							title="Project Settings"
						>
							<Edit3 className="h-5 w-5" />
						</button>
					</div>
					{project.description && (
						<p className="mt-3 text-lg text-muted-foreground leading-relaxed max-w-2xl">
							{project.description}
						</p>
					)}
				</div>
				<div className="flex gap-2">
					<input
						ref={fileInputRef}
						type="file"
						accept=".mnteadlgproj"
						onChange={onImport}
						className="hidden"
					/>
					<Button
						variant="outline"
						size="sm"
						onClick={() => fileInputRef?.current?.click()}
						disabled={isImporting}
						className="gap-2"
					>
						<Upload className="h-4 w-4" />
						{t('common.import')}
					</Button>
					<Button variant="outline" size="sm" onClick={onExport} className="gap-2">
						<Download className="h-4 w-4" />
						{t('common.export')}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onDelete}
						className="gap-2 text-destructive hover:text-destructive hover:border-destructive/50"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Metrics Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-primary">
								<FolderOpen className="h-5 w-5" />
							</div>
							<Badge variant="success" className="text-[10px]">Active</Badge>
						</div>
						<div>
							<p className="text-muted-foreground text-sm font-medium">File Size</p>
							<h3 className="text-2xl font-bold mt-1">--</h3>
							<p className="text-xs text-muted-foreground mt-2">{totalNodes} {t('dialogues.nodes')}</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
								<Clock className="h-5 w-5" />
							</div>
						</div>
						<div>
							<p className="text-muted-foreground text-sm font-medium">{t('projects.modified')}</p>
							<h3 className="text-2xl font-bold mt-1">{formatDistanceToNow(project.modifiedAt)}</h3>
							<p className="text-xs text-muted-foreground mt-2">By Current User</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-start justify-between mb-4">
							<div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
								<Calendar className="h-5 w-5" />
							</div>
						</div>
						<div>
							<p className="text-muted-foreground text-sm font-medium">{t('projects.created')}</p>
							<h3 className="text-2xl font-bold mt-1">{formatDate(project.createdAt)}</h3>
							<p className="text-xs text-muted-foreground mt-2">
								{project.version ? `Version ${project.version}` : 'v1.0.0'}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Two Column Layout */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Recent Dialogues - 2 columns */}
				<div className="lg:col-span-2 space-y-6">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-bold">{t('dialogues.title')}</h2>
						<button
							onClick={() => onSectionChange?.('dialogues')}
							className="text-sm text-primary hover:text-blue-600 font-medium flex items-center gap-1 transition-colors"
						>
							View All <ArrowRight className="h-4 w-4" />
						</button>
					</div>

					<Card>
						<CardContent className="p-0">
							{recentDialogues.length === 0 ? (
								<div className="p-8 text-center">
									<MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
									<p className="text-sm text-muted-foreground">{t('dialogues.noDialogues')}</p>
								</div>
							) : (
								<>
									<div className="divide-y divide-border">
										{recentDialogues.map((dialogue) => (
											<Link
												key={dialogue.id}
												to="/projects/$projectId/dialogue/$dialogueId"
												params={{ projectId: project.id, dialogueId: dialogue.id }}
												className="p-4 flex items-center justify-between group hover:bg-accent transition-colors cursor-pointer hover:rounded-lg rounded-lg"
											>
												<div className="flex items-center gap-4">
													<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-blue-500">
														<MessageCircle className="h-5 w-5" />
													</div>
													<div>
														<h4 className="font-medium">{dialogue.name}</h4>
														<p className="text-xs text-muted-foreground">
															{formatDistanceToNow(dialogue.modifiedAt)} • {dialogue.nodeCount || 0} {t('dialogues.nodes')}
														</p>
													</div>
												</div>
												<button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-card shadow-sm border border-border text-primary hover:bg-primary hover:text-primary-foreground transition-all">
													<Edit3 className="h-4 w-4" />
												</button>
											</Link>
										))}
									</div>
									<div className="bg-muted/50 px-4 py-3 border-t border-border text-center">
										<button className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
											+ {t('dialogues.createNew')}
										</button>
									</div>
								</>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar - 1 column */}
				<div className="space-y-6">
					{/* Project Metadata */}
					<Card>
						<CardContent className="p-6">
							<h3 className="text-sm font-bold uppercase tracking-wider mb-4">Project Metadata</h3>
							<div className="space-y-4">
								<div>
									<p className="text-xs text-muted-foreground mb-1">Project ID</p>
									<div className="flex items-center justify-between bg-muted/50 p-2 rounded-lg border border-border">
										<code className="text-xs font-mono">{project.id.substring(0, 12)}...</code>
										<button className="text-muted-foreground hover:text-primary text-xs">📋</button>
									</div>
								</div>
								<div className="pt-2 border-t border-border">
									<div className="flex justify-between items-center text-xs mb-2">
										<span className="text-muted-foreground">{t('dialogues.title')}</span>
										<span className="font-medium">{dialogues.length}</span>
									</div>
									<div className="flex justify-between items-center text-xs mb-2">
										<span className="text-muted-foreground">{t('participants.title')}</span>
										<span className="font-medium">{participants.length}</span>
									</div>
									<div className="flex justify-between items-center text-xs mb-2">
										<span className="text-muted-foreground">{t('categories.title')}</span>
										<span className="font-medium">{categories.length}</span>
									</div>
									<div className="flex justify-between items-center text-xs">
										<span className="text-muted-foreground">{t('decorators.title')}</span>
										<span className="font-medium">{decorators.length}</span>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* Top Participants */}
					{participants.length > 0 && (
						<Card>
							<CardContent className="p-6">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-sm font-bold uppercase tracking-wider">Top Participants</h3>
									<button
										onClick={() => onSectionChange?.('participants')}
										className="text-xs text-primary hover:underline"
									>
										Manage
									</button>
								</div>
								<div className="flex -space-x-2 overflow-hidden mb-3">
									{participants.slice(0, 4).map((participant) => (
										<div
											key={participant.id}
											className="inline-block h-8 w-8 rounded-full ring-2 ring-card bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold"
										>
											{participant.name.charAt(0).toUpperCase()}
										</div>
									))}
									{participants.length > 4 && (
										<div className="h-8 w-8 rounded-full ring-2 ring-card bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
											+{participants.length - 4}
										</div>
									)}
								</div>
								<p className="text-xs text-muted-foreground">
									{participants.length} {participants.length === 1 ? 'participant' : 'participants'} in this project.
								</p>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
