## Why

The current CLI has inconsistent command naming (`sync` vs `install`) and hardcoded registry URLs that limit flexibility. Users need clearer command semantics and the ability to configure custom skill registries for enterprise or private deployments.

## What Changes

- **BREAKING**: Rename `skills sync` command to `skills install` for clearer semantics
- **BREAKING**: Remove `skills experimental_install` command (functionality merged into `skills install`)
- **BREAKING**: Remove `skills experimental_sync` command (replaced by `skills install`)
- Add configurable registry URL support (default: `https://skills.sh/`)
- Rename `add-skill.vercel.sh` configuration to `update-registry` for clarity
- Update all documentation and help text to reflect new command names

## Capabilities

### New Capabilities
- `configurable-registry`: Allow users to configure custom skill registry URLs via config
- `command-install`: New `skills install` command that replaces sync functionality

### Modified Capabilities
- `skill-installation`: Update installation command from `sync` to `install`
- `registry-configuration`: Rename vercel.sh registry config to `update-registry`

## Impact

- CLI command interface (`src/cli.ts`)
- Configuration management (`src/config.ts`)
- Sync/Install command implementation (`src/sync.ts`, `src/install.ts`)
- Documentation (`README.md`, `AGENTS.md`)
- User scripts and aliases that rely on `sync` command
