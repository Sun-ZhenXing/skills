## Why

When `sourceType` is `git` or `github` in the lock file, the `source` field stores only the `owner/repo` shorthand (e.g., `AlexSun/antfu-skills`) instead of a full URL. This causes `skills install` (restoring from lock file) to fail because git clone requires a valid URL, not a shorthand.

Additionally, when installing with a specific tag/branch like `skills add owner/repo@v1.0.0`, the tag information is stored in `declaredRef` but not used during restoration. This causes the wrong version to be installed when restoring from lock file.

## What Changes

- Modify `src/install.ts` to convert `owner/repo` shorthand back to a full git URL when `sourceType` is `git` or `github`
- Handle both HTTPS and SSH URL formats for generic git repositories
- Use `declaredRef` or `resolvedRef` from lock file to checkout the correct version during restoration
- Preserve existing behavior for other source types (`gitlab`, `well-known`, etc.)

## Capabilities

### New Capabilities
- `git-source-url-resolution`: Convert shorthand git repository references to full URLs during lock file restoration

### Modified Capabilities
<!-- No existing spec requirements are changing - this is a bug fix in implementation -->

## Impact

- `src/install.ts`: Update `runInstallFromLock` function to:
  - Convert `owner/repo` shorthand to full HTTPS URLs
  - Append `declaredRef` or `resolvedRef` to source URL when available
- `src/source-parser.ts`: Potentially expose URL conversion utility if needed
- Local lock file (`skills-lock.json`) format remains unchanged
