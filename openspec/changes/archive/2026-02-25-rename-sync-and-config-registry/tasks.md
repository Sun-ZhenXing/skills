## 1. Config System Updates

- [x] 1.1 Add `update-registry` config key to Config interface in `src/config.ts`
- [x] 1.2 Update DEFAULT_CONFIG with `registry: 'https://skills.sh/'` and `update-registry: 'https://add-skill.vercel.sh'`
- [x] 1.3 Add `SKILLS_UPDATE_REGISTRY` environment variable mapping
- [x] 1.4 Implement backward compatibility: read old `registry` as fallback for `update-registry`
- [x] 1.5 Add deprecation warning when old `registry` config is used
- [x] 1.6 Add URL validation for registry config values
- [x] 1.7 Update config list display to show both registries with descriptions

## 2. Command Rename: sync → install

- [x] 2.1 Register `install` command in CLI with same handler as current `sync`
- [x] 2.2 Keep `sync` as hidden alias that shows deprecation warning
- [x] 2.3 Update help text to show `install` instead of `sync`
- [x] 2.4 Update banner to show `npx skills install` instead of `npx skills sync`
- [x] 2.5 Update all examples in help text to use `install`
- [x] 2.6 Rename `parseSyncOptions` to `parseInstallOptions` in `src/sync-lock.ts`
- [x] 2.7 Update references to use new function name

## 3. Remove Experimental Commands

- [x] 3.1 Remove `experimental_install` command registration from `cli.ts`
- [x] 3.2 Remove `experimental_sync` command registration from `cli.ts`
- [x] 3.3 Remove experimental commands from help text
- [x] 3.4 Remove experimental commands from banner
- [x] 3.5 Clean up unused imports related to experimental commands

## 4. Update Registry Usage in Code

- [x] 4.1 Update check/update commands to use `update-registry` config instead of `registry`
- [x] 4.2 Update `src/find.ts` to use configurable `registry` for skill discovery
- [x] 4.3 Update provider modules to accept registry URL parameter
- [x] 4.4 Ensure all registry URLs are read from config, not hardcoded

## 5. Documentation Updates

- [x] 5.1 Update `AGENTS.md` to reflect new command names
- [x] 5.2 Update `README.md` command reference section
- [x] 5.3 Document new config keys (`registry`, `update-registry`)
- [x] 5.4 Add migration guide for users coming from old commands
- [x] 5.5 Update any inline code comments referencing old command names

## 6. Testing

- [x] 6.1 Update existing tests that use `sync` command to use `install`
- [x] 6.2 Add test for `sync` alias showing deprecation warning
- [x] 6.3 Add tests for new config keys
- [x] 6.4 Add test for backward compatibility (old `registry` config)
- [x] 6.5 Add test for URL validation in config
- [x] 6.6 Verify experimental commands return "Unknown command" error
- [x] 6.7 Run full test suite to ensure no regressions

## 7. Final Verification

- [x] 7.1 Build the project: `pnpm build`
- [x] 7.2 Run format check: `pnpm format`
- [x] 7.3 Run type check: `pnpm type-check`
- [x] 7.4 Run all tests: `pnpm test`
- [x] 7.5 Manual test: `skills install --help`
- [x] 7.6 Manual test: `skills sync` shows deprecation warning
- [x] 7.7 Manual test: `skills config set registry` works
- [x] 7.8 Manual test: `skills config set update-registry` works
