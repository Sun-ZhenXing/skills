# any-git-repository-source Specification

## Purpose
TBD - created by archiving change support-any-git-repo. Update Purpose after archive.
## Requirements
### Requirement: Accept any accessible Git repository as add source
The `skills add` command SHALL accept a full Git repository locator as input, including HTTPS and SSH forms supported by the local Git client, in addition to existing GitHub shorthand input. For Git repository locators, the command SHALL support an optional trailing `#<ref>` suffix where `<ref>` is a Git tag, branch, or commit hash. Note: the `@<ref>` suffix is no longer supported for specifying Git refs; use `#<ref>` instead.

#### Scenario: Add from HTTPS Git repository
- **WHEN** a user runs `skills add https://git.example.com/team/skill-pack.git`
- **THEN** the CLI clones the repository and continues skill discovery/install flow using that repository content

#### Scenario: Add from SSH Git repository
- **WHEN** a user runs `skills add git@git.example.com:team/skill-pack.git`
- **THEN** the CLI invokes Git clone with the provided SSH locator and continues installation when clone succeeds

#### Scenario: Add from Git repository with explicit ref suffix
- **WHEN** a user runs `skills add https://github.com/user/skills.git#v1.2.3`
- **THEN** the CLI parses `v1.2.3` as the desired Git reference and checks out that reference before skill discovery

#### Scenario: SSH URL keeps user segment while #ref specifies Git ref
- **WHEN** a user runs `skills add git@github.com:user/skills.git#main`
- **THEN** the CLI treats `git@github.com:user/skills.git` as repository locator and `main` as Git reference

### Requirement: Preserve source reference and resolved revision in lock data
For installs originating from a non-local Git repository, the system MUST persist enough source metadata to reproduce or reason about updates, including normalized source locator, source type, declared reference when provided, and resolved revision when available.

#### Scenario: Lock captures metadata for Git source with explicit ref
- **WHEN** a skill is installed from a Git repository with an explicit ref
- **THEN** lock data stores the normalized Git source locator, the declared ref, and the resolved commit revision used for installation

#### Scenario: Lock captures metadata for Git source without explicit ref
- **WHEN** a skill is installed from a Git repository without an explicit ref
- **THEN** lock data stores the normalized Git source locator and resolved revision, and treats declared ref as empty/optional

#### Scenario: Backward compatibility for prior lock entries
- **WHEN** existing lock entries lack newly introduced Git metadata fields
- **THEN** the CLI reads them without failure and treats missing fields as optional

### Requirement: Provide actionable errors for Git source failures
The CLI MUST distinguish and report actionable categories for Git-source installation failures, including repository unreachable, authentication failure, and invalid skill structure.

#### Scenario: Authentication failure during clone
- **WHEN** Git clone fails due to missing or invalid credentials for a private repository
- **THEN** the CLI reports an authentication-focused error message with guidance to verify Git credentials

#### Scenario: Repository cloned but no valid skill found
- **WHEN** clone succeeds but required skill files are not present in the repository
- **THEN** the CLI reports that repository structure is invalid for skills installation

### Requirement: Keep existing GitHub shorthand behavior unchanged
Existing GitHub shorthand and publicly documented `skills add` forms MUST continue to behave as before this change.

#### Scenario: Existing GitHub shorthand remains valid
- **WHEN** a user runs `skills add vercel-labs/agent-skills`
- **THEN** the CLI resolves and installs using the existing GitHub pathway without requiring input changes

### Requirement: Define explicit update behavior for non-GitHub sources
The system MUST provide deterministic `check`/`update` behavior for non-GitHub Git sources, either by performing a supported freshness check or by clearly reporting that automatic freshness detection is unavailable.

#### Scenario: Non-GitHub source with unsupported freshness detection
- **WHEN** a user runs `skills check` for a skill installed from a non-GitHub source where remote freshness cannot be computed
- **THEN** the CLI marks the skill with an explicit manual-update guidance message instead of reporting a false update status

