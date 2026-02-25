## 1. Core Configuration Module

- [x] 1.1 Create `src/config.ts` with config file path resolution (XDG-compliant)
- [x] 1.2 Implement `readConfig()` function to load and parse config file
- [x] 1.3 Implement `writeConfig()` function to save config file
- [x] 1.4 Implement `getConfigValue(key)` with environment variable override support
- [x] 1.5 Implement `setConfigValue(key, value)` with basic validation
- [x] 1.6 Implement `unsetConfigValue(key)` to remove configuration keys

## 2. Config Command Implementation

- [x] 2.1 Add `config` command routing in `src/cli.ts`
- [x] 2.2 Implement `skills config get <key>` subcommand
- [x] 2.3 Implement `skills config set <key> <value>` subcommand with validation warnings
- [x] 2.4 Implement `skills config list` subcommand showing all values with sources
- [x] 2.5 Implement `skills config unset <key>` subcommand

## 3. Configuration Keys Support

- [x] 3.1 Define configuration schema with supported keys (registry, timeout, telemetry)
- [x] 3.2 Implement default values for all configuration keys
- [x] 3.3 Integrate config values into existing commands (registry for skill discovery, etc.)

## 4. Testing

- [x] 4.1 Create `src/config.test.ts` with unit tests for config module
- [x] 4.2 Add tests for config file path resolution on different platforms
- [x] 4.3 Add tests for get/set/unset operations
- [x] 4.4 Add tests for environment variable override behavior
- [ ] 4.5 Add integration tests for CLI config commands

## 5. Documentation

- [x] 5.1 Update README.md with `skills config` command documentation
- [x] 5.2 Add usage examples for each config subcommand
- [x] 5.3 Document configuration priority (env > config file > defaults)
