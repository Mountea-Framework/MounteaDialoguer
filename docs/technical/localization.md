# Localization and string tables

Sources: [string-table implementation](../../src/lib/localization/stringTable.js), [locale catalogue](../../src/lib/localization/localeCatalog.js), [app language catalogue](../../src/lib/localization/appLanguages.js), [dialogue store](../../src/stores/dialogueStore.js), [shared languages](../../electron/shared/app-languages.json). Function-level entry points are in the [logic index](logic-index.md).

## Two independent locale systems

Application language controls menus, labels, dialogs, and Electron menu text. i18next initializes from its browser detector/local storage with English fallback; React performs output escaping. The shared catalogue contains English, Czech, German, French, Spanish, and Polish (`en`, `cs`, `de`, `fr`, `es`, `pl`). Translation JSON is grouped under `src/i18n`. Some user-visible error/fallback messages remain hardcoded English; catalogue availability does not imply complete translation coverage.

Content locale controls authored dialogue text. A project's localization configuration contains `defaultLocale` and `supportedLocales`. Locale normalization uses `Intl.Locale`, drops invalid entries, deduplicates, and includes the default locale (English if unavailable). Localization is mandatory. Legacy `enabled` input is accepted but omitted from the normalized contract; `isProjectLocalizationEnabled` remains a compatibility helper returning true. Editor controls no longer read the removed flag, and the settings dialog blocks removal of the current default locale.

The selected content locale is a UI preference. Switching it in an editor with unsaved changes is blocked so materialization does not silently overwrite the draft. Application language does not translate the user's dialogue automatically.

## Persisted contract

Text belongs to `localizedStrings`, keyed by `[projectId+key]`. An entry carries project/dialogue/node/row scope, field, optional readable tokens, locale-to-text `values`, and timestamps. Supported fields are node `displayName`, node `selectionTitle`, and row text. Nodes retain key references (`displayNameKey`, `selectionTitleKey`, row `textKey`) and stable localization tokens, rather than storing the active language as authoritative inline text.

Example readable keys:

```text
dlg.introduction.n_guard_a12f.display_name
dlg.introduction.n_guard_a12f.selection_title
dlg.introduction.n_guard_a12f.r_hello_b034.text
```

Legacy keys use IDs:

```text
dlg.<dialogueId>.node.<nodeId>.displayName
dlg.<dialogueId>.node.<nodeId>.selectionTitle
dlg.<dialogueId>.node.<nodeId>.row.<rowId>.text
```

Both forms are parsed. They are not interchangeable merely by changing an entry's key: all node/row references must also be changed. Snapshot cloning currently violates this rule ([ISS-013](issues.md#iss-013)).

## Readable-key algorithm

1. Choose the dialogue's existing normalized `localizationSlug`, otherwise derive it from name/ID. Slugification normalizes NFKD, removes combining marks, lowercases, and replaces unsupported characters with underscores.
2. Reuse a node's valid stable token where possible. Otherwise use a display-name/label/type stem of at most 24 characters plus a four-hex-character suffix derived from an unsigned polynomial-31 hash of its ID.
3. Rows similarly derive a token from text/ID. Existing row tokens remain stable through text edits.
4. A used-token set resolves local collisions using hash/counter suffixes, with a bounded counter search. Scope is the current dialogue for nodes and current node for rows.
5. Build the field suffix: `display_name`, `selection_title`, or `text`.

The short hash is a naming aid, not a cryptographic identity. `allocateDialogueLocalizationSlug(dialogue, projectDialogues)` preserves an existing unique namespace. On collision it appends the normalized full dialogue identity, then a counter only if needed. Creation reserves the namespace in the same transaction as the dialogue. Save/load repair existing collisions while rewriting node/row references and entries together; surviving locale maps are copied from the old keys. Project-wide entry ownership is validated before writes. Already overwritten translations cannot be reconstructed; absent default values cause a repair diagnostic instead of an invented empty translation.

## Save and load algorithms

`prepareLocalizedNodesAndEntries` clones graph data, reserves tokens, and associates each localizable field with a key. It reuses an existing reference only if it matches the field's expected scope/tokens. Existing locale values are retained; an inline field updates the active locale only when the field actually exists. An explicitly present empty string is an intentional empty translation, not a request to fall back. `buildPersistedNodesWithoutLocalizedText` removes inline localized fields before storing nodes.

The function returns transformed nodes, referenced entries, and diagnostics. The save transaction replaces the dialogue's stored graph and its localized entries; unreferenced strings are pruned. Callers must supply current existing entries or they can erase translations in other locales.

`materializeLocalizedNodes` resolves a reference, or constructs one when necessary, and places editable strings back into node/row data. Lookup order is an own-property value in the selected locale, then default locale, then legacy inline text. An existing `""` stops fallback. Materialization can also fill missing tokens/references in memory; it is not proof those references have been persisted.

The dialogue loader captures a profile-bound repository context and reads the original metadata, persisted graph, project configuration, and strings in one transaction. Migration need is determined before materialization. It prepares from original persisted fields, validates references and surviving values, then commits graph, strings, namespace, and version marker atomically. Only after commit are localized display values and playback audio materialized. Failed migration leaves original authoring data and the old marker intact. Missing-content failures create an unresolved `recoveryRecords` diagnostic; `assertProjectReady` blocks affected export/sync until repaired. A successful repair save resolves the localization diagnostic. Read-only preview loads also use a pinned context and consistent read transaction.

Changing the default locale migrates any legacy inline text under the previous default first. For every persisted entry, missing values in the new default are copied from the previous default; existing translations, including explicit empty strings, are retained. Missing source values reject the change. Graph migration, entry seeding, and project configuration commit in one transaction, so failure cannot change the interpretation of existing text. This is fallback seeding, not automatic translation.

## Validation and interchange

Validation derives required localizable fields from `dialogueNodes.json`, also retaining validation for authored legacy fields and every row. It checks absent references, key format and token/ID scope, duplicate references/entries, entry ownership, project-wide key collisions, and presence of the default locale. Callers provide `projectId`, `dialogueId`, `dialogueSlug`, and `projectEntries` for complete ownership checks. It does not require nonempty text or all supported translations; explicit empty defaults are valid. Required-content warnings in the editor are a different layer. Archive preparation must remap old ownership before invoking the same validator.

The v2 archive contract is:

```json
{
  "version": 2,
  "format": "stringTable.v2",
  "dialogueId": "dialogue-id",
  "defaultLocale": "en",
  "locales": ["en", "cs"],
  "entries": {
    "dlg.introduction.n_guard_a12f.display_name": {
      "en": "Guard",
      "cs": "Strážný"
    }
  }
}
```

Import normalization accepts legacy arrays and entry arrays/maps. Legacy ID-based keys are remapped using node and composite node/row ID maps. Readable keys are retained with their tokens; subsequent preparation must reconcile scope. Renaming a dialogue should not casually regenerate its slug because downstream references and translated assets may depend on stable keys.

## Change checklist

Check round trips with at least two locales, explicit empty strings, Unicode labels, renamed dialogues/nodes, duplicated names, old key formats, newly generated row IDs, and a clone into a different project. Compare the entire locale map rather than only the active UI text. Archive and snapshot paths implement different transforms and need separate checks.

## Implementation evidence

The Phase 4 suite in `tests/e2e/localization-regressions.spec.js` passed ten focused cases covering the original five red regressions, six-locale namespace repair, explicit blanks, write-failure rollback, missing-source default changes, legacy default migration, and ownership validation. Three application smoke tests also passed. See the [implementation ledger](implementation-progress.md) for remaining archive/sync integration and release gates; this evidence does not close those separate contracts.

Product feedback now uses `src/lib/errorPresentation.js` to map structured domain, archive, quota and recovery failures to six-language reasons and localized action titles. Internal exception prose is not used as the base UI message. Structured codes, record identities and paths remain visible for repair; full original diagnostics remain downloadable. The archive dialog retains the failure object and shows actionable size/format/corruption details.
