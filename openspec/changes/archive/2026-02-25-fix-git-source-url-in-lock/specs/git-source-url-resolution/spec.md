## ADDED Requirements

### Requirement: Convert git shorthand to full URL during lock restoration
When restoring skills from the local lock file, the system SHALL convert `owner/repo` shorthand format to a full HTTPS URL for `sourceType: git` or `sourceType: github` entries.

#### Scenario: Git shorthand source in lock file
- **WHEN** the lock file contains a skill with `sourceType: git` and `source: "owner/repo"`
- **THEN** the system SHALL convert the source to `https://github.com/owner/repo.git` before cloning

#### Scenario: GitHub shorthand source in lock file
- **WHEN** the lock file contains a skill with `sourceType: github` and `source: "owner/repo"`
- **THEN** the system SHALL convert the source to `https://github.com/owner/repo.git` before cloning

#### Scenario: Full URL git source in lock file
- **WHEN** the lock file contains a skill with `sourceType: git` and a full URL `source: "https://example.com/repo.git"`
- **THEN** the system SHALL use the URL as-is without modification

#### Scenario: SSH format git source in lock file
- **WHEN** the lock file contains a skill with `sourceType: git` and SSH format `source: "git@github.com:owner/repo.git"`
- **THEN** the system SHALL use the URL as-is without modification

### Requirement: Preserve and use ref when restoring from lock file
When restoring skills from the local lock file, the system SHALL use the `declaredRef` or `resolvedRef` field to checkout the correct version.

#### Scenario: Lock file has declaredRef
- **WHEN** the lock file contains a skill with `declaredRef: "v1.0.0"`
- **THEN** the system SHALL append `@v1.0.0` to the source URL when calling runAdd

#### Scenario: Lock file has resolvedRef but no declaredRef
- **WHEN** the lock file contains a skill without `declaredRef` but with `resolvedRef: "main"`
- **THEN** the system SHALL append `@main` to the source URL when calling runAdd

#### Scenario: Lock file has no ref fields
- **WHEN** the lock file contains a skill without `declaredRef` and `resolvedRef`
- **THEN** the system SHALL use the source URL as-is without appending any ref
