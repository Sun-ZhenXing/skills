# Implementation Tasks

## 1. Modify Source Parser

- [x] 1.1 Update `parseGenericGitSource` function to remove `@ref` suffix parsing
- [x] 1.2 Keep `#ref` parsing logic for Git ref specification
- [x] 1.3 Ensure SSH URLs with `@` (user@host) are handled correctly
- [x] 1.4 Verify HTTPS URLs still work with `#ref` suffix

## 2. Update Tests

- [x] 2.1 Update test cases in `src/source-parser.test.ts` that use `@ref` for Git ref
- [x] 2.2 Change `@ref` test cases to use `#ref` instead
- [x] 2.3 Add test cases verifying `@ref` is NOT parsed as Git ref
- [x] 2.4 Add test cases for `owner/repo#ref` shorthand syntax
- [x] 2.5 Run all tests and verify they pass

## 3. Update Documentation

- [x] 3.1 Update README.md with new syntax examples
- [x] 3.2 Update AGENTS.md with updated architecture notes
- [x] 3.3 Ensure documentation clearly distinguishes `@ref` (skill name) vs `#ref` (Git ref)

## 4. Verification

- [x] 4.1 Test manual scenarios from the spec
- [x] 4.2 Verify `skills add https://github.com/user/repo.git#v1.0.0` works
- [x] 4.3 Verify `skills add owner/repo@skill-name` works (unchanged)
- [x] 4.4 Verify `skills add owner/repo#ref` works (new feature)
- [x] 4.5 Run full test suite: `pnpm test`
