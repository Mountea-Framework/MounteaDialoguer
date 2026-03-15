import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Square, Volume2, Play, CheckCircle2, CornerUpLeft, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	getDialogueRowsForPreview,
	getSpeakerForPreview,
	isTerminalPreviewNode,
	PREVIEW_START_NODE_ID,
	collectPreviewScenarioRules,
	evaluatePreviewEdgeConditions,
	resolvePreviewAudioSource,
	getPreviewNodesAndEdges,
	createPreviewNodeRefKey,
} from '@/lib/dialoguePreviewEngine';
import { resolveParticipantThumbnailDataUrl } from '@/lib/participantThumbnails';

const CLOSE_ANIMATION_MS = 260;
const MAX_PREVIEW_STEPS = 600;
const NODE_TRANSITION_DELAY_MS = 220;

const buildPreviewGraphRuntime = (nodes = [], edges = []) => {
	const { regularNodes, regularEdges } = getPreviewNodesAndEdges(nodes, edges);
	const nodeMap = new Map(regularNodes.map((node) => [node.id, node]));
	const outgoingEdgeMap = new Map();

	regularEdges.forEach((edge) => {
		if (!edge?.source || !edge?.target) return;
		if (!outgoingEdgeMap.has(edge.source)) {
			outgoingEdgeMap.set(edge.source, []);
		}
		outgoingEdgeMap.get(edge.source).push(edge);
	});

	return {
		regularNodes,
		regularEdges,
		nodeMap,
		outgoingEdgeMap,
		scenarioRules: collectPreviewScenarioRules(regularEdges),
	};
};

const mergeScenarioRulesFromGraphCache = (graphCache = {}) => {
	const seen = new Set();
	const merged = [];

	Object.values(graphCache).forEach((graph) => {
		const rules = Array.isArray(graph?.scenarioRules) ? graph.scenarioRules : [];
		rules.forEach((rule) => {
			if (!rule?.key || seen.has(rule.key)) return;
			seen.add(rule.key);
			merged.push(rule);
		});
	});

	return merged;
};

const buildNodeRef = (dialogueId, nodeId) => ({
	dialogueId: String(dialogueId || '').trim(),
	nodeId: String(nodeId || '').trim(),
});

const getNodeRefKey = (nodeRef) => createPreviewNodeRefKey(nodeRef);

export function DialoguePreviewOverlay({
	open,
	nodes = [],
	edges = [],
	participants = [],
	rootDialogueId = '',
	loadDialogueGraphForPreview,
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
	const [currentNodeRef, setCurrentNodeRef] = useState(null);
	const [volume, setVolume] = useState(100);
	const [hasCurrentAudio, setHasCurrentAudio] = useState(false);
	const [visitedNodeKeys, setVisitedNodeKeys] = useState([]);
	const [selectedBranches, setSelectedBranches] = useState({});
	const [activeBranchNodeRef, setActiveBranchNodeRef] = useState(null);
	const [currentRowIndex, setCurrentRowIndex] = useState(0);
	const [currentRowCount, setCurrentRowCount] = useState(0);
	const [currentRowProgressPercent, setCurrentRowProgressPercent] = useState(0);
	const [graphCache, setGraphCache] = useState({});
	const [scenarioRules, setScenarioRules] = useState([]);
	const [scenarioContext, setScenarioContext] = useState({});
	const [scenarioReady, setScenarioReady] = useState(false);
	const [scenarioError, setScenarioError] = useState('');

	const nodesRef = useRef(nodes);
	const edgesRef = useRef(edges);
	const graphCacheRef = useRef({});
	const scenarioContextRef = useRef({});
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

	const safeRootDialogueId = useMemo(() => String(rootDialogueId || '').trim(), [rootDialogueId]);
	const currentNodeId = currentNodeRef?.nodeId || null;

	const getGraphRuntime = useCallback((dialogueId) => {
		const key = String(dialogueId || '').trim();
		if (!key) return null;
		return graphCacheRef.current[key] || null;
	}, []);

	const getTraversableNextNodeRefs = useCallback(
		(sourceRef) => {
			const sourceDialogueId = String(sourceRef?.dialogueId || '').trim();
			const sourceNodeId = String(sourceRef?.nodeId || '').trim();
			if (!sourceDialogueId || !sourceNodeId) return [];

			const graph = getGraphRuntime(sourceDialogueId);
			if (!graph) return [];

			const edgesFromNode = graph.outgoingEdgeMap.get(sourceNodeId) || [];
			return edgesFromNode
				.filter((edge) => evaluatePreviewEdgeConditions(edge, scenarioContextRef.current))
				.map((edge) => {
					if (!graph.nodeMap.has(edge.target)) return null;
					return buildNodeRef(sourceDialogueId, edge.target);
				})
				.filter(Boolean);
		},
		[getGraphRuntime]
	);

	const getStartPreviewNodeRef = useCallback(
		(dialogueId, context) => {
			const graph = getGraphRuntime(dialogueId);
			if (!graph) return null;

			const startEdges = graph.outgoingEdgeMap.get(PREVIEW_START_NODE_ID) || [];
			const validStartEdge = startEdges.find(
				(edge) =>
					graph.nodeMap.has(edge.target) &&
					evaluatePreviewEdgeConditions(edge, context)
			);

			return validStartEdge
				? buildNodeRef(dialogueId, validStartEdge.target)
				: null;
		},
		[getGraphRuntime]
	);

	const selectedRouteNodeKeys = useMemo(() => {
		const route = [];
		const seen = new Set();
		let cursorRef = getStartPreviewNodeRef(safeRootDialogueId, scenarioContext);
		let steps = 0;

		while (cursorRef && steps < MAX_PREVIEW_STEPS) {
			const cursorKey = getNodeRefKey(cursorRef);
			if (!cursorKey || seen.has(cursorKey)) break;

			const graph = graphCache[cursorRef.dialogueId];
			if (!graph || !graph.nodeMap.has(cursorRef.nodeId)) break;
			const node = graph.nodeMap.get(cursorRef.nodeId);

			route.push(cursorKey);
			seen.add(cursorKey);
			steps += 1;

			if (!node || isTerminalPreviewNode(node)) break;

			if (node.type === 'returnNode') {
				const returnTarget = String(node.data?.targetNode || '').trim();
				if (!returnTarget || !graph.nodeMap.has(returnTarget)) break;
				cursorRef = buildNodeRef(cursorRef.dialogueId, returnTarget);
				continue;
			}

			if (node.type === 'openChildGraphNode') {
				const targetDialogueId = String(node.data?.targetDialogue || '').trim();
				const childStartRef = getStartPreviewNodeRef(targetDialogueId, scenarioContext);
				if (!childStartRef) break;
				cursorRef = childStartRef;
				continue;
			}

			const nextNodeRefs = getTraversableNextNodeRefs(cursorRef);
			if (nextNodeRefs.length === 0) break;

			if (nextNodeRefs.length > 1 && node.type !== 'answerNode') {
				const selectedKey = selectedBranches[cursorKey];
				const selectedRef = nextNodeRefs.find((ref) => getNodeRefKey(ref) === selectedKey);
				if (!selectedRef) break;
				cursorRef = selectedRef;
				continue;
			}

			cursorRef = nextNodeRefs[0];
		}

		return route;
	}, [
		safeRootDialogueId,
		scenarioContext,
		graphCache,
		getStartPreviewNodeRef,
		getTraversableNextNodeRefs,
		selectedBranches,
	]);

	const visitedPlayableCount = useMemo(() => {
		const reachableSet = new Set(selectedRouteNodeKeys);
		return visitedNodeKeys.filter((key) => reachableSet.has(key)).length;
	}, [visitedNodeKeys, selectedRouteNodeKeys]);

	const previewProgressPercent = useMemo(() => {
		if (selectedRouteNodeKeys.length === 0) return 0;
		return Math.min(100, Math.round((visitedPlayableCount / selectedRouteNodeKeys.length) * 100));
	}, [visitedPlayableCount, selectedRouteNodeKeys]);

	const participantThumbnailByName = useMemo(() => {
		const map = new Map();
		participants.forEach((participant) => {
			const name = String(participant?.name || '').trim();
			if (!name || map.has(name)) return;
			const thumbnailUrl = resolveParticipantThumbnailDataUrl(participant?.thumbnail);
			if (thumbnailUrl) {
				map.set(name, thumbnailUrl);
			}
		});
		return map;
	}, [participants]);

	const speakerThumbnailUrl = useMemo(() => {
		const speakerName = String(speaker || '').trim();
		if (!speakerName) return '';
		return participantThumbnailByName.get(speakerName) || '';
	}, [participantThumbnailByName, speaker]);

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
			setCurrentNodeRef(null);
			setLineText('');
			setSpeaker('');
			setHasCurrentAudio(false);
			setCurrentRowIndex(0);
			setCurrentRowCount(0);
			setCurrentRowProgressPercent(0);
			setSelectedBranches({});
			setActiveBranchNodeRef(null);
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
		(choiceRef, { available = true, isConditional = false } = {}) => {
			const graph = getGraphRuntime(choiceRef?.dialogueId);
			const choiceNode = graph?.nodeMap.get(choiceRef?.nodeId);
			if (!choiceNode) return null;

			const nextAfterChoice = getTraversableNextNodeRefs(choiceRef);
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
			} else if (nextAfterChoice.length === 1) {
				const nextRef = nextAfterChoice[0];
				const nextGraph = getGraphRuntime(nextRef.dialogueId);
				const nextNode = nextGraph?.nodeMap.get(nextRef.nodeId);
				if (nextNode?.type === 'completeNode') {
					outcome = 'complete';
				} else if (nextNode?.type === 'returnNode') {
					outcome = 'return';
				} else if (nextNode?.type === 'openChildGraphNode') {
					outcome = 'openChildGraph';
				}
			}

			return {
				key: getNodeRefKey(choiceRef),
				nodeRef: choiceRef,
				id: choiceNode.id,
				dialogueId: choiceRef.dialogueId,
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
		[getGraphRuntime, getTraversableNextNodeRefs, t]
	);

	const getBranchChoiceOptions = useCallback(
		(sourceRef) => {
			const graph = getGraphRuntime(sourceRef?.dialogueId);
			if (!graph) return [];

			const outgoingEdges = graph.outgoingEdgeMap.get(sourceRef.nodeId) || [];
			const uniqueByTarget = new Set();
			const options = [];

			outgoingEdges.forEach((edge) => {
				const targetNodeId = String(edge?.target || '').trim();
				if (!targetNodeId || !graph.nodeMap.has(targetNodeId)) return;
				if (uniqueByTarget.has(targetNodeId)) return;
				uniqueByTarget.add(targetNodeId);

				const rules = edge?.data?.conditions?.rules;
				const isConditional = Array.isArray(rules) && rules.length > 0;
				const available = evaluatePreviewEdgeConditions(edge, scenarioContextRef.current);
				const choiceRef = buildNodeRef(sourceRef.dialogueId, targetNodeId);
				const option = buildChoiceOption(choiceRef, { available, isConditional });
				if (option) {
					options.push(option);
				}
			});

			return options;
		},
		[getGraphRuntime, buildChoiceOption]
	);

	const ensureGraphLoaded = useCallback(
		async (dialogueId) => {
			const targetDialogueId = String(dialogueId || '').trim();
			if (!targetDialogueId) return null;

			const existing = getGraphRuntime(targetDialogueId);
			if (existing) return existing;
			if (typeof loadDialogueGraphForPreview !== 'function') return null;

			try {
				const loaded = await loadDialogueGraphForPreview(targetDialogueId);
				const runtime = buildPreviewGraphRuntime(loaded?.nodes || [], loaded?.edges || []);
				graphCacheRef.current = {
					...graphCacheRef.current,
					[targetDialogueId]: runtime,
				};
				setGraphCache((prev) => ({
					...prev,
					[targetDialogueId]: runtime,
				}));
				setScenarioRules(mergeScenarioRulesFromGraphCache({
					...graphCacheRef.current,
				}));
				setScenarioContext((prev) => {
					const next = { ...prev };
					runtime.scenarioRules.forEach((rule) => {
						if (!Object.prototype.hasOwnProperty.call(next, rule.key)) {
							next[rule.key] = true;
						}
					});
					return next;
				});
				return runtime;
			} catch (error) {
				console.warn('[preview] Failed to lazily load dialogue graph', {
					targetDialogueId,
					error,
				});
				return null;
			}
		},
		[getGraphRuntime, loadDialogueGraphForPreview]
	);
	const goToNode = useCallback(
		(nodeRef) => {
			const dialogueKey = String(nodeRef?.dialogueId || '').trim();
			const nodeKey = String(nodeRef?.nodeId || '').trim();
			if (!dialogueKey || !nodeKey) {
				closePreview({ withAnimation: true });
				return;
			}

			const graph = getGraphRuntime(dialogueKey);
			const node = graph?.nodeMap.get(nodeKey);
			if (!graph || !node) {
				closePreview({ withAnimation: true });
				return;
			}

			runtimeRef.current.stepCount += 1;
			if (runtimeRef.current.stepCount > MAX_PREVIEW_STEPS) {
				closePreview({ withAnimation: true });
				return;
			}

			const activeNodeRef = buildNodeRef(dialogueKey, nodeKey);
			const activeKey = getNodeRefKey(activeNodeRef);
			setCurrentNodeRef(activeNodeRef);
			onNodeChange?.(activeNodeRef);
			onNodeFocus?.(activeNodeRef);
			if (node.id !== PREVIEW_START_NODE_ID && activeKey) {
				setVisitedNodeKeys((prev) => (prev.includes(activeKey) ? prev : [...prev, activeKey]));
			}

			if (node.type === 'returnNode') {
				const targetNodeId = String(node.data?.targetNode || '').trim();
				if (!targetNodeId || !graph.nodeMap.has(targetNodeId)) {
					closePreview({ withAnimation: true });
					return;
				}
				runtimeRef.current.timer = window.setTimeout(() => {
					goToNode(buildNodeRef(dialogueKey, targetNodeId));
				}, NODE_TRANSITION_DELAY_MS);
				return;
			}

			if (node.type === 'openChildGraphNode') {
				const targetDialogueId = String(node.data?.targetDialogue || '').trim();
				setChoiceOptions([]);
				setHasCurrentAudio(false);
				setCurrentRowIndex(0);
				setCurrentRowCount(0);
				setCurrentRowProgressPercent(0);
				runtimeRef.current.timer = window.setTimeout(async () => {
					await ensureGraphLoaded(targetDialogueId);
					const childStartRef = getStartPreviewNodeRef(
						targetDialogueId,
						scenarioContextRef.current
					);
					if (!childStartRef) {
						closePreview({ withAnimation: true });
						return;
					}
					goToNode(childStartRef);
				}, NODE_TRANSITION_DELAY_MS);
				return;
			}

			if (node.type === 'delayNode') {
				const durationMs = Math.max(200, (Number(node.data?.duration) || 0.1) * 1000);
				const nextNodeRefs = getTraversableNextNodeRefs(activeNodeRef);
				const branchOptions = getBranchChoiceOptions(activeNodeRef);

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
					if (nextNodeRefs.length === 0) {
						closePreview({ withAnimation: true });
						return;
					}
					if (branchOptions.length > 1) {
						setActiveBranchNodeRef(activeNodeRef);
						setChoiceOptions(branchOptions);
						return;
					}
					window.setTimeout(() => {
						goToNode(nextNodeRefs[0]);
					}, NODE_TRANSITION_DELAY_MS);
				}, durationMs);
				return;
			}

			const rows = getDialogueRowsForPreview(node);
			const nextNodeRefs = getTraversableNextNodeRefs(activeNodeRef);

			const finalizeNode = () => {
				if (isTerminalPreviewNode(node)) {
					closePreview({ withAnimation: true });
					return;
				}

				const branchOptions = node.type !== 'answerNode' ? getBranchChoiceOptions(activeNodeRef) : [];
				if (branchOptions.length > 1) {
					setActiveBranchNodeRef(activeNodeRef);
					setChoiceOptions(branchOptions);
					return;
				}

				if (nextNodeRefs.length === 0) {
					closePreview({ withAnimation: true });
					return;
				}

				setCurrentRowProgressPercent(0);
				runtimeRef.current.timer = window.setTimeout(() => {
					goToNode(nextNodeRefs[0]);
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
			closePreview,
			getBranchChoiceOptions,
			getGraphRuntime,
			getStartPreviewNodeRef,
			getTraversableNextNodeRefs,
			onNodeChange,
			onNodeFocus,
			stopAudio,
			t,
			volume,
			ensureGraphLoaded,
		]
	);

	const startScenarioPreview = useCallback(() => {
		const startNodeRef = getStartPreviewNodeRef(safeRootDialogueId, scenarioContext);
		if (!startNodeRef) {
			setScenarioError(t('editor.preview.invalidNoPlayablePath'));
			return;
		}
		setScenarioError('');
		setScenarioReady(true);
		runtimeRef.current.stepCount = 0;
		goToNode(startNodeRef);
	}, [getStartPreviewNodeRef, goToNode, safeRootDialogueId, scenarioContext, t]);

	const preloadGraphCache = useCallback(async () => {
		const rootId = String(safeRootDialogueId || '').trim();
		if (!rootId) return {};

		const cache = {
			[rootId]: buildPreviewGraphRuntime(nodesRef.current, edgesRef.current),
		};
		const visitedDialogues = new Set([rootId]);
		const queue = [rootId];

		while (queue.length > 0) {
			const dialogueCursor = queue.shift();
			const graph = cache[dialogueCursor];
			if (!graph) continue;

			const childDialogueIds = graph.regularNodes
				.filter((node) => node?.type === 'openChildGraphNode')
				.map((node) => String(node?.data?.targetDialogue || '').trim())
				.filter(Boolean);

			for (const childDialogueId of childDialogueIds) {
				if (visitedDialogues.has(childDialogueId)) continue;
				visitedDialogues.add(childDialogueId);

				if (typeof loadDialogueGraphForPreview !== 'function') continue;
				try {
					const loaded = await loadDialogueGraphForPreview(childDialogueId);
					cache[childDialogueId] = buildPreviewGraphRuntime(
						loaded?.nodes || [],
						loaded?.edges || []
					);
					queue.push(childDialogueId);
				} catch (error) {
					console.warn('[preview] Failed to preload child dialogue graph', {
						childDialogueId,
						error,
					});
				}
			}
		}

		return cache;
	}, [safeRootDialogueId, loadDialogueGraphForPreview]);

	useEffect(() => {
		if (!open) {
			wasOpenRef.current = false;
			if (runtimeRef.current.closeTimeout) {
				window.clearTimeout(runtimeRef.current.closeTimeout);
				runtimeRef.current.closeTimeout = null;
			}
			runtimeRef.current.isClosingLocked = false;
			graphCacheRef.current = {};
			setGraphCache({});
			setIsVisible(false);
			return;
		}
		if (wasOpenRef.current) return;
		wasOpenRef.current = true;

		let cancelled = false;
		setIsVisible(true);
		setIsClosing(false);
		setChoiceOptions([]);
		setHasCurrentAudio(false);
		setVisitedNodeKeys([]);
		setSelectedBranches({});
		setActiveBranchNodeRef(null);
		setCurrentRowIndex(0);
		setCurrentRowCount(0);
		setCurrentRowProgressPercent(0);
		setScenarioError('');
		setCurrentNodeRef(null);
		graphCacheRef.current = {};
		setGraphCache({});
		setScenarioRules([]);
		setScenarioContext({});
		setScenarioReady(false);

		const initializePreview = async () => {
			const rootGraph = buildPreviewGraphRuntime(nodesRef.current, edgesRef.current);
			const initialCache = {
				[safeRootDialogueId]: rootGraph,
			};
			graphCacheRef.current = initialCache;
			setGraphCache(initialCache);

			const mergedScenarioRules = mergeScenarioRulesFromGraphCache(initialCache);
			const initialScenarioContext = mergedScenarioRules.reduce((acc, rule) => {
				acc[rule.key] = true;
				return acc;
			}, {});
			const initialStartNodeRef = getStartPreviewNodeRef(
				safeRootDialogueId,
				initialScenarioContext
			);

			setScenarioRules(mergedScenarioRules);
			setScenarioContext(initialScenarioContext);

			const hasScenarioSetup = mergedScenarioRules.length > 0;
			setScenarioReady(!hasScenarioSetup);
			setCurrentNodeRef(!hasScenarioSetup ? initialStartNodeRef : null);
			if (!hasScenarioSetup && !initialStartNodeRef) {
				closePreview({ withAnimation: true });
				return;
			}
			if (!hasScenarioSetup && initialStartNodeRef) {
				runtimeRef.current.stepCount = 0;
				goToNode(initialStartNodeRef);
			}

			// Continue loading descendants in the background without blocking initial playback.
			const expandedCache = await preloadGraphCache();
			if (cancelled) return;
			graphCacheRef.current = expandedCache;
			setGraphCache(expandedCache);
			setScenarioRules((prevRules) => {
				const nextRules = mergeScenarioRulesFromGraphCache(expandedCache);
				return nextRules.length > prevRules.length ? nextRules : prevRules;
			});
			setScenarioContext((prev) => {
				const next = { ...prev };
				mergeScenarioRulesFromGraphCache(expandedCache).forEach((rule) => {
					if (!Object.prototype.hasOwnProperty.call(next, rule.key)) {
						next[rule.key] = true;
					}
				});
				return next;
			});
		};

		initializePreview();

		return () => {
			cancelled = true;
			clearTimer();
			stopAudio();
		};
	}, [
		open,
		clearTimer,
		closePreview,
		goToNode,
		getStartPreviewNodeRef,
		preloadGraphCache,
		safeRootDialogueId,
		stopAudio,
	]);

	useEffect(() => {
		nodesRef.current = nodes;
		edgesRef.current = edges;
	}, [nodes, edges]);

	useEffect(() => {
		scenarioContextRef.current = scenarioContext;
	}, [scenarioContext]);

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
						<div className="mt-1 flex items-center gap-2 min-w-0">
							<Avatar className="h-8 w-8 shrink-0">
								{speakerThumbnailUrl ? (
									<AvatarImage src={speakerThumbnailUrl} alt={speaker || 'Speaker'} />
								) : (
									<AvatarFallback className="text-xs">
										{(speaker || '?').charAt(0).toUpperCase()}
									</AvatarFallback>
								)}
							</Avatar>
							<p className="text-sm font-semibold truncate">
								{speaker || t('editor.preview.waiting')}
							</p>
						</div>
						<div className="mt-2 flex items-center gap-3">
							<Progress value={previewProgressPercent} className="h-1.5" />
							<span className="text-[11px] text-muted-foreground whitespace-nowrap">
								{visitedPlayableCount}/{selectedRouteNodeKeys.length || 0}
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
												key={choice.key}
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
													if (activeBranchNodeRef) {
														const activeKey = getNodeRefKey(activeBranchNodeRef);
														if (activeKey) {
															setSelectedBranches((prev) => ({
																...prev,
																[activeKey]: choice.key,
															}));
														}
													}
													setActiveBranchNodeRef(null);
													window.setTimeout(() => {
														goToNode(choice.nodeRef);
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
