## 1. Implement GitHub Shorthand Detection

- [x] 1.1 Add `isGitHubShorthand()` function to detect `owner/repo` format
- [x] 1.2 Add unit tests for shorthand detection (positive and negative cases)
- [x] 1.3 Ensure local paths (`./`, `../`, `\`, `C:\`) are not misidentified as shorthand

## 2. Implement URL Resolution

- [x] 2.1 Add `resolveGitHubUrl()` function to convert shorthand to full HTTPS URL
- [x] 2.2 Add unit tests for URL resolution
- [x] 2.3 Ensure full URLs (HTTPS, SSH) pass through unchanged

## 3. Integrate into Git Operations

- [x] 3.1 Modify `git.ts` to resolve shorthand before `git clone`
- [x] 3.2 Ensure `git clone` uses resolved URL
- [x] 3.3 Add integration tests for clone with shorthand source

## 4. Update Sync and Install Flows

- [x] 4.1 Verify `experimental_install` command uses resolved URLs
- [x] 4.2 Verify sync operations use resolved URLs
- [x] 4.3 Test end-to-end with sample lock file containing shorthand

## 5. Testing and Validation

- [x] 5.1 Run existing test suite to ensure no regressions
- [x] 5.2 Add test case for lock file with `wshobson/agents` style source
- [x] 5.3 Verify fix works on Windows, macOS, and Linux
- [x] 5.4 Run `pnpm format` to ensure code formatting
