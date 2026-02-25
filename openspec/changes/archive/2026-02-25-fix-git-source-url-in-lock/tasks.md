## 1. Implementation

- [x] 1.1 Add helper function to detect git shorthand format (`owner/repo`)
- [x] 1.2 Add helper function to convert shorthand to full HTTPS URL
- [x] 1.3 Update `bySource` Map to store ref information (`declaredRef`, `resolvedRef`)
- [x] 1.4 Modify `runInstallFromLock` to convert git sources before calling `runAdd`
- [x] 1.5 Modify `runInstallFromLock` to append ref to source URL when available

## 2. Testing

- [x] 2.1 Test restoration from lock file with `sourceType: git` and shorthand source
- [x] 2.2 Test restoration from lock file with `sourceType: git` and full URL source
- [x] 2.3 Test restoration from lock file with `sourceType: github` and shorthand source
- [x] 2.4 Test restoration with `declaredRef` present (e.g., `v1.0.0`)
- [x] 2.5 Test restoration with `resolvedRef` present but no `declaredRef`
- [x] 2.6 Test restoration with no ref fields present
- [x] 2.7 Test restoration from lock file with other source types remain unchanged

## 3. Verification

- [x] 3.1 Run existing test suite to ensure no regressions
- [x] 3.2 Format code with `pnpm format`
