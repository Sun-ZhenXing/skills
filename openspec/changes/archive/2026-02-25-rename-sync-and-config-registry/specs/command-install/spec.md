## ADDED Requirements

### Requirement: Install command exists as primary command
The system SHALL provide a `skills install` command that installs skills from `skills-lock.json`.

#### Scenario: Install command without arguments
- **WHEN** user runs `skills install`
- **THEN** all skills from `skills-lock.json` are installed to configured agents

#### Scenario: Install specific skills
- **WHEN** user runs `skills install <skill-name>`
- **THEN** only the specified skill is installed from `skills-lock.json`

#### Scenario: Install with dry-run option
- **WHEN** user runs `skills install --dry-run`
- **THEN** the system previews changes without applying them

#### Scenario: Install with force option
- **WHEN** user runs `skills install --force`
- **THEN** all skills are reinstalled even if already present

#### Scenario: Install with yes option
- **WHEN** user runs `skills install --yes`
- **THEN** installation proceeds without confirmation prompts

### Requirement: Sync command is deprecated alias
The system SHALL keep `skills sync` as a backward-compatible alias that shows a deprecation warning.

#### Scenario: Using sync command shows deprecation warning
- **WHEN** user runs `skills sync`
- **THEN** the command executes successfully
- **AND** a deprecation warning is displayed: "Warning: 'sync' is deprecated, use 'install' instead"

#### Scenario: Sync alias has identical functionality
- **WHEN** user runs `skills sync` with any valid options
- **THEN** the behavior is identical to `skills install` with the same options

### Requirement: Experimental commands are removed
The system SHALL NOT provide `experimental_install` or `experimental_sync` commands.

#### Scenario: Experimental install command removed
- **WHEN** user runs `skills experimental_install`
- **THEN** the system displays: "Unknown command: experimental_install"
- **AND** suggests using `skills install` instead

#### Scenario: Experimental sync command removed
- **WHEN** user runs `skills experimental_sync`
- **THEN** the system displays: "Unknown command: experimental_sync"
- **AND** suggests using `skills add` for node_modules sync workflow

### Requirement: Help text updated
The system SHALL display updated help text reflecting the new command structure.

#### Scenario: Help shows install command
- **WHEN** user runs `skills --help`
- **THEN** `install` is listed as the primary command for installing from lock file
- **AND** `sync` is not listed or marked as deprecated
- **AND** `experimental_install` and `experimental_sync` are not listed

#### Scenario: Banner shows install command
- **WHEN** user runs `skills` without arguments
- **THEN** the banner shows `npx skills install` instead of `npx skills sync`
