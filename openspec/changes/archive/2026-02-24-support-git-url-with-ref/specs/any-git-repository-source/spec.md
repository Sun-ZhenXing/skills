## MODIFIED Requirements

### Requirement: Accept any accessible Git repository as add source
The `skills add` command SHALL accept a full Git repository locator as input, including HTTPS and SSH forms supported by the local Git client, in addition to existing GitHub shorthand input. For Git repository locators, the command SHALL support an optional trailing `@<ref>` suffix where `<ref>` is a Git tag, branch, or commit hash.

#### Scenario: Add from HTTPS Git repository
- **WHEN** a user runs `skills add https://git.example.com/team/skill-pack.git`
- **THEN** the CLI clones the repository and continues skill discovery/install flow using that repository content

#### Scenario: Add from SSH Git repository
- **WHEN** a user runs `skills add git@git.example.com:team/skill-pack.git`
- **THEN** the CLI invokes Git clone with the provided SSH locator and continues installation when clone succeeds

#### Scenario: Add from Git repository with explicit ref suffix
- **WHEN** a user runs `skills add https://github.com/user/skills.git@v1.2.3`
- **THEN** the CLI parses `v1.2.3` as the desired Git reference and checks out that reference before skill discovery

#### Scenario: SSH URL keeps user segment while parsing ref
- **WHEN** a user runs `skills add git@github.com:user/skills.git@main`
- **THEN** the CLI treats `git@github.com:user/skills.git` as repository locator and `main` as reference suffix

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
