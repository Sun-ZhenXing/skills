## ADDED Requirements

### Requirement: CLI provides sync command
The system SHALL provide a `skills sync` command that synchronizes local skills with the `skills-lock.json` file.

#### Scenario: User runs sync command
- **WHEN** user executes `skills sync`
- **THEN** the system SHALL read `skills-lock.json` and compare with local skill files
- **AND** display the synchronization status of each skill

#### Scenario: Sync command with help flag
- **WHEN** user executes `skills sync --help`
- **THEN** the system SHALL display available options and usage information

### Requirement: Detect skill synchronization status
The system SHALL detect and categorize each skill's synchronization status as one of: missing, modified, up-to-date, or orphaned.

#### Scenario: Detect missing skill
- **GIVEN** `skills-lock.json` contains skill "my-skill"
- **AND** the skill directory does not exist locally
- **WHEN** sync command runs
- **THEN** the system SHALL categorize "my-skill" as "missing"

#### Scenario: Detect modified skill
- **GIVEN** `skills-lock.json` contains skill "my-skill" with hash "abc123"
- **AND** the skill directory exists locally with different content
- **WHEN** sync command computes the local hash
- **THEN** the system SHALL categorize "my-skill" as "modified"

#### Scenario: Detect up-to-date skill
- **GIVEN** `skills-lock.json` contains skill "my-skill" with hash "abc123"
- **AND** the local skill folder computes to the same hash "abc123"
- **WHEN** sync command runs
- **THEN** the system SHALL categorize "my-skill" as "up-to-date"

#### Scenario: Detect orphaned skill
- **GIVEN** local `.agents/skills/` contains skill "old-skill"
- **AND** `skills-lock.json` does not contain "old-skill"
- **WHEN** sync command runs
- **THEN** the system SHALL categorize "old-skill" as "orphaned"

### Requirement: Support dry-run mode
The system SHALL support a `--dry-run` flag that previews synchronization actions without making any changes.

#### Scenario: Preview sync changes
- **GIVEN** there are missing and modified skills detected
- **WHEN** user executes `skills sync --dry-run`
- **THEN** the system SHALL display what actions would be taken
- **AND** NOT modify any local files or directories

### Requirement: Support force reinstallation
The system SHALL support a `--force` flag that reinstalls all skills regardless of their current status.

#### Scenario: Force sync all skills
- **GIVEN** some skills are up-to-date
- **WHEN** user executes `skills sync --force`
- **THEN** the system SHALL reinstall all skills from their sources
- **AND** overwrite any existing local content

### Requirement: Support selective skill synchronization
The system SHALL support specifying skill names to synchronize only those skills.

#### Scenario: Sync specific skill
- **GIVEN** `skills-lock.json` contains skills "skill-a", "skill-b", and "skill-c"
- **WHEN** user executes `skills sync skill-a skill-c`
- **THEN** the system SHALL only synchronize "skill-a" and "skill-c"
- **AND** ignore "skill-b"

### Requirement: Interactive confirmation
The system SHALL prompt for user confirmation before making changes, unless `--yes` flag is provided.

#### Scenario: Confirm sync operations
- **GIVEN** there are missing or modified skills
- **WHEN** sync command runs without `--yes`
- **THEN** the system SHALL display the list of changes
- **AND** prompt user to confirm before proceeding

#### Scenario: Skip confirmation with yes flag
- **GIVEN** there are missing or modified skills
- **WHEN** user executes `skills sync --yes`
- **THEN** the system SHALL proceed with synchronization without prompting

### Requirement: Update lock file after sync
The system SHALL update `skills-lock.json` after successful synchronization to reflect the current state.

#### Scenario: Update lock file after sync
- **GIVEN** sync completed successfully
- **WHEN** skills are installed or updated
- **THEN** the system SHALL recompute hashes for synchronized skills
- **AND** write updated entries to `skills-lock.json`

### Requirement: Handle different source types
The system SHALL handle skills from different source types (git, npm, local) according to their recorded source information.

#### Scenario: Sync git-based skill
- **GIVEN** lock entry has source type "github" and source URL
- **WHEN** skill needs to be synchronized
- **THEN** the system SHALL clone or pull from the git repository
- **AND** checkout the recorded ref if specified

#### Scenario: Sync npm-based skill
- **GIVEN** lock entry has source type "node_modules"
- **WHEN** skill needs to be synchronized
- **THEN** the system SHALL copy from the node_modules directory

#### Scenario: Sync local skill
- **GIVEN** lock entry has source type "local"
- **WHEN** skill needs to be synchronized
- **THEN** the system SHALL copy from the recorded local path
