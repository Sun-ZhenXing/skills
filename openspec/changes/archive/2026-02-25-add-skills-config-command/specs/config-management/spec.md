## ADDED Requirements

### Requirement: Config file storage location
The system SHALL store user configuration in an XDG-compliant location with fallback to `~/.agents/config.json`.

#### Scenario: Config file on Linux/macOS
- **WHEN** the user runs any config command on Linux or macOS
- **THEN** the system uses `$XDG_CONFIG_HOME/skills/config.json` if set, otherwise `~/.config/skills/config.json`

#### Scenario: Config file on Windows
- **WHEN** the user runs any config command on Windows
- **THEN** the system uses `%LOCALAPPDATA%\skills\config.json`

#### Scenario: Legacy fallback
- **WHEN** the config directory does not exist and `~/.agents/` exists
- **THEN** the system uses `~/.agents/config.json` for backward compatibility

### Requirement: Config get command
The system SHALL provide a `skills config get <key>` command that retrieves the current value for a configuration key.

#### Scenario: Get existing config value
- **WHEN** the user runs `skills config get registry`
- **AND** the registry is set to `https://custom.registry.com`
- **THEN** the system outputs `https://custom.registry.com`

#### Scenario: Get unset config value
- **WHEN** the user runs `skills config get registry`
- **AND** the registry is not configured
- **THEN** the system outputs nothing (empty line) and exits with code 0

#### Scenario: Get with environment override
- **WHEN** the user runs `skills config get registry`
- **AND** the config file has `registry` set to `https://file.value.com`
- **AND** the environment variable `SKILLS_REGISTRY` is set to `https://env.value.com`
- **THEN** the system outputs `https://env.value.com` (environment takes precedence)

### Requirement: Config set command
The system SHALL provide a `skills config set <key> <value>` command that sets a configuration value.

#### Scenario: Set new config value
- **WHEN** the user runs `skills config set registry https://my.registry.com`
- **THEN** the config file is updated with the new registry value
- **AND** the system outputs confirmation message

#### Scenario: Update existing config value
- **WHEN** the user runs `skills config set registry https://new.registry.com`
- **AND** registry was previously set to `https://old.registry.com`
- **THEN** the config file is updated with the new value
- **AND** the system outputs confirmation message

#### Scenario: Set with validation warning
- **WHEN** the user runs `skills config set registry not-a-valid-url`
- **THEN** the config file is updated with the value
- **AND** the system outputs a warning about invalid URL format

### Requirement: Config list command
The system SHALL provide a `skills config list` command that displays all configuration values.

#### Scenario: List all config values
- **WHEN** the user runs `skills config list`
- **THEN** the system outputs all configured keys and their values
- **AND** includes both file-based and environment-derived values
- **AND** indicates the source of each value (file, env, default)

#### Scenario: List with no config
- **WHEN** the user runs `skills config list`
- **AND** no configuration values are set
- **THEN** the system outputs a message indicating no configuration is set

### Requirement: Config unset command
The system SHALL provide a `skills config unset <key>` command that removes a configuration key from the config file.

#### Scenario: Unset existing key
- **WHEN** the user runs `skills config unset registry`
- **AND** registry is configured in the config file
- **THEN** the key is removed from the config file
- **AND** the system outputs confirmation message

#### Scenario: Unset non-existent key
- **WHEN** the user runs `skills config unset nonexistent`
- **AND** the key is not in the config file
- **THEN** the system exits with code 0 (no error)
- **AND** the system outputs a message indicating the key was not set

### Requirement: Supported configuration keys
The system SHALL support the following configuration keys:

#### Scenario: Registry configuration
- **WHEN** the user sets `registry` to a valid URL
- **THEN** the system uses this URL as the default registry for skill discovery
- **AND** the default value is `https://add-skill.vercel.sh`

#### Scenario: Timeout configuration
- **WHEN** the user sets `timeout` to a number (in seconds)
- **THEN** the system uses this as the default timeout for network operations
- **AND** the default value is `30`

#### Scenario: Telemetry configuration
- **WHEN** the user sets `telemetry` to `true` or `false`
- **THEN** the system enables or disables telemetry accordingly
- **AND** the default value is `true`
