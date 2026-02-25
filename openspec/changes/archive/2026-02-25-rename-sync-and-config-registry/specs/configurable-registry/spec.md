## ADDED Requirements

### Requirement: Registry config for skill discovery
The system SHALL support a `registry` configuration key for the skill discovery registry URL.

#### Scenario: Default registry value
- **WHEN** user checks the default registry config
- **THEN** the value is `https://skills.sh/`

#### Scenario: Set custom registry
- **WHEN** user runs `skills config set registry https://my-registry.example.com`
- **THEN** the registry URL is persisted to config
- **AND** subsequent skill discovery operations use the custom registry

#### Scenario: Registry environment variable
- **WHEN** environment variable `SKILLS_REGISTRY` is set to `https://env-registry.example.com`
- **THEN** the system uses the environment variable value
- **AND** the environment variable takes precedence over config file

### Requirement: Update-registry config for update checking
The system SHALL support an `update-registry` configuration key for the update checking service.

#### Scenario: Default update-registry value
- **WHEN** user checks the default update-registry config
- **THEN** the value is `https://add-skill.vercel.sh`

#### Scenario: Set custom update-registry
- **WHEN** user runs `skills config set update-registry https://my-updates.example.com`
- **THEN** the update registry URL is persisted to config
- **AND** subsequent update check operations use the custom registry

#### Scenario: Update-registry environment variable
- **WHEN** environment variable `SKILLS_UPDATE_REGISTRY` is set
- **THEN** the system uses the environment variable value
- **AND** the environment variable takes precedence over config file

### Requirement: Backward compatibility for old registry config
The system SHALL support the legacy `registry` config key as a fallback for `update-registry`.

#### Scenario: Old registry config still works
- **GIVEN** user has `registry` set to `https://old-registry.example.com` in config
- **AND** `update-registry` is not set
- **WHEN** the system needs the update registry URL
- **THEN** the value from `registry` is used
- **AND** a deprecation warning is displayed

#### Scenario: New update-registry takes precedence
- **GIVEN** user has both `registry` and `update-registry` set in config
- **WHEN** the system needs the update registry URL
- **THEN** the value from `update-registry` is used
- **AND** no deprecation warning is shown

### Requirement: Config validation
The system SHALL validate registry URLs before saving.

#### Scenario: Invalid registry URL rejected
- **WHEN** user runs `skills config set registry not-a-valid-url`
- **THEN** the system displays an error: "Invalid URL format"
- **AND** the config is not updated

#### Scenario: Registry URL must use HTTPS
- **WHEN** user runs `skills config set registry http://insecure.example.com`
- **THEN** the system displays a warning: "Warning: Using non-HTTPS registry"
- **AND** the config is updated (warning only, not blocking)

### Requirement: Config list shows both registries
The system SHALL display both registry configurations in the config list.

#### Scenario: Config list shows registries
- **WHEN** user runs `skills config list`
- **THEN** both `registry` and `update-registry` are listed with their values and sources
- **AND** clear descriptions distinguish their purposes
