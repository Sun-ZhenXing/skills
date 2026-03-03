# Git Ref Syntax Specification

## ADDED Requirements

### Requirement: Generic Git URL SHALL use #ref for Git ref

The system SHALL parse `#ref` suffix in generic Git URLs to specify the Git ref (branch, tag, or commit).

#### Scenario: HTTPS URL with #ref

- **WHEN** the user provides `https://github.com/user/repo.git#v1.0.0`
- **THEN** the system SHALL parse the URL as `https://github.com/user/repo.git` with ref `v1.0.0`

#### Scenario: SSH URL with #ref

- **WHEN** the user provides `git@github.com:user/repo.git#feature-branch`
- **THEN** the system SHALL parse the URL as `git@github.com:user/repo.git` with ref `feature-branch`

#### Scenario: URL with query ref and hash ref

- **WHEN** the user provides `https://github.com/user/repo.git?ref=main#v1.0.0`
- **THEN** the system SHALL use the hash ref `v1.0.0` as the effective ref

### Requirement: Generic Git URL SHALL NOT use @ref for Git ref

The system SHALL NOT parse `@ref` suffix in generic Git URLs as Git ref.

#### Scenario: HTTPS URL with @ref is treated as part of URL

- **WHEN** the user provides `https://github.com/user/repo.git@v1.0.0`
- **THEN** the system SHALL NOT extract `v1.0.0` as the Git ref
- **AND** the URL SHALL be treated as `https://github.com/user/repo.git@v1.0.0` (invalid URL)

#### Scenario: SSH URL with @ref preserves SSH user segment

- **WHEN** the user provides `git@github.com:user/repo.git@main`
- **THEN** the system SHALL preserve `git@github.com:user/repo.git@main` without extracting `main` as ref

### Requirement: GitHub shorthand SHALL support @skill-name

The system SHALL support `@skill-name` suffix in GitHub shorthand to specify a skill name within the repository.

#### Scenario: Shorthand with @skill-name

- **WHEN** the user provides `owner/repo@my-skill`
- **THEN** the system SHALL parse owner as `owner`, repo as `repo`, and skillFilter as `my-skill`

#### Scenario: Shorthand without @skill-name

- **WHEN** the user provides `owner/repo`
- **THEN** the system SHALL parse owner as `owner`, repo as `repo`, with no skillFilter

### Requirement: GitHub shorthand SHALL support #ref for Git ref

The system SHALL support `#ref` suffix in GitHub shorthand to specify the Git ref.

#### Scenario: Shorthand with #ref

- **WHEN** the user provides `owner/repo#v1.0.0`
- **THEN** the system SHALL parse owner as `owner`, repo as `repo`, and ref as `v1.0.0`

### Requirement: SCP-like URL SHALL use #ref for Git ref

The system SHALL parse `#ref` suffix in SCP-like Git URLs to specify the Git ref.

#### Scenario: SCP-like URL with #ref

- **WHEN** the user provides `git@github.com:user/repo.git#develop`
- **THEN** the system SHALL parse the URL as `git@github.com:user/repo.git` with ref `develop`
