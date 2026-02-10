import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronRight, Trash2, Plus, Volume2, Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/components/ui/toaster';
import { v4 as uuidv4 } from 'uuid';
import {
	storeAudioFile,
	validateAudioFile,
	getAudioDuration,
} from '@/lib/audioStorage';

/**
 * DialogueRowsPanel Component
 * Displays and manages multiple dialogue rows for a node
 * Uses collapsible design similar to decorators
 */
export function DialogueRowsPanel({ dialogueRows = [], onChange, participants = [] }) {
	const { toast } = useToast();
	const [expandedRows, setExpandedRows] = useState(new Set([0])); // First row expanded by default
	const [playingAudio, setPlayingAudio] = useState(null); // Track which row ID is playing audio
	const audioRefs = useRef({}); // Store audio element references by row ID
	const audioUrlsRef = useRef({}); // Store blob URLs by row ID for cleanup
	const audioUrlOwnedRef = useRef({}); // Track if URL was created by this component
	const [audioUrls, setAudioUrls] = useState({});

	// Ensure each row has a stable ID to prevent audio collisions and bad rebinding.
	useEffect(() => {
		const hasMissingIds = dialogueRows.some((row) => !row?.id);
		if (!hasMissingIds) return;

		const normalizedRows = dialogueRows.map((row) => ({
			...row,
			id: row?.id || uuidv4(),
			text: row?.text || '',
			duration: typeof row?.duration === 'number' ? row.duration : 3.0,
			audioFile: row?.audioFile || null,
		}));

		onChange(normalizedRows);
	}, [dialogueRows, onChange]);

	// Create and manage audio URLs when dialogue rows change
	useEffect(() => {
		// Track which row IDs we've seen in this update
		const currentRowIds = new Set();

		// Create or update URLs for audio files
		dialogueRows.forEach((row) => {
			if (row.audioFile) {
				currentRowIds.add(row.id);
				let url = null;
				let isOwned = false;

				// Prefer a fresh blob URL when blob exists (prevents stale revoked URLs).
				if (row.audioFile.blob) {
					url = URL.createObjectURL(row.audioFile.blob);
					isOwned = true;
				}
				// Check if audio has dataUrl property (from old audioStorage)
				else if (row.audioFile.dataUrl) {
					// Convert dataUrl to blob URL
					try {
						const parts = row.audioFile.dataUrl.split(',');
						const mime = parts[0].match(/:(.*?);/)[1];
						const bstr = atob(parts[1]);
						let n = bstr.length;
						const u8arr = new Uint8Array(n);
						while (n--) {
							u8arr[n] = bstr.charCodeAt(n);
						}
						const blob = new Blob([u8arr], { type: mime });
						url = URL.createObjectURL(blob);
						isOwned = true;
					} catch (error) {
						console.error('Error creating audio URL:', error);
					}
				}
				// Fallback URL (not owned here)
				else if (row.audioFile.url) {
					url = row.audioFile.url;
				}

				// Update the URL if it changed
				if (url && audioUrlsRef.current[row.id] !== url) {
					// Clean up old URL only if it was created by this component.
					if (audioUrlsRef.current[row.id] &&
						audioUrlOwnedRef.current[row.id] &&
						audioUrlsRef.current[row.id].startsWith('blob:') &&
						audioUrlsRef.current[row.id] !== url) {
						URL.revokeObjectURL(audioUrlsRef.current[row.id]);
					}
					audioUrlsRef.current[row.id] = url;
					audioUrlOwnedRef.current[row.id] = isOwned;
				}
			}
		});

		// Clean up URLs for rows that no longer exist
		Object.keys(audioUrlsRef.current).forEach((rowId) => {
			if (!currentRowIds.has(rowId)) {
				if (
					audioUrlsRef.current[rowId] &&
					audioUrlOwnedRef.current[rowId] &&
					audioUrlsRef.current[rowId].startsWith('blob:')
				) {
					URL.revokeObjectURL(audioUrlsRef.current[rowId]);
				}
				delete audioUrlsRef.current[rowId];
				delete audioUrlOwnedRef.current[rowId];
			}
		});

		// Clean up stale audio element refs.
		Object.keys(audioRefs.current).forEach((rowId) => {
			if (!currentRowIds.has(rowId)) {
				delete audioRefs.current[rowId];
			}
		});

		setAudioUrls({ ...audioUrlsRef.current });
	}, [dialogueRows]);

	// Cleanup blob URLs only on unmount
	useEffect(() => {
		const urlsRef = audioUrlsRef.current;
		const ownedRef = audioUrlOwnedRef.current;
		return () => {
			Object.keys(urlsRef).forEach((rowId) => {
				const url = urlsRef[rowId];
				if (url && ownedRef[rowId] && url.startsWith('blob:')) {
					URL.revokeObjectURL(url);
				}
			});
		};
	}, []); // Empty dependency array = only runs on mount/unmount

	const toggleRow = (index) => {
		const newExpanded = new Set(expandedRows);
		if (newExpanded.has(index)) {
			newExpanded.delete(index);
		} else {
			newExpanded.add(index);
		}
		setExpandedRows(newExpanded);
	};

	const addRow = () => {
		const newRow = {
			id: uuidv4(),
			text: '',
			audioFile: null,
			duration: 3.0,
		};
		const newRows = [...dialogueRows, newRow];
		onChange(newRows);
		// Expand the new row
		setExpandedRows(new Set([...expandedRows, dialogueRows.length]));
	};

	const removeRow = (index) => {
		const newRows = dialogueRows.filter((_, i) => i !== index);
		onChange(newRows);
		// Remove from expanded set
		const newExpanded = new Set(expandedRows);
		newExpanded.delete(index);
		setExpandedRows(newExpanded);
	};

	const updateRow = (index, updates) => {
		const newRows = dialogueRows.map((row, i) =>
			i === index ? { ...row, ...updates } : row
		);
		onChange(newRows);
	};

	// Auto-complete state for dynamic text
	const [activeRowIndex, setActiveRowIndex] = useState(null);
	const [autocompleteVisible, setAutocompleteVisible] = useState(false);
	const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
	const [autocompleteFilter, setAutocompleteFilter] = useState('');
	const textareaRefs = useRef({});

	const handleTextChange = (index, value, event) => {
		updateRow(index, { text: value });

		// Check for $ character to trigger autocomplete
		const cursorPos = event.target.selectionStart;
		const textBeforeCursor = value.substring(0, cursorPos);
		const dollarIndex = textBeforeCursor.lastIndexOf('$');

		if (dollarIndex !== -1 && cursorPos - dollarIndex <= 20) {
			// $ found recently
			const filterText = textBeforeCursor.substring(dollarIndex + 1);

			// Check if we're still in the middle of typing a variable
			if (!filterText.includes('}') && !filterText.includes(' ') && !filterText.includes('\n')) {
				setActiveRowIndex(index);
				setAutocompleteFilter(filterText.toLowerCase());
				setAutocompleteVisible(true);

				// Position autocomplete near cursor
				const textarea = event.target;
				const rect = textarea.getBoundingClientRect();
				setAutocompletePosition({
					top: rect.top - 150,
					left: rect.left + 10,
				});
			} else {
				setAutocompleteVisible(false);
			}
		} else {
			setAutocompleteVisible(false);
		}
	};

	const insertParticipant = (participantName) => {
		if (activeRowIndex === null) return;

		const row = dialogueRows[activeRowIndex];
		const textarea = textareaRefs.current[activeRowIndex];
		if (!textarea) return;

		const cursorPos = textarea.selectionStart;
		const textBeforeCursor = row.text.substring(0, cursorPos);
		const dollarIndex = textBeforeCursor.lastIndexOf('$');

		// Replace from $ to cursor with ${participantName}
		const newText =
			row.text.substring(0, dollarIndex) +
			`\${${participantName}}` +
			row.text.substring(cursorPos);

		updateRow(activeRowIndex, { text: newText });
		setAutocompleteVisible(false);

		// Focus back on textarea
		setTimeout(() => {
			textarea.focus();
			const newPos = dollarIndex + participantName.length + 3; // Position after ${name}
			textarea.setSelectionRange(newPos, newPos);
		}, 0);
	};

	const filteredParticipants = participants.filter((p) =>
		p.name.toLowerCase().includes(autocompleteFilter)
	);

	// Handle audio file upload
	const handleAudioUpload = async (index, file) => {
		if (!file) return;

		// Validate file
		const validation = validateAudioFile(file);
		if (!validation.valid) {
			toast({
				variant: 'error',
				title: 'Invalid Audio File',
				description: validation.error,
			});
			return;
		}

		try {
			// Store audio file as blob
			const audioData = await storeAudioFile(file);

			// Extract audio duration
			const duration = await getAudioDuration(file);

			// Update row with audio data and duration
			updateRow(index, {
				audioFile: audioData,
				duration: duration || 3.0,
			});

			toast({
				variant: 'success',
				title: 'Audio Uploaded',
				description: `${file.name} uploaded successfully`,
			});
		} catch (error) {
			console.error('Error uploading audio:', error);
			toast({
				variant: 'error',
				title: 'Upload Failed',
				description: 'Failed to upload audio file. Please try again.',
			});
		}
	};

	// Handle audio playback
	const toggleAudioPlayback = (rowId) => {
		const audioElement = audioRefs.current[rowId];
		if (!audioElement) return;
		const source = audioUrlsRef.current[rowId] || audioUrls[rowId];
		if (!source) {
			toast({
				variant: 'error',
				title: 'Playback Failed',
				description: 'No audio source found for this row.',
			});
			return;
		}

		if (audioElement.src !== source) {
			audioElement.src = source;
			audioElement.load();
		}

		if (playingAudio === rowId) {
			audioElement.pause();
			setPlayingAudio(null);
		} else {
			// Pause any currently playing audio
			if (playingAudio !== null && audioRefs.current[playingAudio]) {
				audioRefs.current[playingAudio].pause();
			}
			audioElement
				.play()
				.then(() => {
					setPlayingAudio(rowId);
				})
				.catch((error) => {
					console.error('Error playing audio:', error);
					setPlayingAudio(null);
					toast({
						variant: 'error',
						title: 'Playback Failed',
						description: 'Failed to play audio clip.',
					});
				});
		}
	};

	// Handle audio ended
	const handleAudioEnded = (rowId) => {
		if (playingAudio === rowId) {
			setPlayingAudio(null);
		}
	};

	// Remove audio file
	const removeAudioFile = (index) => {
		const row = dialogueRows[index];
		if (row) {
			// Clean up blob URL
			if (
				audioUrlsRef.current[row.id] &&
				audioUrlOwnedRef.current[row.id] &&
				audioUrlsRef.current[row.id].startsWith('blob:')
			) {
				URL.revokeObjectURL(audioUrlsRef.current[row.id]);
			}
			delete audioUrlsRef.current[row.id];
			delete audioUrlOwnedRef.current[row.id];
			setAudioUrls((prev) => {
				const next = { ...prev };
				delete next[row.id];
				return next;
			});
		}

		updateRow(index, { audioFile: null });
		if (row && playingAudio === row.id) {
			setPlayingAudio(null);
		}
	};

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label className="text-sm font-bold">Dialogue Rows</Label>
				<span className="text-xs text-muted-foreground">
					{dialogueRows.length} {dialogueRows.length === 1 ? 'row' : 'rows'}
				</span>
			</div>

			{dialogueRows.length === 0 ? (
				<div className="text-center py-6 border border-dashed border-border rounded-lg">
					<p className="text-sm text-muted-foreground mb-3">No dialogue rows yet</p>
					<Button
						variant="outline"
						size="sm"
						onClick={addRow}
						className="gap-2"
					>
						<Plus className="h-3.5 w-3.5" />
						Add First Row
					</Button>
				</div>
			) : (
				<div className="space-y-2">
					{dialogueRows.map((row, index) => {
						const isExpanded = expandedRows.has(index);
						const previewText = row.text
							? row.text.length > 40
								? row.text.substring(0, 40) + '...'
								: row.text
							: 'Empty dialogue...';

						return (
							<div
								key={row.id}
								className="border border-border rounded-lg overflow-hidden bg-card"
							>
								{/* Row Header */}
								<div
									className="flex items-center justify-between p-3 cursor-pointer hover:bg-accent/50 transition-colors"
									onClick={() => toggleRow(index)}
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
										<span className="text-sm flex-1 truncate">
											{previewText}
										</span>
									</div>
									<Button
										variant="ghost"
										size="icon"
										className="h-7 w-7 shrink-0"
										onClick={(e) => {
											e.stopPropagation();
											removeRow(index);
										}}
									>
										<Trash2 className="h-3.5 w-3.5 text-destructive" />
									</Button>
								</div>

								{/* Row Content */}
								{isExpanded && (
									<div className="p-4 pt-0 space-y-4 border-t border-border">
										{/* Dialogue Text */}
										<div className="space-y-2">
											<Label htmlFor={`text-${row.id}`}>
												Dialogue Text
												<span className="ml-2 text-xs text-muted-foreground">
													(Type $ for participants)
												</span>
											</Label>
											<Textarea
												id={`text-${row.id}`}
												ref={(el) => (textareaRefs.current[index] = el)}
												value={row.text || ''}
												onChange={(e) => handleTextChange(index, e.target.value, e)}
												placeholder="Enter dialogue text... Type $ to insert participant names"
												className="min-h-[100px] font-mono text-sm"
											/>
										</div>

										{/* Audio File */}
										<div className="space-y-2">
											<Label htmlFor={`audio-${row.id}`}>Audio Clip</Label>
											{!row.audioFile ? (
												<Input
													id={`audio-${row.id}`}
													type="file"
													accept=".wav,.mp3,audio/wav,audio/mpeg"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															handleAudioUpload(index, file);
														}
														// Reset input
														e.target.value = '';
													}}
													className="cursor-pointer"
												/>
											) : (
												<div className="flex items-center gap-2 p-3 bg-accent/50 rounded-lg border border-border">
													<Button
														variant="ghost"
														size="icon"
														className="h-8 w-8 shrink-0"
														onClick={() => toggleAudioPlayback(row.id)}
													>
														{playingAudio === row.id ? (
															<Pause className="h-4 w-4" />
														) : (
															<Play className="h-4 w-4" />
														)}
													</Button>
													<div className="flex flex-col flex-1 min-w-0">
														<div className="flex items-center gap-2">
															<Volume2 className="h-3 w-3 text-muted-foreground" />
															<span className="text-sm font-medium truncate">
																{row.audioFile.name}
															</span>
														</div>
														<span className="text-xs text-muted-foreground">
															{(row.audioFile.size / 1024).toFixed(1)} KB
														</span>
													</div>
													<Button
														variant="ghost"
														size="icon"
														className="h-7 w-7 shrink-0"
														onClick={() => removeAudioFile(index)}
													>
														<X className="h-3.5 w-3.5 text-destructive" />
													</Button>
													{/* Hidden audio element for playback */}
													<audio
														ref={(el) => (audioRefs.current[row.id] = el)}
														src={audioUrls[row.id] || ''}
														onEnded={() => handleAudioEnded(row.id)}
														className="hidden"
													/>
												</div>
											)}
										</div>

										{/* Duration Slider */}
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<Label htmlFor={`duration-${row.id}`}>
													Duration (seconds)
												</Label>
												<span className="text-sm font-medium">
													{row.duration.toFixed(1)}s
												</span>
											</div>
											<Slider
												id={`duration-${row.id}`}
												value={[row.duration]}
												onValueChange={([value]) =>
													updateRow(index, { duration: value })
												}
												min={0.5}
												max={30}
												step={0.1}
												className="w-full"
											/>
										</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}

			{/* Add Row Button */}
			{dialogueRows.length > 0 && (
				<Button
					variant="outline"
					size="sm"
					onClick={addRow}
					className="w-full gap-2"
				>
					<Plus className="h-3.5 w-3.5" />
					Add Dialogue Row
				</Button>
			)}

			{/* Autocomplete Dropdown */}
			{autocompleteVisible && filteredParticipants.length > 0 && (
				<div
					className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
					style={{
						top: `${autocompletePosition.top}px`,
						left: `${autocompletePosition.left}px`,
						minWidth: '200px',
					}}
				>
					{filteredParticipants.map((participant) => (
						<button
							key={participant.id}
							onClick={() => insertParticipant(participant.name)}
							className="w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors flex items-center gap-2"
						>
							<span className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
								{participant.name.charAt(0).toUpperCase()}
							</span>
							<span>{participant.name}</span>
						</button>
					))}
				</div>
			)}
		</div>
	);
}
