## Context

The skills CLI stores skill sources in the lock file. When a skill is added from a GitHub repository using shorthand notation (e.g., `wshobson/agents`), this shorthand is stored in the lock file's `source` field. During `skills experimental_install` or sync operations, the CLI attempts to clone this source directly without converting it to a proper Git URL.

Current flow:
1. Lock file contains: `"source": "wshobson/agents"`
2. Installer passes this directly to `git clone`
3. Git fails: `fatal: repository 'wshobson/agents' does not exist`

The fix needs to detect GitHub shorthand format and convert it to a full Git URL before cloning.

## Goals / Non-Goals

**Goals:**
- Properly resolve GitHub shorthand (`owner/repo`) to full Git URLs (`https://github.com/owner/repo.git`)
- Support both HTTPS and SSH Git URL formats
- Maintain backward compatibility with existing lock files
- Fix the sync/install flow without changing the lock file format

**Non-Goals:**
- Changing the lock file schema or format
- Adding support for non-GitHub Git hosts (GitLab, Bitbucket, etc.)
- Modifying how skills are added (only fixing how they're installed/synced)

## Decisions

### Decision: Where to apply the fix
**Choice:** Apply URL resolution in `git.ts` before calling `git clone`

**Rationale:**
- Centralizes Git URL handling in one place
- Ensures all Git operations benefit from the fix
- Avoids duplicating logic across installer and sync modules

**Alternative considered:** Resolve in `source-parser.ts` when reading lock file
- Rejected: Would require changes to lock file structure or temporary mutation

### Decision: GitHub shorthand detection pattern
**Choice:** Use regex pattern `^[a-zA-Z0-9_.-]+/[a-zA-Z0-9_.-]+$`

**Rationale:**
- Matches GitHub username/repo format
- Excludes full URLs (which contain `://` or `@`)
- Excludes local paths (which may start with `.`, `/`, or contain `\`)

### Decision: URL format for resolved shorthand
**Choice:** Convert to `https://github.com/{owner}/{repo}.git`

**Rationale:**
- HTTPS is more firewall-friendly than SSH
- Matches the format used elsewhere in the codebase
- `.git` suffix ensures consistent behavior with full Git URLs

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| False positives: Local paths like `my/repo` might be misinterpreted | Check for path separators (`\`, `./`, `../`) before applying shorthand detection |
| GitHub Enterprise repos won't work | Out of scope - this fix targets github.com only |
| Existing workarounds might break | Ensure the fix only transforms unambiguous shorthand patterns |

## Migration Plan

No migration needed. This is a backward-compatible bug fix:
- Existing lock files continue to work
- New installations will work correctly
- No user action required

## Open Questions

- Should we support `github:owner/repo` prefix format? (Not for this fix - keep it simple)
- Should we cache resolved URLs in the lock file? (No - keep lock file format unchanged)
