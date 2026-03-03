## REMOVED Requirements

### Requirement: ParsedSource SHALL NOT expose redundant ref fields

The `ParsedSource` interface SHALL only expose a single `ref` field for Git ref specification. The redundant `declaredRef`, `resolvedRef`, and `resolvedRevision` fields SHALL be removed from `ParsedSource`.

**Reason**: These fields are always identical to `ref` at parse time (`declaredRef` and `resolvedRef`), or are never populated at parse time (`resolvedRevision`). They exist only in `SkillLockEntry` where they have distinct meanings at installation time.

**Migration**: Consumers of `ParsedSource` SHALL use `parsed.ref` directly instead of `parsed.declaredRef` or `parsed.resolvedRef`. When writing to `SkillLockEntry`, use `parsed.ref` for both `declaredRef` and `resolvedRef` lock fields.

#### Scenario: ParsedSource has no declaredRef field

- **WHEN** `parseSource()` returns a `ParsedSource` for any input containing a `#ref` suffix
- **THEN** the result SHALL contain only `ref` (not `declaredRef` or `resolvedRef`)

#### Scenario: ParsedSource has no resolvedRevision field

- **WHEN** `parseSource()` returns a `ParsedSource` for any input
- **THEN** the result SHALL NOT contain a `resolvedRevision` field
