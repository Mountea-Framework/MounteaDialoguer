import { db } from '@/lib/db';
import { useSteamStore } from '@/stores/steamStore';
import { STEAM_ACHIEVEMENT_IDS } from '@/config/steamAchievements';
import {
	readProfileScopedItem,
	getActiveProfileId, getProfileGeneration,
	buildProfileScopedKey, subscribeProfileChanges,
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

const pendingRetries = new Map();

export async function retryPendingAchievements() {
 const profile = getActiveProfileId(), generation = getProfileGeneration();
 const status = useSteamStore.getState().status;
 if (!status?.available || (status.steamId && profile !== `steam-${status.steamId}`)) return false;
 if (pendingRetries.has(profile)) return pendingRetries.get(profile);
 const eligible = ([id, entry]) => entry && !entry.acknowledgedAt && Object.values(STEAM_ACHIEVEMENT_IDS).includes(id);
 if (!Object.entries(loadAchievementState()).some(eligible)) return false;
 const task = (async () => {
  const attempted = new Set();
  while (profile === getActiveProfileId() && generation === getProfileGeneration()) {
   const next = Object.entries(loadAchievementState()).find((entry) => eligible(entry) && !attempted.has(entry[0]));
   if (!next) break;
   const [id, entry] = next;
   attempted.add(id);
   try {
    const result = await useSteamStore.getState().unlockAchievement(id);
    if (profile !== getActiveProfileId() || generation !== getProfileGeneration()) break;
    if (result?.ok) {
     const state = loadAchievementState();
     state[id] = { ...entry, status: 'acknowledged', acknowledgedAt: new Date().toISOString() };
     saveAchievementState(state);
    }
   } catch { /* Earned state remains pending for the next availability/timer retry. */ }
  }
  return true;
 })();
 pendingRetries.set(profile, task);
 try { return await task; } finally { pendingRetries.delete(profile); }
}

async function unlockAchievement(achievementId) {
 const id = String(achievementId || '').trim();
 if (!id) return false;
 const state = loadAchievementState();
 const newlyEarned = !state[id];
 if (newlyEarned) {
  state[id] = { earnedAt: new Date().toISOString(), status: 'pending' };
  saveAchievementState(state);
 }
 await retryPendingAchievements();
 return newlyEarned;
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

const ACTIVITY_STATE_KEY = 'mountea-activity-v2';
const activityByProfile = new Map();
function activityState() {
 const profile = getActiveProfileId();
 if (!activityByProfile.has(profile)) {
  let saved = {};
  try { saved = JSON.parse(readLocalStorage(ACTIVITY_STATE_KEY, '{}')); } catch { /* Recover invalid preferences. */ }
  const minutes = Number(saved?.minutes ?? readLocalStorage(PLAYTIME_MINUTES_KEY, '0'));
  const lastActivity = Number(saved?.lastActivity ?? readLocalStorage(LAST_ACTIVITY_TS_KEY, '0'));
  activityByProfile.set(profile, { minutes: Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0, lastActivity: Number.isFinite(lastActivity) ? lastActivity : 0, lastTick: Date.now(), lastFlush: 0, dirty: false });
 }
 return activityByProfile.get(profile);
}

export function markUserActivity() {
 const state = activityState();
 state.lastActivity = Date.now();
 state.dirty = true;
}

export function flushActivity({ force = false, profile = getActiveProfileId() } = {}) {
	const state = activityByProfile.get(profile), now = Date.now();
	if (!state) return false;
 if (!state.dirty || (!force && now - state.lastFlush < 60_000)) return false;
 window.localStorage.setItem(buildProfileScopedKey(ACTIVITY_STATE_KEY, profile), JSON.stringify({ minutes: state.minutes, lastActivity: state.lastActivity }));
 state.lastFlush = now;
 state.dirty = false;
 return true;
}

subscribeProfileChanges(() => {
 for (const profile of activityByProfile.keys()) flushActivity({ force: true, profile });
 void retryPendingAchievements();
});

export function getTrackedPlaytimeMinutes() { return activityState().minutes; }

export async function trackActiveMinute() {
 const state = activityState(), now = Date.now();
 if (now - state.lastTick < 60_000) return false;
 state.lastTick = now;
 const eligible = now - state.lastActivity <= ACTIVE_WINDOW_MS && (typeof document === 'undefined' || document.visibilityState === 'visible');
 if (eligible) { state.minutes += 1; state.dirty = true; }
 flushActivity();
 await retryPendingAchievements();
 if (eligible && state.minutes >= 600) return await unlockAchievement(STEAM_ACHIEVEMENT_IDS.POWER_USER_10H);
 return false;
}
