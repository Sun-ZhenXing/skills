## Context

The `skills` CLI currently uses environment variables or hardcoded defaults for configuration. For example, the registry URL and telemetry settings are either set via environment variables or use built-in defaults. This approach has limitations:
- Users need to remember to set environment variables for every shell session
- No centralized way to view or manage configuration
- Configuration is not persisted across sessions

This design introduces a `skills config` command that provides a git-config-like interface for managing user preferences.

## Goals / Non-Goals

**Goals:**
- Provide a simple CLI interface for viewing and modifying configuration
- Support persistent storage of user preferences in a config file
- Follow XDG Base Directory Specification for config file location
- Support key configuration values: registry URL, timeout, telemetry
- Maintain backward compatibility with existing environment variable overrides

**Non-Goals:**
- Configuration at the project/workspace level (only user-level config)
- Complex configuration schemas or nested objects
- Configuration encryption or secrets management
- Remote configuration synchronization

## Decisions

### Config Storage Location
**Decision**: Use XDG-compliant path with fallback to `~/.agents/config.json`

**Rationale**: 
- Follows modern Linux/Unix conventions
- Windows support through appropriate environment variables
- Consistent with existing `~/.agents/` directory used for skills storage

**Alternatives considered**:
- `~/.skillsrc` - Not structured, harder to parse programmatically
- Windows Registry - Platform-specific, adds complexity

### Config Format
**Decision**: JSON format for simplicity

**Rationale**:
- Easy to read and write programmatically
- Native support in Node.js/TypeScript
- Users can manually edit if needed

**Alternatives considered**:
- YAML - Adds dependency, more complex
- TOML - Less common in Node.js ecosystem
- INI - Less structured

### Priority Order
**Decision**: Environment variables > Config file > Hardcoded defaults

**Rationale**:
- Allows temporary overrides via env vars
- Persistent settings via config file
- Sensible defaults when neither is set

### Command Interface
**Decision**: Git-style subcommands (`skills config get`, `skills config set`, etc.)

**Rationale**:
- Familiar to developers
- Clear separation of operations
- Easy to extend with additional subcommands

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Users manually editing config.json and creating syntax errors | Validate JSON on read, show helpful error message |
| Config file permissions issues on shared systems | Document that config may contain sensitive URLs; users should set appropriate permissions |
| Confusion between config and lock files | Clear documentation: config is for user preferences, lock files track installed skills |
| Migration from environment-only workflow | Continue supporting env vars as overrides; config is additive |

## Migration Plan

No migration needed - this is a new feature. Existing environment variable usage continues to work.

## Open Questions

1. Should we support `--global` vs `--local` config (like git)? 
   - **Decision**: Start with global only, local config can be added later if requested

2. Should we validate config values on set?
   - **Decision**: Basic validation (e.g., valid URL format for registry), but allow invalid values with a warning
