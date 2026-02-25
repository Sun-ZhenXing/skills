## ADDED Requirements

### Requirement: Detect GitHub shorthand repository references
The system SHALL detect when a source string is in GitHub shorthand format (`owner/repo`).

#### Scenario: Shorthand format detected
- **WHEN** the source is `wshobson/agents`
- **THEN** the system SHALL recognize it as GitHub shorthand

#### Scenario: Full HTTPS URL not detected as shorthand
- **WHEN** the source is `https://github.com/wshobson/agents.git`
- **THEN** the system SHALL NOT treat it as shorthand

#### Scenario: Full SSH URL not detected as shorthand
- **WHEN** the source is `git@github.com:wshobson/agents.git`
- **THEN** the system SHALL NOT treat it as shorthand

#### Scenario: Local path not detected as shorthand
- **WHEN** the source is `./local/path` or `C:\path\to\repo`
- **THEN** the system SHALL NOT treat it as shorthand

### Requirement: Convert GitHub shorthand to full Git URL
The system SHALL convert detected GitHub shorthand to a full HTTPS Git URL.

#### Scenario: Convert shorthand to HTTPS URL
- **WHEN** the source is `wshobson/agents`
- **THEN** the system SHALL convert it to `https://github.com/wshobson/agents.git`

#### Scenario: Preserve existing full URLs
- **WHEN** the source is already a full URL
- **THEN** the system SHALL use it as-is without modification

### Requirement: Support Git clone with resolved URLs
The system SHALL successfully clone repositories using resolved GitHub URLs.

#### Scenario: Clone from resolved shorthand
- **GIVEN** a lock file contains `"source": "wshobson/agents"`
- **WHEN** the system performs `experimental_install` or sync
- **THEN** the repository SHALL be cloned successfully from `https://github.com/wshobson/agents.git`

#### Scenario: Clone from full URL continues to work
- **GIVEN** a lock file contains `"source": "https://github.com/wshobson/agents.git"`
- **WHEN** the system performs installation
- **THEN** the repository SHALL be cloned successfully
