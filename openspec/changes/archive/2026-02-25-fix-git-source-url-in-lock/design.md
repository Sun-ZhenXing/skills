## Context

The `skills` CLI stores installed skill sources in `skills-lock.json`. When `sourceType` is `git` or `github`, the lock file currently stores only the `owner/repo` shorthand (e.g., `AlexSun/antfu-skills`) in the `source` field. This format is insufficient for git clone operations, which require a full URL.

Additionally, the `declaredRef` and `resolvedRef` fields in the lock file (which store branch/tag/commit information) are not being used during restoration. When a user installs a skill with a specific tag like `skills add owner/repo@v1.0.0`, this tag should be preserved and used when restoring from the lock file.

The `runInstallFromLock` function in `src/install.ts` reads the lock file and passes only the `source` to `runAdd`, without:
1. Converting shorthand to full URLs
2. Appending the ref (tag/branch/commit) to the source

This causes restoration from lock file to fail for git-type sources, and to install the wrong version for sources with specific refs.

## Goals / Non-Goals

**Goals:**
- Fix the lock file restoration for `sourceType: git` entries
- Convert `owner/repo` shorthand to full HTTPS URLs during installation from lock
- Preserve and use `declaredRef` or `resolvedRef` when restoring skills
- Maintain backward compatibility with existing lock files

**Non-Goals:**
- Changing the lock file format (version remains 1)
- Modifying how sources are stored during initial installation
- Supporting SSH URL format preference (use HTTPS as default)

## Decisions

**Convert shorthand to HTTPS URL in install.ts**
- **Rationale**: The fix should be localized to the restoration flow to minimize risk
- **Location**: In `runInstallFromLock` before calling `runAdd`
- **Format**: Convert `owner/repo` to `https://github.com/owner/repo.git`
- **Alternative considered**: Modifying `source-parser.ts` to handle shorthand - rejected because it would affect other flows and the parser already handles full URLs correctly

**Use GitHub as default host for shorthand conversion**
- **Rationale**: The shorthand format (`owner/repo`) is primarily used with GitHub repositories
- **Implementation**: Check if source contains `/` but doesn't start with `http` or `git@`, then prepend `https://github.com/`

**Preserve and append ref to source URL**
- **Rationale**: `runAdd` uses `parseSource` which can parse `source@ref` format. The ref must be appended to the source for it to be recognized.
- **Location**: In `runInstallFromLock` when constructing the source argument
- **Format**: Append ref as `source@declaredRef` or `source@resolvedRef` (e.g., `https://github.com/owner/repo.git@v1.0.0`)
- **Priority**: Use `declaredRef` first (the original user-specified ref), fall back to `resolvedRef` if not available
- **Implementation**: Store ref in `bySource` Map alongside `sourceType`, then append it when calling `runAdd`

## Risks / Trade-offs

**Risk**: Assumes GitHub for all shorthand URLs → **Mitigation**: This matches current usage patterns; generic git URLs with full URLs will work correctly

**Risk**: Hardcoding HTTPS protocol → **Mitigation**: Users can still use full SSH URLs if needed; this only affects shorthand conversion

## Migration Plan

No migration needed. Existing lock files will work correctly after the fix is deployed.
