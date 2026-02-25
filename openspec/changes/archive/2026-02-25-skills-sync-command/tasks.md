## 1. Core Module Implementation

- [x] 1.1 Create `src/sync-lock.ts` module with core sync logic
- [x] 1.2 Implement `detectSyncStatus()` function to categorize skills (missing/modified/up-to-date/orphaned)
- [x] 1.3 Implement `computeSkillStatus()` function using `computeSkillFolderHash` from `local-lock.ts`
- [x] 1.4 Implement `syncSkill()` function to install/update a single skill
- [x] 1.5 Implement `syncAllSkills()` function to orchestrate the sync process

## 2. CLI Integration

- [x] 2.1 Add `sync` command handler in `src/cli.ts`
- [x] 2.2 Implement argument parsing for `skills sync [skill-names...]`
- [x] 2.3 Add `--dry-run` flag support
- [x] 2.4 Add `--force` flag support
- [x] 2.5 Add `--yes` flag support
- [x] 2.6 Update help text and banner to include `skills sync` command

## 3. Interactive User Interface

- [x] 3.1 Implement sync status display with categorized skills
- [x] 3.2 Implement confirmation prompt for missing skills
- [x] 3.3 Implement confirmation prompt for modified skills
- [x] 3.4 Display orphaned skills as informational (no action)
- [x] 3.5 Add progress indicator during skill installation

## 4. Source Type Handlers

- [x] 4.1 Implement git-based skill sync (clone/pull with ref checkout)
- [x] 4.2 Implement node_modules skill sync (copy from node_modules)
- [x] 4.3 Implement local path skill sync (copy from local source)
- [x] 4.4 Add error handling for unavailable sources

## 5. Lock File Management

- [x] 5.1 Update lock file entries after successful sync
- [x] 5.2 Recompute hashes for synchronized skills
- [x] 5.3 Handle lock file write errors gracefully

## 6. Testing

- [x] 6.1 Write unit tests for `detectSyncStatus()` function
- [x] 6.2 Write unit tests for sync status categorization
- [x] 6.3 Write integration tests for `--dry-run` mode
- [x] 6.4 Write integration tests for `--force` mode
- [x] 6.5 Write tests for selective skill sync
- [x] 6.6 Write tests for different source types

## 7. Documentation

- [x] 7.1 Add JSDoc comments to new functions
- [ ] 7.2 Update README.md with `skills sync` usage
- [ ] 7.3 Add command examples to CLI help text
