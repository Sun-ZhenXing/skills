## Context

The current CLI has evolved organically, resulting in some inconsistencies:

1. **Command naming confusion**: `skills sync` syncs from `skills-lock.json`, while `skills experimental_sync` syncs from `node_modules`. The term "sync" is overloaded and unclear.
2. **Legacy experimental commands**: `experimental_install` and `experimental_sync` have been in experimental state for too long and need to be consolidated.
3. **Hardcoded registry URLs**: The registry URL `https://add-skill.vercel.sh` is hardcoded in multiple places, making it difficult for enterprises to use private registries.
4. **Config naming**: The `registry` config key points to `add-skill.vercel.sh`, which is specifically for update checking, not skill discovery.

## Goals / Non-Goals

**Goals:**
- Rename `skills sync` to `skills install` for clearer semantics (install from lock file)
- Remove `experimental_install` and `experimental_sync` commands
- Allow configurable registry URL for skill discovery (default: `https://skills.sh/`)
- Rename the update-checking registry config from `registry` to `update-registry`
- Maintain backward compatibility where possible (aliases, deprecation warnings)

**Non-Goals:**
- Changing the underlying sync/install logic
- Adding new skill sources beyond git repos and node_modules
- Modifying the lock file format
- Supporting multiple registries simultaneously

## Decisions

### 1. Command Rename: `sync` → `install`

**Decision**: Rename `skills sync` to `skills install`

**Rationale**:
- "Install" is the industry-standard term for restoring dependencies from a lock file (like `npm install`, `pip install`)
- "Sync" is ambiguous - could mean sync from lock file, sync from node_modules, or sync with remote
- Aligns with user mental models from other package managers

**Implementation**:
- Rename command registration in `cli.ts`
- Keep `sync` as a hidden alias for backward compatibility (with deprecation warning)
- Update all documentation and help text

### 2. Remove Experimental Commands

**Decision**: Remove `experimental_install` and `experimental_sync`

**Rationale**:
- These commands have been "experimental" for too long
- `experimental_install` functionality is identical to the new `skills install`
- `experimental_sync` (node_modules sync) will be integrated into `skills add` workflow or removed

**Implementation**:
- Remove command handlers from `cli.ts`
- Remove from help text
- Update `AGENTS.md` documentation

### 3. Configurable Registry

**Decision**: Allow users to configure the skill discovery registry URL

**Rationale**:
- Enterprises may want to run private skill registries
- Users in certain regions may need mirrors
- Makes the tool more flexible without adding complexity

**Implementation**:
- Add `registry` config key (default: `https://skills.sh/`)
- Update `config.ts` DEFAULT_CONFIG
- Use configured registry in `find.ts` and provider modules

### 4. Rename Update Registry Config

**Decision**: Rename config key from `registry` to `update-registry`

**Rationale**:
- Current `registry` config points to `add-skill.vercel.sh`, which is only used for update checking
- This is confusing because users expect `registry` to be for skill discovery
- Clear separation between skill discovery registry and update checking registry

**Implementation**:
- Rename config key in `config.ts`
- Update all references in `cli.ts` (check/update commands)
- Provide migration: read old `registry` value if `update-registry` is not set
- Show deprecation warning when `registry` is used

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking change for users of `sync` command | Keep `sync` as alias with deprecation warning for one major version |
| Breaking change for users of `experimental_*` commands | Document migration path in release notes; these were marked experimental |
| Config key rename breaks existing configs | Read old `registry` as fallback; show deprecation warning |
| Users confused by two registry configs | Clear documentation distinguishing `registry` (discovery) vs `update-registry` (updates) |

## Migration Plan

1. **Phase 1 - Deprecation** (this change):
   - Add `install` command as primary
   - Keep `sync` as alias with deprecation warning
   - Add `update-registry` config key
   - Support `registry` as fallback with deprecation warning
   - Remove `experimental_install` and `experimental_sync`

2. **Phase 2 - Cleanup** (future major version):
   - Remove `sync` alias
   - Remove `registry` config fallback

## Open Questions

1. Should `skills find` use the configurable registry immediately, or keep using hardcoded URL initially?
2. Do we need to support registry authentication (API keys, tokens) in this change or defer?
3. Should we add a `skills registry` subcommand to manage registry settings interactively?
