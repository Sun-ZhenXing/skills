## Why

The skills CLI fails to sync skills from GitHub when the lock file contains shorthand repository references like `wshobson/agents`. The current implementation attempts to clone the repository directly without properly resolving the GitHub shorthand to a full Git URL, causing `git clone` to fail with "repository does not exist" errors.

## What Changes

- Fix the Git source URL resolution to properly convert GitHub shorthand (`owner/repo`) to full Git URLs (`https://github.com/owner/repo.git`)
- Update the lock file handling to ensure `source` field is correctly resolved before Git operations
- Add validation for GitHub shorthand format to prevent invalid repository references
- Ensure backward compatibility with existing lock files that may contain shorthand references

## Capabilities

### New Capabilities
- `github-source-resolution`: Properly resolve GitHub shorthand repository references to full Git URLs during skill installation and sync operations

### Modified Capabilities
- *(none - this is a bug fix that doesn't change spec-level behavior)*

## Impact

- Affected: `src/source-parser.ts`, `src/git.ts`, `src/installer.ts`, `src/sync-lock.ts`
- Users with existing lock files containing GitHub shorthand references will be able to sync skills successfully
- No breaking changes to the CLI interface or lock file format
