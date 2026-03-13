import { db } from '@/lib/db';
import { useSteamStore } from '@/stores/steamStore';
import { STEAM_ACHIEVEMENT_IDS } from '@/config/steamAchievements';
import {
	readProfileScopedItem,
	writeProfileScopedItem,
} from '@/lib/profile/activeProfile';

const ACHIEVEMENT_STATE_KEY = 'mountea-achievements-state-v1';
const PLAYTIME_MINUTES_KEY = 'mountea-achievements-playtime-minutes-v1';
const LAST_ACTIVITY_TS_KEY = 'mountea-achievements-last-activity-ts-v1';
const ACTIVE_WINDOW_MS = 2 * 60 * 1000;

function readLocalStorage(key, fallback = '') {
	return readProfileScopedItem(key, fallback);
}

function writeLocalStorage(key, value) {
	writeProfileScopedItem(key, value);
}

function loadAchievementState() {
	const raw = readLocalStorage(ACHIEVEMENT_STATE_KEY, '{}');
	try {
		const parsed = JSON.parse(raw);
		return typeof parsed === 'object' && parsed ? parsed : {};
	} catch (error) {
		return {};
	}
}

function saveAchievementState(nextState) {
	writeLocalStorage(ACHIEVEMENT_STATE_KEY, JSON.stringify(nextState || {}));
}

function isAchievementUnlocked(achievementId) {
	const state = loadAchievementState();
	return Boolean(state[achievementId]);
}

async function unlockAchievement(achievementId) {
	const id = String(achievementId || '').trim();
	if (!id) return false;
	if (isAchievementUnlocked(id)) return false;

	const state = loadAchievementState();
	state[id] = {
		unlockedAt: new Date().toISOString(),
	};
	saveAchievementState(state);

	try {
		await useSteamStore.getState().unlockAchievement(id);
	} catch (error) {
		// Keep local unlock state even when Steam runtime is unavailable.
	}

	return true;
}

function isExampleProject(project) {
	if (!project) return false;
	return Boolean(project.isExample) || project.name === 'OnboardingExample';
}

async function trackFirstRecordInProject(projectId, table, achievementId) {
	if (!projectId || !table) return false;

	const project = await db.projects.get(projectId);
	if (!project || isExampleProject(project)) return false;

	const count = await table.where('projectId').equals(projectId).count();
	if (count !== 1) return false;

	return await unlockAchievement(achievementId);
}

export async function trackExampleProjectCreated() {
	return await unlockAchievement(STEAM_ACHIEVEMENT_IDS.EXAMPLE_PROJECT);
}

export async function trackFirstNonExampleProjectCreated() {
	const projects = await db.projects.toArray();
	const nonExampleProjects = projects.filter((project) => !isExampleProject(project));
	if (nonExampleProjects.length !== 1) return false;
	return await unlockAchievement(STEAM_ACHIEVEMENT_IDS.FIRST_PROJECT);
}

export async function trackFirstCategoryCreated(projectId) {
	return await trackFirstRecordInProject(
		projectId,
		db.categories,
		STEAM_ACHIEVEMENT_IDS.FIRST_CATEGORY
	);
}

export async function trackFirstDecoratorCreated(projectId) {
	return await trackFirstRecordInProject(
		projectId,
		db.decorators,
		STEAM_ACHIEVEMENT_IDS.FIRST_DECORATOR
	);
}

export async function trackFirstParticipantCreated(projectId) {
	return await trackFirstRecordInProject(
		projectId,
		db.participants,
		STEAM_ACHIEVEMENT_IDS.FIRST_PARTICIPANT
	);
}

export async function trackFirstConditionCreated(projectId) {
	return await trackFirstRecordInProject(
		projectId,
		db.conditions,
		STEAM_ACHIEVEMENT_IDS.FIRST_CONDITION
	);
}

export function markUserActivity() {
	writeLocalStorage(LAST_ACTIVITY_TS_KEY, String(Date.now()));
}

export function getTrackedPlaytimeMinutes() {
	const raw = readLocalStorage(PLAYTIME_MINUTES_KEY, '0');
	const value = Number(raw);
	if (!Number.isFinite(value) || value < 0) return 0;
	return Math.floor(value);
}

function setTrackedPlaytimeMinutes(minutes) {
	writeLocalStorage(PLAYTIME_MINUTES_KEY, String(minutes));
}

export async function trackActiveMinute() {
	const lastActivityRaw = readLocalStorage(LAST_ACTIVITY_TS_KEY, '0');
	const lastActivityTs = Number(lastActivityRaw);
	if (!Number.isFinite(lastActivityTs)) return false;
	if (Date.now() - lastActivityTs > ACTIVE_WINDOW_MS) return false;
	if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return false;

	const minutes = getTrackedPlaytimeMinutes() + 1;
	setTrackedPlaytimeMinutes(minutes);

	if (minutes >= 600) {
		return await unlockAchievement(STEAM_ACHIEVEMENT_IDS.POWER_USER_10H);
	}

	return false;
}
