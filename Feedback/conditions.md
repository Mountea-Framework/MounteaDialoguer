**What was added**

1. **Persistent condition definitions**
- Added DB table `conditions` in `src/lib/db.js` (Dexie version 6).
- Added Zustand store `src/stores/conditionStore.js`:
  - `loadConditions`
  - `createCondition`
  - `updateCondition`
  - `deleteCondition`
  - `importConditions`
  - `exportConditions`

2. **Project UI: dedicated Conditions page**
- New section component: `src/components/projects/sections/ConditionsSection.jsx`
- New card component: `src/components/projects/ConditionCard.jsx`
- New dialogs:
  - `src/components/dialogs/CreateConditionDialog.jsx`
  - `src/components/dialogs/EditConditionDialog.jsx`
- Added sidebar entry in `src/components/projects/ProjectSidebar.jsx`
- Wired project route in `src/routes/projects/$projectId/index.jsx`:
  - loads conditions
  - exposes `conditions` section
  - passes condition count to overview
- Overview now shows conditions count in `src/components/projects/sections/OverviewSection.jsx`

3. **Dialogue editor integration**
- Dialogue editor now loads project conditions and uses them as the available definitions for edge conditions:
  - `src/routes/projects/$projectId/dialogue/$dialogueId/index.jsx`
- Removed hardcoded edge condition presets from `src/config/edgeConditions.js` (kept helper functions only).

4. **Project export/import + sync support**
- Project export now includes `conditions.json` and import restores it:
  - `src/stores/projectStore.js`
- Project delete now removes `conditions` data.
- Sync snapshots now include `conditions`:
  - `src/lib/sync/snapshot.js`

5. **Localization**
- Added **English only** condition strings in `src/i18n/locales/en.json`.
- No other locales were edited.

**Validation**
- New condition-related files lint clean.
- `en.json` parses successfully.
- Existing large route/store files still have unrelated pre-existing lint issues in this codebase (not introduced by this change).

**TODO:**
1. A quick “Create default conditions” action (seed templates),
2. Condition usage warnings before deleting a condition definition (if used on any edge).