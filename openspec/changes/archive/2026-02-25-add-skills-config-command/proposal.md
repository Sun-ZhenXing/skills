## Why

Currently, the `skills` CLI relies on environment variables or hardcoded defaults for configuration values like Registry addresses. This makes it inconvenient for users who need to customize these settings persistently. A dedicated `skills config` command will allow users to easily view and modify default configuration values, improving the user experience.

## What Changes

- Add a new `skills config` command that allows users to manage configuration settings
- Support `skills config get <key>` to retrieve configuration values
- Support `skills config set <key> <value>` to set configuration values
- Support `skills config list` to show all current configuration values
- Support `skills config unset <key>` to remove a configuration value
- Store configuration in a user-specific config file (e.g., `~/.agents/config.json` or XDG-compliant location)
- Configuration keys to support initially:
  - `registry` - Default registry URL for skill discovery
  - `timeout` - Default timeout for network operations
  - `telemetry` - Enable/disable telemetry

## Capabilities

### New Capabilities
- `config-management`: User configuration management for skills CLI defaults

### Modified Capabilities
- None (this is a new feature that doesn't modify existing spec requirements)

## Impact

- New source files: `src/config.ts`, `src/config.test.ts`
- CLI command routing in `src/cli.ts` to handle config subcommands
- New configuration storage layer alongside existing lock file management
- No breaking changes to existing commands or APIs
