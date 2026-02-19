import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Square, Volume2, Play, CheckCircle2, CornerUpLeft, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
	getDialogueRowsForPreview,
	getSpeakerForPreview,
	isTerminalPreviewNode,
	PREVIEW_START_NODE_ID,
	collectPreviewScenarioRules,
	evaluatePreviewEdgeConditions,
	resolvePreviewAudioSource,
} from '@/lib/dialoguePreviewEngine';

const CLOSE_ANIMATION_MS = 260;
const MAX_PREVIEW_STEPS = 600;
const NODE_TRANSITION_DELAY_MS = 220;

export function DialoguePreviewOverlay({
	open,
	nodes = [],
	edges = [],
	onStop,
	onNodeFocus,
	onNodeChange,
}) {
	const { t } = useTranslation();
	const [isVisible, setIsVisible] = useState(open);
	const [isClosing, setIsClosing] = useState(false);
	const [speaker, setSpeaker] = useState('');
	const [lineText, setLineText] = useState('');
	const [choiceOptions, setChoiceOptions] = useState([]);
	const [currentNodeId, setCurrentNodeId] = useState(null);
	const [volume, setVolume] = useState(100);
	const [hasCurrentAudio, setHasCurrentAudio] = useState(false);
	const [visitedNodeIds, setVisitedNodeIds] = useState([]);
	const [selectedBranches, setSelectedBranches] = useState({});
	const [activeBranchNodeId, setActiveBranchNodeId] = useState(null);
	const [currentRowIndex, setCurrentRowIndex] = useState(0);
	const [currentRowCount, setCurrentRowCount] = useState(0);
	const [currentRowProgressPercent, setCurrentRowProgressPercent] = useState(0);
	const [scenarioRules, setScenarioRules] = useState([]);
	const [scenarioContext, setScenarioContext] = useState({});
	const [scenarioReady, setScenarioReady] = useState(false);
	const [scenarioError, setScenarioError] = useState('');

	const runtimeRef = useRef({
		timer: null,
		rowProgressTimer: null,
		stepCount: 0,
		audio: null,
		audioObjectUrl: null,
		closeTimeout: null,
		isClosingLocked: false,
	});
	const wasOpenRef = useRef(false);

	const regularNodes = useMemo(
		() => nodes.filter((node) => node?.type !== 'placeholderNode'),
		[nodes]
	);
	const regularEdges = useMemo(
		() => edges.filter((edge) => !edge?.data?.isPlaceholder),
		[edges]
	);
	const nodeMap = useMemo(
		() => new Map(regularNodes.map((node) => [node.id, node])),
		[regularNodes]
	);
	const outgoingEdgeMap = useMemo(() => {
		const map = new Map();
		regularEdges.forEach((edge) => {
			if (!map.has(edge.source)) map.set(edge.source, []);
			map.get(edge.source).push(edge);
		});
		return map;
	}, [regularEdges]);
	const getTraversableNextNodes = useCallback(
		(sourceNodeId) => {
			const edgesFromNode = outgoingEdgeMap.get(sourceNodeId) || [];
			return edgesFromNode
				.filter((edge) => evaluatePreviewEdgeConditions(edge, scenarioContext))
				.map((edge) => nodeMap.get(edge.target))
				.filter(Boolean);
		},
		[outgoingEdgeMap, scenarioContext, nodeMap]
	);
	const scenarioRuleDefinitions = useMemo(
		() => collectPreviewScenarioRules(regularEdges),
		[regularEdges]
	);
	const getStartPreviewNodeId = useCallback(
		(context) => {
			const startEdges = outgoingEdgeMap.get(PREVIEW_START_NODE_ID) || [];
			const validStartEdge = startEdges.find(
				(edge) =>
					nodeMap.has(edge.target) &&
					evaluatePreviewEdgeConditions(edge, context)
			);
			return validStartEdge?.target || null;
		},
		[outgoingEdgeMap, nodeMap]
	);
	const selectedRouteNodeIds = useMemo(() => {
		const startNodeId = getStartPreviewNodeId(scenarioContext);
		const route = [];
		const seen = new Set();
		let cursorId = startNodeId;
		let steps = 0;

		while (cursorId && nodeMap.has(cursorId) && steps < MAX_PREVIEW_STEPS && !seen.has(cursorId)) {
			route.push(cursorId);
			seen.add(cursorId);
			steps += 1;

			const node = nodeMap.get(cursorId);
			if (!node || isTerminalPreviewNode(node)) break;

			if (node.type === 'returnNode') {
				const returnTarget = node.data?.targetNode;
				if (!returnTarget || !nodeMap.has(returnTarget)) break;
				cursorId = returnTarget;
				continue;
			}

			const nextNodes = getTraversableNextNodes(cursorId);
			if (nextNodes.length === 0) break;

			if (nextNodes.length > 1 && node.type !== 'answerNode') {
				const selectedChoiceId = selectedBranches[cursorId];
				if (!selectedChoiceId || !nodeMap.has(selectedChoiceId)) break;
				cursorId = selectedChoiceId;
				continue;
			}

			cursorId = nextNodes[0].id;
		}

		return route;
	}, [nodeMap, getTraversableNextNodes, selectedBranches, scenarioContext, getStartPreviewNodeId]);

	const visitedPlayableCount = useMemo(() => {
		const reachableSet = new Set(selectedRouteNodeIds);
		return visitedNodeIds.filter((id) => reachableSet.has(id)).length;
	}, [visitedNodeIds, selectedRouteNodeIds]);

	const previewProgressPercent = useMemo(() => {
		if (selectedRouteNodeIds.length === 0) return 0;
		return Math.min(100, Math.round((visitedPlayableCount / selectedRouteNodeIds.length) * 100));
	}, [visitedPlayableCount, selectedRouteNodeIds]);

	const clearTimer = useCallback(() => {
		if (runtimeRef.current.timer) {
			window.clearTimeout(runtimeRef.current.timer);
			runtimeRef.current.timer = null;
		}
		if (runtimeRef.current.rowProgressTimer) {
			window.clearInterval(runtimeRef.current.rowProgressTimer);
			runtimeRef.current.rowProgressTimer = null;
		}
	}, []);

	const stopAudio = useCallback(() => {
		if (runtimeRef.current.audio) {
			runtimeRef.current.audio.pause();
			runtimeRef.current.audio.src = '';
			runtimeRef.current.audio = null;
		}
		if (runtimeRef.current.audioObjectUrl) {
			URL.revokeObjectURL(runtimeRef.current.audioObjectUrl);
			runtimeRef.current.audioObjectUrl = null;
		}
	}, []);

	const closePreview = useCallback(
		({ withAnimation = true } = {}) => {
			if (runtimeRef.current.isClosingLocked) return;
			runtimeRef.current.isClosingLocked = true;
			clearTimer();
			stopAudio();
			if (runtimeRef.current.closeTimeout) {
				window.clearTimeout(runtimeRef.current.closeTimeout);
				runtimeRef.current.closeTimeout = null;
			}
			setChoiceOptions([]);
			setCurrentNodeId(null);
			setLineText('');
			setSpeaker('');
			setHasCurrentAudio(false);
			setCurrentRowIndex(0);
			setCurrentRowCount(0);
			setCurrentRowProgressPercent(0);
			setSelectedBranches({});
			setActiveBranchNodeId(null);
			onNodeChange?.(null);

			if (!withAnimation) {
				setIsClosing(false);
				setIsVisible(false);
				runtimeRef.current.isClosingLocked = false;
				onStop?.({ reason: 'manual', withAnimation: false });
				return;
			}

			setIsClosing(true);
			runtimeRef.current.closeTimeout = window.setTimeout(() => {
				setIsClosing(false);
				setIsVisible(false);
				runtimeRef.current.closeTimeout = null;
				runtimeRef.current.isClosingLocked = false;
				onStop?.({ reason: 'manual', withAnimation: true });
			}, CLOSE_ANIMATION_MS);
		},
		[clearTimer, stopAudio, onStop, onNodeChange]
	);

	const buildChoiceOption = useCallback(
		(choiceNode, { available = true, isConditional = false } = {}) => {
			const nextAfterChoice = getTraversableNextNodes(choiceNode.id);
			const decoratorsCount = Array.isArray(choiceNode.data?.decorators)
				? choiceNode.data.decorators.length
				: 0;

			let outcome = 'continue';
			if (choiceNode.type === 'completeNode') {
				outcome = 'complete';
			} else if (choiceNode.type === 'returnNode') {
				outcome = 'return';
			} else if (choiceNode.type === 'openChildGraphNode') {
				outcome = 'openChildGraph';
			} else if (nextAfterChoice.length === 0) {
				outcome = 'end';
			} else if (nextAfterChoice.length === 1 && nextAfterChoice[0].type === 'completeNode') {
				outcome = 'complete';
			} else if (nextAfterChoice.length === 1 && nextAfterChoice[0].type === 'returnNode') {
				outcome = 'return';
			} else if (
				nextAfterChoice.length === 1 &&
				nextAfterChoice[0].type === 'openChildGraphNode'
			) {
				outcome = 'openChildGraph';
			}

			return {
				id: choiceNode.id,
				label:
					choiceNode.data?.selectionTitle ||
					choiceNode.data?.displayName ||
					choiceNode.data?.label ||
					t('editor.preview.choiceFallback'),
				outcome,
				decoratorsCount,
				available,
				isConditional,
			};
		},
		[getTraversableNextNodes, t]
	);

	const getBranchChoiceOptions = useCallback(
		(sourceNodeId) => {
			const outgoingEdges = outgoingEdgeMap.get(sourceNodeId) || [];
			const uniqueByTarget = new Set();
			const options = [];

			outgoingEdges.forEach((edge) => {
				const targetNode = nodeMap.get(edge.target);
				if (!targetNode) return;
				if (uniqueByTarget.has(targetNode.id)) return;
				uniqueByTarget.add(targetNode.id);

				const rules = edge?.data?.conditions?.rules;
				const isConditional = Array.isArray(rules) && rules.length > 0;
				const available = evaluatePreviewEdgeConditions(edge, scenarioContext);
				options.push(buildChoiceOption(targetNode, { available, isConditional }));
			});

			return options;
		},
		[outgoingEdgeMap, nodeMap, scenarioContext, buildChoiceOption]
	);

	const goToNode = useCallback(
		(nodeId) => {
			const node = nodeMap.get(nodeId);
			if (!node) {
				closePreview({ withAnimation: true });
				return;
			}

			runtimeRef.current.stepCount += 1;
			if (runtimeRef.current.stepCount > MAX_PREVIEW_STEPS) {
				closePreview({ withAnimation: true });
				return;
			}

			setCurrentNodeId(node.id);
			onNodeChange?.(node.id);
			onNodeFocus?.(node.id);
			if (node.id !== PREVIEW_START_NODE_ID) {
				setVisitedNodeIds((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
			}

			if (node.type === 'returnNode') {
				const targetNodeId = node.data?.targetNode;
				if (!targetNodeId || !nodeMap.has(targetNodeId)) {
					closePreview({ withAnimation: true });
					return;
				}
				runtimeRef.current.timer = window.setTimeout(() => {
					goToNode(targetNodeId);
				}, NODE_TRANSITION_DELAY_MS);
				return;
			}

			if (node.type === 'openChildGraphNode') {
				closePreview({ withAnimation: true });
				return;
			}

			if (node.type === 'delayNode') {
				const durationMs = Math.max(200, (Number(node.data?.duration) || 0.1) * 1000);
				const nextNodes = getTraversableNextNodes(node.id);
				const branchOptions = getBranchChoiceOptions(node.id);

				setSpeaker(getSpeakerForPreview(node, t));
				setLineText(
					t('editor.nodes.delayDescription', {
						count: Number(node.data?.duration) || 1,
					})
				);
				setHasCurrentAudio(false);
				setChoiceOptions([]);
				setCurrentRowCount(1);
				setCurrentRowIndex(1);
				setCurrentRowProgressPercent(0);

				const delayStart = Date.now();
				if (runtimeRef.current.rowProgressTimer) {
					window.clearInterval(runtimeRef.current.rowProgressTimer);
				}
				runtimeRef.current.rowProgressTimer = window.setInterval(() => {
					const elapsed = Date.now() - delayStart;
					const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
					setCurrentRowProgressPercent(pct);
					if (pct >= 100 && runtimeRef.current.rowProgressTimer) {
						window.clearInterval(runtimeRef.current.rowProgressTimer);
						runtimeRef.current.rowProgressTimer = null;
					}
				}, 50);

				runtimeRef.current.timer = window.setTimeout(() => {
					setCurrentRowProgressPercent(0);
					if (nextNodes.length === 0) {
						closePreview({ withAnimation: true });
						return;
					}
					if (branchOptions.length > 1) {
						setActiveBranchNodeId(node.id);
						setChoiceOptions(branchOptions);
						return;
					}
					window.setTimeout(() => {
						goToNode(nextNodes[0].id);
					}, NODE_TRANSITION_DELAY_MS);
				}, durationMs);
				return;
			}

			const rows = getDialogueRowsForPreview(node);
			const nextNodes = getTraversableNextNodes(node.id);

			const finalizeNode = () => {
				if (isTerminalPreviewNode(node)) {
					closePreview({ withAnimation: true });
					return;
				}

				const branchOptions = node.type !== 'answerNode' ? getBranchChoiceOptions(node.id) : [];
				if (branchOptions.length > 1) {
					setActiveBranchNodeId(node.id);
					setChoiceOptions(branchOptions);
					return;
				}

				if (nextNodes.length === 0) {
					closePreview({ withAnimation: true });
					return;
				}

				setCurrentRowProgressPercent(0);
				runtimeRef.current.timer = window.setTimeout(() => {
					goToNode(nextNodes[0].id);
				}, NODE_TRANSITION_DELAY_MS);
			};

			if (rows.length === 0) {
				setLineText('');
				setSpeaker(getSpeakerForPreview(node, t));
				setHasCurrentAudio(false);
				setCurrentRowIndex(0);
				setCurrentRowCount(0);
				setCurrentRowProgressPercent(0);
				setChoiceOptions([]);
				finalizeNode();
				return;
			}

			let index = 0;
			setChoiceOptions([]);
			setCurrentRowCount(rows.length);
			const renderNextRow = () => {
				const row = rows[index];
				if (!row) {
					setCurrentRowProgressPercent(0);
					finalizeNode();
					return;
				}

				stopAudio();
				setSpeaker(getSpeakerForPreview(node, t));
				setLineText(row.text || '');
				setCurrentRowIndex(index + 1);

				const audioSource = resolvePreviewAudioSource(row);
				setHasCurrentAudio(Boolean(audioSource?.url));
				if (audioSource?.url) {
					const audio = new Audio(audioSource.url);
					audio.volume = Math.max(0, Math.min(1, volume / 100));
					runtimeRef.current.audio = audio;
					if (audioSource.revokeOnCleanup) {
						runtimeRef.current.audioObjectUrl = audioSource.url;
					}
					audio.play().catch(() => {});
				}

				const durationMs = Math.max(200, (Number(row.duration) || 0.1) * 1000);
				const rowStart = Date.now();
				setCurrentRowProgressPercent(0);
				if (runtimeRef.current.rowProgressTimer) {
					window.clearInterval(runtimeRef.current.rowProgressTimer);
				}
				runtimeRef.current.rowProgressTimer = window.setInterval(() => {
					const elapsed = Date.now() - rowStart;
					const pct = Math.min(100, Math.round((elapsed / durationMs) * 100));
					setCurrentRowProgressPercent(pct);
					if (pct >= 100 && runtimeRef.current.rowProgressTimer) {
						window.clearInterval(runtimeRef.current.rowProgressTimer);
						runtimeRef.current.rowProgressTimer = null;
					}
				}, 50);

				index += 1;
				runtimeRef.current.timer = window.setTimeout(renderNextRow, durationMs);
			};

			renderNextRow();
		},
		[
			nodeMap,
			onNodeChange,
			onNodeFocus,
			getTraversableNextNodes,
			t,
			volume,
			closePreview,
			stopAudio,
			getBranchChoiceOptions,
		]
	);

	const startScenarioPreview = useCallback(() => {
		const startNodeId = getStartPreviewNodeId(scenarioContext);
		if (!startNodeId) {
			setScenarioError(t('editor.preview.invalidNoPlayablePath'));
			return;
		}
		setScenarioError('');
		setScenarioReady(true);
		runtimeRef.current.stepCount = 0;
		goToNode(startNodeId);
	}, [goToNode, getStartPreviewNodeId, scenarioContext, t]);

	useEffect(() => {
		if (!open) {
			wasOpenRef.current = false;
			if (runtimeRef.current.closeTimeout) {
				window.clearTimeout(runtimeRef.current.closeTimeout);
				runtimeRef.current.closeTimeout = null;
			}
			runtimeRef.current.isClosingLocked = false;
			setIsVisible(false);
			return;
		}
		if (wasOpenRef.current) return;
		wasOpenRef.current = true;

		setIsVisible(true);
		setIsClosing(false);
		setChoiceOptions([]);
		setHasCurrentAudio(false);
		setVisitedNodeIds([]);
		setSelectedBranches({});
		setActiveBranchNodeId(null);
		setCurrentRowIndex(0);
		setCurrentRowCount(0);
		setCurrentRowProgressPercent(0);
		setScenarioError('');
		const initialScenarioContext = scenarioRuleDefinitions.reduce((acc, rule) => {
			acc[rule.key] = true;
			return acc;
		}, {});
		const initialStartNodeId = getStartPreviewNodeId(initialScenarioContext);
		setScenarioRules(scenarioRuleDefinitions);
		setScenarioContext(initialScenarioContext);
		const hasScenarioSetup = scenarioRuleDefinitions.length > 0;
		setScenarioReady(!hasScenarioSetup);
		setCurrentNodeId(!hasScenarioSetup ? initialStartNodeId : null);
		if (!hasScenarioSetup && !initialStartNodeId) {
			closePreview({ withAnimation: true });
			return;
		}
		if (!hasScenarioSetup) {
			runtimeRef.current.stepCount = 0;
			goToNode(initialStartNodeId);
		}

		return () => {
			clearTimer();
			stopAudio();
		};
	}, [
		open,
		goToNode,
		clearTimer,
		stopAudio,
		closePreview,
		getStartPreviewNodeId,
		scenarioRuleDefinitions,
	]);

	useEffect(() => {
		if (!isVisible) return undefined;

		const handleKeyDown = (event) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				closePreview({ withAnimation: false });
			}
			if (event.key === 'Backspace') {
				const target = event.target;
				const isTyping =
					target?.tagName === 'INPUT' ||
					target?.tagName === 'TEXTAREA' ||
					target?.isContentEditable;
				if (!isTyping) {
					event.preventDefault();
					closePreview({ withAnimation: false });
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [isVisible, closePreview]);

	useEffect(() => {
		if (runtimeRef.current.audio) {
			runtimeRef.current.audio.volume = Math.max(0, Math.min(1, volume / 100));
		}
	}, [volume]);

	const scenarioSetupRequired = !scenarioReady && scenarioRules.length > 0;
	const formatScenarioValues = useCallback((values) => {
		const entries = Object.entries(values || {});
		if (entries.length === 0) return '';
		return entries.map(([key, value]) => `${key}: ${String(value)}`).join(', ');
	}, []);

	if (!isVisible) return null;

	return (
		<div className="absolute inset-0 z-40 flex items-center justify-center bg-background/45 backdrop-blur-sm">
			<div
				className={`w-full max-w-2xl mx-6 rounded-2xl border border-border/70 bg-card/95 shadow-2xl transition-all duration-300 ${
					isClosing
						? 'opacity-0 scale-[0.96] translate-y-2'
						: 'opacity-100 scale-100 translate-y-0 animate-in fade-in zoom-in-95'
				}`}
			>
				<div className="border-b border-border/60 px-6 py-4 flex items-center justify-between">
					<div className="min-w-0 flex-1 pr-4">
						<p className="text-xs uppercase tracking-wide text-muted-foreground">
							{t('editor.preview.title')}
						</p>
						<p className="text-sm font-semibold">{speaker || t('editor.preview.waiting')}</p>
						<div className="mt-2 flex items-center gap-3">
							<Progress value={previewProgressPercent} className="h-1.5" />
							<span className="text-[11px] text-muted-foreground whitespace-nowrap">
								{visitedPlayableCount}/{selectedRouteNodeIds.length || 0}
							</span>
						</div>
					</div>
					<Button
						type="button"
						variant="destructive"
						size="sm"
						className="gap-2"
						onClick={() => closePreview({ withAnimation: true })}
					>
						<Square className="h-4 w-4" />
						{t('editor.preview.stop')}
					</Button>
				</div>

				<div className="px-6 py-5 space-y-5">
					{scenarioSetupRequired && (
						<div className="rounded-xl border border-border bg-background/70 p-4 space-y-4">
							<div>
								<p className="text-sm font-semibold">Scenario Conditions</p>
								<p className="text-xs text-muted-foreground mt-1">
									Set condition results before starting preview.
								</p>
							</div>
							<div className="space-y-2 max-h-[260px] overflow-auto pr-1">
								{scenarioRules.map((rule) => {
									const valuesSummary = formatScenarioValues(rule.values);
									const enabled = Boolean(scenarioContext[rule.key]);
									return (
										<div
											key={rule.key}
											className="rounded-lg border border-border bg-card/70 p-3 flex items-center justify-between gap-3"
										>
											<div className="min-w-0">
												<p className="text-sm font-medium truncate">
													{rule.name || rule.id}
												</p>
												{valuesSummary && (
													<p className="text-xs text-muted-foreground truncate">
														{valuesSummary}
													</p>
												)}
											</div>
											<div className="flex items-center gap-2 shrink-0">
												<span className="text-xs text-muted-foreground">
													{enabled ? t('common.true') : t('common.false')}
												</span>
												<Switch
													checked={enabled}
													onCheckedChange={(checked) => {
														setScenarioError('');
														setScenarioContext((prev) => ({
															...prev,
															[rule.key]: checked,
														}));
													}}
												/>
											</div>
										</div>
									);
								})}
							</div>
							{scenarioError && (
								<p className="text-xs text-destructive">{scenarioError}</p>
							)}
							<div className="flex justify-end">
								<Button type="button" onClick={startScenarioPreview} className="gap-2">
									<Play className="h-4 w-4" />
									Start Preview
								</Button>
							</div>
						</div>
					)}

					{!scenarioSetupRequired && (
						<>
					<div className="min-h-[130px] rounded-xl border border-border bg-background/70 p-4">
						<p className="text-base leading-relaxed whitespace-pre-wrap">
							{lineText || t('editor.preview.waiting')}
						</p>
						{currentRowCount > 0 && (
							<div className="mt-4 space-y-2">
								<div className="flex items-center justify-between text-[11px] text-muted-foreground">
									<span>
										{t('editor.preview.currentRowProgress')}: {currentRowIndex}/{currentRowCount}
									</span>
									<span>{currentRowProgressPercent}%</span>
								</div>
								<Progress value={currentRowProgressPercent} className="h-1.5" />
							</div>
						)}
					</div>

					{choiceOptions.length > 0 && (
						<div className="space-y-2">
							<p className="text-sm font-medium text-muted-foreground">
								{t('editor.preview.chooseAnswer')}
							</p>
							<div className="grid gap-2">
								{choiceOptions.map((choice) => (
									<Button
										key={choice.id}
										type="button"
										variant="outline"
										disabled={!choice.available}
										className={`justify-start text-left h-auto py-2.5 ${
											!choice.available
												? 'opacity-60 cursor-not-allowed'
												: ''
										} ${
											choice.outcome === 'complete'
												? 'border-destructive/40 bg-destructive/5'
												: choice.outcome === 'end'
													? 'border-amber-500/35 bg-amber-500/5'
													: choice.outcome === 'openChildGraph'
														? 'border-cyan-500/35 bg-cyan-500/5'
													: ''
										}`}
										onClick={() => {
											if (!choice.available) return;
											setChoiceOptions([]);
											if (activeBranchNodeId) {
												setSelectedBranches((prev) => ({
													...prev,
													[activeBranchNodeId]: choice.id,
												}));
											}
											setActiveBranchNodeId(null);
											window.setTimeout(() => {
												goToNode(choice.id);
											}, NODE_TRANSITION_DELAY_MS);
										}}
									>
										<div className="w-full">
											<div className="font-medium">{choice.label}</div>
											<div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
												{choice.outcome === 'end' && (
													<span className="inline-flex items-center rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5">
														{t('editor.preview.choiceEnds')}
													</span>
												)}
												{choice.outcome === 'complete' && (
													<span className="inline-flex items-center gap-1 rounded-full border border-destructive/35 bg-destructive/10 px-2 py-0.5 text-destructive">
														<CheckCircle2 className="h-3 w-3" />
														{t('editor.preview.choiceComplete')}
													</span>
												)}
												{choice.outcome === 'return' && (
													<span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5">
														<CornerUpLeft className="h-3 w-3" />
														{t('editor.preview.choiceReturn')}
													</span>
												)}
												{choice.outcome === 'openChildGraph' && (
													<span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-2 py-0.5">
														<ExternalLink className="h-3 w-3" />
														{t('editor.preview.choiceOpenChildGraph')}
													</span>
												)}
												{choice.isConditional && (
													<span className="inline-flex items-center rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5">
														Conditional
													</span>
												)}
												{!choice.available && (
													<span className="inline-flex items-center rounded-full border border-muted-foreground/35 bg-muted px-2 py-0.5 text-muted-foreground">
														Unavailable
													</span>
												)}
												{choice.decoratorsCount > 0 && (
													<span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5">
														<Sparkles className="h-3 w-3" />
														{t('editor.preview.choiceDecorators', {
															count: choice.decoratorsCount,
														})}
													</span>
												)}
											</div>
										</div>
									</Button>
								))}
							</div>
						</div>
					)}

					<div className="rounded-xl border border-border bg-background/60 p-4">
						<div className="flex items-center gap-3">
							<Volume2 className="h-4 w-4 text-muted-foreground" />
							<Input
								type="range"
								min={0}
								max={100}
								step={1}
								value={volume}
								onChange={(event) => setVolume(Number(event.target.value))}
								disabled={!hasCurrentAudio}
								className={!hasCurrentAudio ? 'opacity-40 cursor-not-allowed' : undefined}
							/>
							<span className="text-xs w-10 text-right text-muted-foreground">{volume}%</span>
						</div>
						{currentNodeId && (
							<div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
								<Play className="h-3 w-3" />
								{t('editor.preview.activeNode')}: <code>{currentNodeId.slice(0, 8)}</code>
							</div>
						)}
					</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
