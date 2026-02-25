#!/usr/bin/env node

import { spawn, spawnSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { basename, join, dirname } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import * as p from '@clack/prompts';
import { runAdd, parseAddOptions, initTelemetry } from './add.ts';
import { runFind } from './find.ts';
import { runInstallFromLock } from './install.ts';
import { runList } from './list.ts';
import { removeCommand, parseRemoveOptions } from './remove.ts';
import { runSync, parseSyncOptions as parseExperimentalSyncOptions } from './sync.ts';
import {
  syncAllSkills,
  detectSyncStatus,
  parseSyncOptions,
  type SyncOptions,
} from './sync-lock.ts';
import { track } from './telemetry.ts';
import { fetchSkillFolderHash, getGitHubToken } from './skill-lock.ts';
import {
  getConfigValue,
  getAllConfigValues,
  setConfigValue,
  unsetConfigValue,
  validateConfigValue,
  formatConfigValue,
  isValidConfigKey,
  getValidConfigKeys,
  getDefaultValue,
  getEnvVarName,
  getConfigPath,
  getConfig,
  type ConfigKey,
} from './config.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

const VERSION = getVersion();
initTelemetry(VERSION);

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
// 256-color grays - visible on both light and dark backgrounds
const DIM = '\x1b[38;5;102m'; // darker gray for secondary text
const TEXT = '\x1b[38;5;145m'; // lighter gray for primary text

const LOGO_LINES = [
  '███████╗██╗  ██╗██╗██╗     ██╗     ███████╗',
  '██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝',
  '███████╗█████╔╝ ██║██║     ██║     ███████╗',
  '╚════██║██╔═██╗ ██║██║     ██║     ╚════██║',
  '███████║██║  ██╗██║███████╗███████╗███████║',
  '╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝',
];

// 256-color middle grays - visible on both light and dark backgrounds
const GRAYS = [
  '\x1b[38;5;250m', // lighter gray
  '\x1b[38;5;248m',
  '\x1b[38;5;245m', // mid gray
  '\x1b[38;5;243m',
  '\x1b[38;5;240m',
  '\x1b[38;5;238m', // darker gray
];

function showLogo(): void {
  console.log();
  LOGO_LINES.forEach((line, i) => {
    console.log(`${GRAYS[i]}${line}${RESET}`);
  });
}

function showBanner(): void {
  showLogo();
  console.log();
  console.log(`${DIM}The open agent skills ecosystem${RESET}`);
  console.log();
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills add ${DIM}<package>${RESET}        ${DIM}Add a new skill${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills remove${RESET}               ${DIM}Remove installed skills${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills list${RESET}                 ${DIM}List installed skills${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills find ${DIM}[query]${RESET}         ${DIM}Search for skills${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills config${RESET}              ${DIM}Manage configuration${RESET}`
  );
  console.log();
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills check${RESET}                ${DIM}Check for updates${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills update${RESET}               ${DIM}Update all skills${RESET}`
  );
  console.log();
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills sync${RESET}                 ${DIM}Sync skills from skills-lock.json${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills init ${DIM}[name]${RESET}          ${DIM}Create a new skill${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills experimental_install${RESET} ${DIM}Restore from skills-lock.json${RESET}`
  );
  console.log(
    `  ${DIM}$${RESET} ${TEXT}npx skills experimental_sync${RESET}    ${DIM}Sync skills from node_modules${RESET}`
  );
  console.log();
  console.log(`${DIM}try:${RESET} npx skills add vercel-labs/agent-skills`);
  console.log();
  console.log(`Discover more skills at ${TEXT}https://skills.sh/${RESET}`);
  console.log();
}

function showHelp(): void {
  console.log(`
${BOLD}Usage:${RESET} skills <command> [options]

${BOLD}Manage Skills:${RESET}
  add <package>        Add a skill package (alias: a)
                       e.g. vercel-labs/agent-skills
                            https://github.com/vercel-labs/agent-skills
  remove [skills]      Remove installed skills
  list, ls             List installed skills
  find [query]         Search for skills interactively

${BOLD}Configuration:${RESET}
  config get <key>     Get a config value
  config set <key> <val> Set a config value
  config list          List all config values
  config unset <key>   Remove a config value

${BOLD}Updates:${RESET}
  check                Check for available skill updates
  update               Update all skills to latest versions

${BOLD}Project:${RESET}
  sync [skills...]     Sync skills from skills-lock.json
  init [name]          Initialize a skill (creates <name>/SKILL.md or ./SKILL.md)
  experimental_install Restore skills from skills-lock.json (legacy)
  experimental_sync    Sync skills from node_modules into agent directories

${BOLD}Add Options:${RESET}
  -g, --global           Install skill globally (user-level) instead of project-level
  -a, --agent <agents>   Specify agents to install to (use '*' for all agents)
  -s, --skill <skills>   Specify skill names to install (use '*' for all skills)
  -l, --list             List available skills in the repository without installing
  -y, --yes              Skip confirmation prompts
  --copy                 Copy files instead of symlinking to agent directories
  --all                  Shorthand for --skill '*' --agent '*' -y
  --full-depth           Search all subdirectories even when a root SKILL.md exists

${BOLD}Remove Options:${RESET}
  -g, --global           Remove from global scope
  -a, --agent <agents>   Remove from specific agents (use '*' for all agents)
  -s, --skill <skills>   Specify skills to remove (use '*' for all skills)
  -y, --yes              Skip confirmation prompts
  --all                  Shorthand for --skill '*' --agent '*' -y
  
${BOLD}Sync Options:${RESET}
  -d, --dry-run          Preview changes without applying them
  -f, --force            Force reinstallation of all skills
  -y, --yes              Skip confirmation prompts
  -g, --global           Sync global skills

${BOLD}Experimental Sync Options:${RESET}
  -a, --agent <agents>   Specify agents to install to (use '*' for all agents)
  -y, --yes              Skip confirmation prompts

${BOLD}List Options:${RESET}
  -g, --global           List global skills (default: project)
  -a, --agent <agents>   Filter by specific agents

${BOLD}Options:${RESET}
  --help, -h        Show this help message
  --version, -v     Show version number

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} skills add vercel-labs/agent-skills
  ${DIM}$${RESET} skills add vercel-labs/agent-skills -g
  ${DIM}$${RESET} skills add vercel-labs/agent-skills --agent claude-code cursor
  ${DIM}$${RESET} skills add vercel-labs/agent-skills --skill pr-review commit
  ${DIM}$${RESET} skills remove                        ${DIM}# interactive remove${RESET}
  ${DIM}$${RESET} skills remove web-design             ${DIM}# remove by name${RESET}
  ${DIM}$${RESET} skills rm --global frontend-design
  ${DIM}$${RESET} skills list                          ${DIM}# list project skills${RESET}
  ${DIM}$${RESET} skills ls -g                         ${DIM}# list global skills${RESET}
  ${DIM}$${RESET} skills ls -a claude-code             ${DIM}# filter by agent${RESET}
  ${DIM}$${RESET} skills find                          ${DIM}# interactive search${RESET}
  ${DIM}$${RESET} skills find typescript               ${DIM}# search by keyword${RESET}
  ${DIM}$${RESET} skills check
  ${DIM}$${RESET} skills update
  ${DIM}$${RESET} skills sync                           ${DIM}# sync all skills from lock file${RESET}
  ${DIM}$${RESET} skills sync --dry-run                 ${DIM}# preview changes${RESET}
  ${DIM}$${RESET} skills sync --force                   ${DIM}# force reinstall all skills${RESET}
  ${DIM}$${RESET} skills sync my-skill                  ${DIM}# sync specific skill${RESET}
  ${DIM}$${RESET} skills sync -y                        ${DIM}# sync without prompts${RESET}
  ${DIM}$${RESET} skills experimental_install            ${DIM}# restore from skills-lock.json (legacy)${RESET}
  ${DIM}$${RESET} skills init my-skill
  ${DIM}$${RESET} skills experimental_sync              ${DIM}# sync from node_modules${RESET}
  ${DIM}$${RESET} skills experimental_sync -y           ${DIM}# sync without prompts${RESET}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}

function showRemoveHelp(): void {
  console.log(`
${BOLD}Usage:${RESET} skills remove [skills...] [options]

${BOLD}Description:${RESET}
  Remove installed skills from agents. If no skill names are provided,
  an interactive selection menu will be shown.

${BOLD}Arguments:${RESET}
  skills            Optional skill names to remove (space-separated)

${BOLD}Options:${RESET}
  -g, --global       Remove from global scope (~/) instead of project scope
  -a, --agent        Remove from specific agents (use '*' for all agents)
  -s, --skill        Specify skills to remove (use '*' for all skills)
  -y, --yes          Skip confirmation prompts
  --all              Shorthand for --skill '*' --agent '*' -y

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} skills config get registry             ${DIM}# get registry URL${RESET}
  ${DIM}$${RESET} skills config set registry https://...   ${DIM}# set registry URL${RESET}
  ${DIM}$${RESET} skills config list                       ${DIM}# list all config values${RESET}
  ${DIM}$${RESET} skills config unset timeout              ${DIM}# remove timeout config${RESET}
  ${DIM}$${RESET} skills remove                           ${DIM}# interactive selection${RESET}
  ${DIM}$${RESET} skills remove my-skill                   ${DIM}# remove specific skill${RESET}
  ${DIM}$${RESET} skills remove skill1 skill2 -y           ${DIM}# remove multiple skills${RESET}
  ${DIM}$${RESET} skills remove --global my-skill          ${DIM}# remove from global scope${RESET}
  ${DIM}$${RESET} skills rm --agent claude-code my-skill   ${DIM}# remove from specific agent${RESET}
  ${DIM}$${RESET} skills remove --all                      ${DIM}# remove all skills${RESET}
  ${DIM}$${RESET} skills remove --skill '*' -a cursor      ${DIM}# remove all skills from cursor${RESET}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}

function showConfigHelp(): void {
  console.log(`
${BOLD}Usage:${RESET} skills config <command> [options]

${BOLD}Description:${RESET}
  Manage skills CLI configuration settings.

${BOLD}Commands:${RESET}
  get <key>          Get the value of a config key
  set <key> <value>  Set the value of a config key
  list               List all config values and their sources
  unset <key>        Remove a config key (revert to default)

${BOLD}Configuration Keys:${RESET}
  registry           Default registry URL for skill discovery
                     Default: https://add-skill.vercel.sh
                     Env: SKILLS_REGISTRY

  timeout            Default timeout for network operations (seconds)
                     Default: 30
                     Env: SKILLS_TIMEOUT

  telemetry          Enable/disable anonymous usage telemetry
                     Default: true
                     Env: SKILLS_TELEMETRY

${BOLD}Priority:${RESET}
  Environment variables > Config file > Default values

${BOLD}Config File Location:${RESET}
  ${DIM}•${RESET} Linux/macOS: ~/.config/skills/config.json (or $XDG_CONFIG_HOME/skills/config.json)
  ${DIM}•${RESET} Windows: %LOCALAPPDATA%\\skills\\config.json

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} skills config get registry              ${DIM}# get current registry${RESET}
  ${DIM}$${RESET} skills config set registry https://...    ${DIM}# set custom registry${RESET}
  ${DIM}$${RESET} skills config set timeout 60              ${DIM}# set timeout to 60 seconds${RESET}
  ${DIM}$${RESET} skills config set telemetry false         ${DIM}# disable telemetry${RESET}
  ${DIM}$${RESET} skills config list                        ${DIM}# show all config values${RESET}
  ${DIM}$${RESET} skills config unset registry              ${DIM}# remove registry config${RESET}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}

// ============================================
// Config Command
// ============================================

function runConfig(args: string[]): void {
  const subcommand = args[0];
  const restArgs = args.slice(1);

  switch (subcommand) {
    case 'get':
      runConfigGet(restArgs);
      break;
    case 'set':
      runConfigSet(restArgs);
      break;
    case 'list':
      runConfigList();
      break;
    case 'unset':
      runConfigUnset(restArgs);
      break;
    case '--help':
    case '-h':
    case undefined:
    case '':
      showConfigHelp();
      break;
    default:
      console.log(`${BOLD}Unknown config command: ${subcommand}${RESET}`);
      console.log(`Run ${BOLD}skills config --help${RESET} for usage.`);
      process.exit(1);
  }
}

function runConfigGet(args: string[]): void {
  const key = args[0];

  if (!key) {
    console.log(`${BOLD}Error: Missing config key${RESET}`);
    console.log(`Usage: skills config get <key>`);
    console.log(`Run ${BOLD}skills config --help${RESET} for available keys.`);
    process.exit(1);
  }

  if (!isValidConfigKey(key)) {
    console.log(`${BOLD}Error: Unknown config key: ${key}${RESET}`);
    console.log(`Valid keys: ${getValidConfigKeys().join(', ')}`);
    process.exit(1);
  }

  const { value } = getConfigValue(key as ConfigKey);
  console.log(formatConfigValue(value));
}

function runConfigSet(args: string[]): void {
  const key = args[0];
  const value = args[1];

  if (!key) {
    console.log(`${BOLD}Error: Missing config key${RESET}`);
    console.log(`Usage: skills config set <key> <value>`);
    console.log(`Run ${BOLD}skills config --help${RESET} for available keys.`);
    process.exit(1);
  }

  if (!isValidConfigKey(key)) {
    console.log(`${BOLD}Error: Unknown config key: ${key}${RESET}`);
    console.log(`Valid keys: ${getValidConfigKeys().join(', ')}`);
    process.exit(1);
  }

  if (value === undefined) {
    console.log(`${BOLD}Error: Missing config value${RESET}`);
    console.log(`Usage: skills config set ${key} <value>`);
    process.exit(1);
  }

  // Validate the value
  const validation = validateConfigValue(key as ConfigKey, value);
  if (!validation.valid && validation.warning) {
    console.warn(`Warning: ${validation.warning}`);
  }

  // Parse and set the value
  const parsedValue = parseConfigSetValue(key as ConfigKey, value);
  setConfigValue(key as ConfigKey, parsedValue);

  const envVar = getEnvVarName(key as ConfigKey);
  console.log(`${TEXT}✓ Set ${key} to ${DIM}${formatConfigValue(parsedValue)}${RESET}`);
  console.log();
  console.log(`${DIM}Note: Environment variable ${envVar} will override this value.${RESET}`);
}

function runConfigList(): void {
  const values = getAllConfigValues();
  const configPath = getConfigPath();

  console.log();
  console.log(`${BOLD}Configuration:${RESET}`);
  console.log(`${DIM}Config file: ${configPath}${RESET}`);
  console.log();

  const keys = getValidConfigKeys();
  let hasAnyValue = false;

  for (const key of keys) {
    const { value, source } = values[key];
    const formattedValue = formatConfigValue(value);
    const sourceLabel = {
      env: `${DIM}(environment)${RESET}`,
      file: `${DIM}(config file)${RESET}`,
      default: `${DIM}(default)${RESET}`,
    }[source];

    if (value !== undefined) {
      hasAnyValue = true;
      console.log(`  ${TEXT}${key}${RESET} = ${formattedValue} ${sourceLabel}`);
    }
  }

  if (!hasAnyValue) {
    console.log(`  ${DIM}No configuration values set.${RESET}`);
  }

  console.log();
  console.log(`${DIM}Priority: Environment variables > Config file > Default values${RESET}`);
  console.log();
}

function runConfigUnset(args: string[]): void {
  const key = args[0];

  if (!key) {
    console.log(`${BOLD}Error: Missing config key${RESET}`);
    console.log(`Usage: skills config unset <key>`);
    console.log(`Run ${BOLD}skills config --help${RESET} for available keys.`);
    process.exit(1);
  }

  if (!isValidConfigKey(key)) {
    console.log(`${BOLD}Error: Unknown config key: ${key}${RESET}`);
    console.log(`Valid keys: ${getValidConfigKeys().join(', ')}`);
    process.exit(1);
  }

  const existed = unsetConfigValue(key as ConfigKey);

  if (existed) {
    console.log(`${TEXT}✓ Removed ${key} from config${RESET}`);
  } else {
    console.log(`${DIM}${key} was not set in config file${RESET}`);
  }
}

/**
 * Parse a string value into the appropriate type for a config key
 */
function parseConfigSetValue(key: ConfigKey, value: string): string | number | boolean {
  switch (key) {
    case 'timeout':
      return Number(value);
    case 'telemetry':
      return ['true', '1'].includes(value.toLowerCase());
    case 'registry':
    default:
      return value;
  }
}

function runInit(args: string[]): void {
  const cwd = process.cwd();
  const skillName = args[0] || basename(cwd);
  const hasName = args[0] !== undefined;

  const skillDir = hasName ? join(cwd, skillName) : cwd;
  const skillFile = join(skillDir, 'SKILL.md');
  const displayPath = hasName ? `${skillName}/SKILL.md` : 'SKILL.md';

  if (existsSync(skillFile)) {
    console.log(`${TEXT}Skill already exists at ${DIM}${displayPath}${RESET}`);
    return;
  }

  if (hasName) {
    mkdirSync(skillDir, { recursive: true });
  }

  const skillContent = `---
name: ${skillName}
description: A brief description of what this skill does
---

# ${skillName}

Instructions for the agent to follow when this skill is activated.

## When to use

Describe when this skill should be used.

## Instructions

1. First step
2. Second step
3. Additional steps as needed
`;

  writeFileSync(skillFile, skillContent);

  console.log(`${TEXT}Initialized skill: ${DIM}${skillName}${RESET}`);
  console.log();
  console.log(`${DIM}Created:${RESET}`);
  console.log(`  ${displayPath}`);
  console.log();
  console.log(`${DIM}Next steps:${RESET}`);
  console.log(`  1. Edit ${TEXT}${displayPath}${RESET} to define your skill instructions`);
  console.log(
    `  2. Update the ${TEXT}name${RESET} and ${TEXT}description${RESET} in the frontmatter`
  );
  console.log();
  console.log(`${DIM}Publishing:${RESET}`);
  console.log(
    `  ${DIM}GitHub:${RESET}  Push to a repo, then ${TEXT}npx skills add <owner>/<repo>${RESET}`
  );
  console.log(
    `  ${DIM}URL:${RESET}     Host the file, then ${TEXT}npx skills add https://example.com/${displayPath}${RESET}`
  );
  console.log();
  console.log(`Browse existing skills for inspiration at ${TEXT}https://skills.sh/${RESET}`);
  console.log();
}

// ============================================
// Check and Update Commands
// ============================================

const AGENTS_DIR = '.agents';
const LOCK_FILE = '.skill-lock.json';
const CURRENT_LOCK_VERSION = 3; // Bumped from 2 to 3 for folder hash support

/**
 * Get the check updates API URL from config or default
 */
function getCheckUpdatesApiUrl(): string {
  const registry = getConfig('registry');
  if (typeof registry === 'string' && registry) {
    // If registry is set, use it as base URL
    return `${registry.replace(/\/$/, '')}/check-updates`;
  }
  return 'https://add-skill.vercel.sh/check-updates';
}

interface SkillLockEntry {
  source: string;
  sourceType: string;
  sourceUrl: string;
  skillPath?: string;
  declaredRef?: string;
  resolvedRef?: string;
  resolvedRevision?: string;
  /** GitHub tree SHA for the entire skill folder (v3) */
  skillFolderHash: string;
  installedAt: string;
  updatedAt: string;
}

interface SkillLockFile {
  version: number;
  skills: Record<string, SkillLockEntry>;
}

interface CheckUpdatesRequest {
  skills: Array<{
    name: string;
    source: string;
    path?: string;
    skillFolderHash: string;
  }>;
}

interface CheckUpdatesResponse {
  updates: Array<{
    name: string;
    source: string;
    currentHash: string;
    latestHash: string;
  }>;
  errors?: Array<{
    name: string;
    source: string;
    error: string;
  }>;
}

function getSkillLockPath(): string {
  return join(homedir(), AGENTS_DIR, LOCK_FILE);
}

function readSkillLock(): SkillLockFile {
  const lockPath = getSkillLockPath();
  try {
    const content = readFileSync(lockPath, 'utf-8');
    const parsed = JSON.parse(content) as SkillLockFile;
    if (typeof parsed.version !== 'number' || !parsed.skills) {
      return { version: CURRENT_LOCK_VERSION, skills: {} };
    }
    // If old version, wipe and start fresh (backwards incompatible change)
    // v3 adds skillFolderHash - we want fresh installs to populate it
    if (parsed.version < CURRENT_LOCK_VERSION) {
      return { version: CURRENT_LOCK_VERSION, skills: {} };
    }
    return parsed;
  } catch {
    return { version: CURRENT_LOCK_VERSION, skills: {} };
  }
}

function writeSkillLock(lock: SkillLockFile): void {
  const lockPath = getSkillLockPath();
  const dir = join(homedir(), AGENTS_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(lockPath, JSON.stringify(lock, null, 2), 'utf-8');
}

async function runCheck(args: string[] = []): Promise<void> {
  console.log(`${TEXT}Checking for skill updates...${RESET}`);
  console.log();

  const lock = readSkillLock();
  const skillNames = Object.keys(lock.skills);

  if (skillNames.length === 0) {
    console.log(`${DIM}No skills tracked in lock file.${RESET}`);
    console.log(`${DIM}Install skills with${RESET} ${TEXT}npx skills add <package>${RESET}`);
    return;
  }

  // Get GitHub token from user's environment for higher rate limits
  const token = getGitHubToken();

  // Group skills by source (owner/repo) to batch GitHub API calls
  const skillsBySource = new Map<string, Array<{ name: string; entry: SkillLockEntry }>>();
  const manualUpdateSkills: Array<{ name: string; source: string; sourceType: string }> = [];

  for (const skillName of skillNames) {
    const entry = lock.skills[skillName];
    if (!entry) continue;

    // Non-GitHub sources currently do not support automatic freshness detection
    if (entry.sourceType !== 'github') {
      manualUpdateSkills.push({
        name: skillName,
        source: entry.source,
        sourceType: entry.sourceType,
      });
      continue;
    }

    // GitHub entries without required metadata cannot be checked automatically
    if (!entry.skillFolderHash || !entry.skillPath) {
      manualUpdateSkills.push({
        name: skillName,
        source: entry.source,
        sourceType: entry.sourceType,
      });
      continue;
    }

    const existing = skillsBySource.get(entry.source) || [];
    existing.push({ name: skillName, entry });
    skillsBySource.set(entry.source, existing);
  }

  const totalSkills = Array.from(skillsBySource.values()).reduce(
    (acc, skills) => acc + skills.length,
    0
  );

  if (totalSkills > 0) {
    console.log(`${DIM}Checking ${totalSkills} GitHub skill(s) for updates...${RESET}`);
  } else {
    console.log(`${DIM}No GitHub skills eligible for automatic update checks.${RESET}`);
  }

  const updates: Array<{ name: string; source: string }> = [];
  const errors: Array<{ name: string; source: string; error: string }> = [];

  // Check each source (one API call per repo)
  if (totalSkills > 0) {
    for (const [source, skills] of skillsBySource) {
      for (const { name, entry } of skills) {
        try {
          const latestHash = await fetchSkillFolderHash(source, entry.skillPath!, token);

          if (!latestHash) {
            errors.push({ name, source, error: 'Could not fetch from GitHub' });
            continue;
          }

          if (latestHash !== entry.skillFolderHash) {
            updates.push({ name, source });
          }
        } catch (err) {
          errors.push({
            name,
            source,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }
      }
    }
  }

  console.log();

  if (updates.length === 0) {
    console.log(`${TEXT}✓ All skills are up to date${RESET}`);
  } else {
    console.log(`${TEXT}${updates.length} update(s) available:${RESET}`);
    console.log();
    for (const update of updates) {
      console.log(`  ${TEXT}↑${RESET} ${update.name}`);
      console.log(`    ${DIM}source: ${update.source}${RESET}`);
    }
    console.log();
    console.log(
      `${DIM}Run${RESET} ${TEXT}npx skills update${RESET} ${DIM}to update all skills${RESET}`
    );
  }

  if (errors.length > 0) {
    console.log();
    console.log(`${DIM}Could not check ${errors.length} skill(s) (may need reinstall)${RESET}`);
  }

  if (manualUpdateSkills.length > 0) {
    console.log();
    console.log(
      `${DIM}${manualUpdateSkills.length} skill(s) require manual update (automatic freshness check unavailable)${RESET}`
    );
    for (const skill of manualUpdateSkills.slice(0, 5)) {
      console.log(`  ${DIM}- ${skill.name} (${skill.sourceType})${RESET}`);
    }
    if (manualUpdateSkills.length > 5) {
      console.log(`  ${DIM}...and ${manualUpdateSkills.length - 5} more${RESET}`);
    }
    console.log(
      `${DIM}Reinstall manually with${RESET} ${TEXT}npx skills add <source> -g${RESET} ${DIM}when you want to refresh.${RESET}`
    );
  }

  // Track telemetry
  track({
    event: 'check',
    skillCount: String(totalSkills),
    updatesAvailable: String(updates.length),
  });

  console.log();
}

async function runUpdate(): Promise<void> {
  console.log(`${TEXT}Checking for skill updates...${RESET}`);
  console.log();

  const lock = readSkillLock();
  const skillNames = Object.keys(lock.skills);

  if (skillNames.length === 0) {
    console.log(`${DIM}No skills tracked in lock file.${RESET}`);
    console.log(`${DIM}Install skills with${RESET} ${TEXT}npx skills add <package>${RESET}`);
    return;
  }

  // Get GitHub token from user's environment for higher rate limits
  const token = getGitHubToken();

  // Find skills that need updates by checking GitHub directly
  const updates: Array<{ name: string; source: string; entry: SkillLockEntry }> = [];
  const manualUpdateSkills: Array<{ name: string; sourceType: string }> = [];
  let checkedCount = 0;

  for (const skillName of skillNames) {
    const entry = lock.skills[skillName];
    if (!entry) continue;

    if (entry.sourceType !== 'github') {
      manualUpdateSkills.push({ name: skillName, sourceType: entry.sourceType });
      continue;
    }

    // GitHub entries without required metadata cannot be checked automatically
    if (!entry.skillFolderHash || !entry.skillPath) {
      manualUpdateSkills.push({ name: skillName, sourceType: entry.sourceType });
      continue;
    }

    checkedCount++;

    try {
      const latestHash = await fetchSkillFolderHash(entry.source, entry.skillPath, token);

      if (latestHash && latestHash !== entry.skillFolderHash) {
        updates.push({ name: skillName, source: entry.source, entry });
      }
    } catch {
      // Skip skills that fail to check
    }
  }

  if (checkedCount === 0) {
    if (manualUpdateSkills.length > 0) {
      console.log(
        `${DIM}No GitHub skills eligible for automatic updates. ${manualUpdateSkills.length} skill(s) require manual update.${RESET}`
      );
    } else {
      console.log(`${DIM}No skills to check.${RESET}`);
    }
    return;
  }

  if (updates.length === 0) {
    console.log(`${TEXT}✓ All skills are up to date${RESET}`);
    console.log();
    return;
  }

  console.log(`${TEXT}Found ${updates.length} update(s)${RESET}`);
  console.log();

  // Reinstall each skill that has an update
  let successCount = 0;
  let failCount = 0;

  for (const update of updates) {
    console.log(`${TEXT}Updating ${update.name}...${RESET}`);

    // Build the URL with subpath to target the specific skill directory
    // e.g., https://github.com/owner/repo/tree/main/skills/my-skill
    let installUrl = update.entry.sourceUrl;
    if (update.entry.skillPath) {
      // Extract the skill folder path (remove /SKILL.md suffix)
      let skillFolder = update.entry.skillPath;
      if (skillFolder.endsWith('/SKILL.md')) {
        skillFolder = skillFolder.slice(0, -9);
      } else if (skillFolder.endsWith('SKILL.md')) {
        skillFolder = skillFolder.slice(0, -8);
      }
      if (skillFolder.endsWith('/')) {
        skillFolder = skillFolder.slice(0, -1);
      }

      // Convert git URL to tree URL with path
      // https://github.com/owner/repo.git -> https://github.com/owner/repo/tree/main/path
      installUrl = update.entry.sourceUrl.replace(/\.git$/, '').replace(/\/$/, '');
      const refForUpdate =
        update.entry.declaredRef ||
        update.entry.resolvedRef ||
        update.entry.resolvedRevision ||
        'main';
      installUrl = `${installUrl}/tree/${refForUpdate}/${skillFolder}`;
    }

    // Use skills CLI to reinstall with -g -y flags
    const result = spawnSync('npx', ['-y', 'skills', 'add', installUrl, '-g', '-y'], {
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    if (result.status === 0) {
      successCount++;
      console.log(`  ${TEXT}✓${RESET} Updated ${update.name}`);
    } else {
      failCount++;
      console.log(`  ${DIM}✗ Failed to update ${update.name}${RESET}`);
    }
  }

  console.log();
  if (successCount > 0) {
    console.log(`${TEXT}✓ Updated ${successCount} skill(s)${RESET}`);
  }
  if (failCount > 0) {
    console.log(`${DIM}Failed to update ${failCount} skill(s)${RESET}`);
  }

  if (manualUpdateSkills.length > 0) {
    console.log(
      `${DIM}${manualUpdateSkills.length} non-GitHub skill(s) were skipped and require manual update.${RESET}`
    );
  }

  // Track telemetry
  track({
    event: 'update',
    skillCount: String(updates.length),
    successCount: String(successCount),
    failCount: String(failCount),
  });

  console.log();
}

// ============================================
// Sync Command (from lock file)
// ============================================

async function runSyncCommand(args: string[]): Promise<void> {
  const options = parseSyncOptions(args);

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    showSyncHelp();
    return;
  }

  showLogo();
  console.log();

  // Detect sync status
  const spinner = p.spinner();
  spinner.start('Checking skill status...');

  let statusResult;
  try {
    statusResult = await detectSyncStatus(options);
    spinner.stop('Skill status check complete');
  } catch (error) {
    spinner.stop('Failed to check skill status');
    console.error(`${DIM}Error: ${error instanceof Error ? error.message : String(error)}${RESET}`);
    process.exit(1);
  }

  // Filter to specific skills if provided
  let missing = statusResult.missing;
  let modified = statusResult.modified;
  let upToDate = statusResult.upToDate;
  let orphaned = statusResult.orphaned;

  if (options.skillNames && options.skillNames.length > 0) {
    const skillSet = new Set(options.skillNames);
    missing = missing.filter((s) => skillSet.has(s.name));
    modified = modified.filter((s) => skillSet.has(s.name));
    upToDate = upToDate.filter((s) => skillSet.has(s.name));
    // Orphaned skills are not filtered as they're not in the lock file
  }

  // Display status
  console.log();
  console.log(`${BOLD}Sync Status:${RESET}`);
  console.log();

  if (missing.length > 0) {
    console.log(`  ${TEXT}Missing:${RESET} ${missing.length} skill(s) need to be installed`);
    for (const skill of missing) {
      console.log(`    ${DIM}- ${skill.name}${RESET}`);
    }
    console.log();
  }

  if (modified.length > 0) {
    console.log(`  ${TEXT}Modified:${RESET} ${modified.length} skill(s) need to be updated`);
    for (const skill of modified) {
      console.log(`    ${DIM}- ${skill.name}${RESET}`);
    }
    console.log();
  }

  if (upToDate.length > 0) {
    console.log(`  ${TEXT}Up to date:${RESET} ${upToDate.length} skill(s)`);
    if (options.force) {
      console.log(`    ${DIM}(will be reinstalled due to --force)${RESET}`);
    }
    console.log();
  }

  if (orphaned.length > 0) {
    console.log(`  ${DIM}Orphaned:${RESET} ${orphaned.length} skill(s) not in lock file`);
    for (const skill of orphaned) {
      console.log(`    ${DIM}- ${skill.name}${RESET}`);
    }
    console.log();
  }

  // Determine if there are any changes to make
  const hasChanges =
    missing.length > 0 || modified.length > 0 || (options.force && upToDate.length > 0);

  if (!hasChanges) {
    console.log(`${TEXT}✓ All skills are up to date${RESET}`);
    console.log();
    return;
  }

  // Dry run mode - just preview
  if (options.dryRun) {
    console.log(`${DIM}Dry run mode - no changes will be made${RESET}`);
    console.log();
    console.log(`${TEXT}Would install:${RESET} ${missing.length} skill(s)`);
    console.log(
      `${TEXT}Would update:${RESET} ${modified.length + (options.force ? upToDate.length : 0)} skill(s)`
    );
    console.log();
    return;
  }

  // Confirm with user unless --yes flag
  if (!options.yes) {
    const totalChanges = missing.length + modified.length + (options.force ? upToDate.length : 0);
    const confirmed = await p.confirm({
      message: `Proceed with syncing ${totalChanges} skill(s)?`,
      initialValue: true,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      console.log(`${DIM}Sync cancelled${RESET}`);
      return;
    }
  }

  // Perform sync
  console.log();
  const syncSpinner = p.spinner();
  syncSpinner.start('Synchronizing skills...');

  const result = await syncAllSkills(options);

  if (result.success) {
    syncSpinner.stop('Skills synchronized successfully');
  } else {
    syncSpinner.stop('Some skills failed to synchronize');
  }

  // Display results
  console.log();
  if (result.installed.length > 0) {
    console.log(`${TEXT}✓ Installed:${RESET} ${result.installed.length} skill(s)`);
    for (const name of result.installed) {
      console.log(`  ${DIM}- ${name}${RESET}`);
    }
  }

  if (result.updated.length > 0) {
    console.log(`${TEXT}✓ Updated:${RESET} ${result.updated.length} skill(s)`);
    for (const name of result.updated) {
      console.log(`  ${DIM}- ${name}${RESET}`);
    }
  }

  if (result.upToDate.length > 0 && !options.force) {
    console.log(`${TEXT}✓ Up to date:${RESET} ${result.upToDate.length} skill(s)`);
  }

  if (result.failed.length > 0) {
    console.log();
    console.log(`${DIM}✗ Failed:${RESET} ${result.failed.length} skill(s)`);
    for (const { name, error } of result.failed) {
      console.log(`  ${DIM}- ${name}: ${error}${RESET}`);
    }
  }

  if (result.orphaned.length > 0) {
    console.log();
    console.log(`${DIM}Orphaned:${RESET} ${result.orphaned.length} skill(s) (not in lock file)`);
  }

  // Track telemetry
  track({
    event: 'sync',
    skillCount: String(result.installed.length + result.updated.length),
    successCount: String(result.installed.length + result.updated.length),
    failCount: String(result.failed.length),
  });

  console.log();
}

function showSyncHelp(): void {
  console.log(`
${BOLD}Usage:${RESET} skills sync [skills...] [options]

${BOLD}Description:${RESET}
  Synchronize local skills with the skills-lock.json file.
  This ensures your local skills match the lock file exactly.

${BOLD}Arguments:${RESET}
  skills            Optional skill names to sync (space-separated)
                    If omitted, all skills in the lock file are synced

${BOLD}Options:${RESET}
  -d, --dry-run      Preview changes without applying them
  -f, --force        Force reinstallation of all skills
  -y, --yes          Skip confirmation prompts
  -g, --global       Sync global skills instead of project skills
  -h, --help         Show this help message

${BOLD}Examples:${RESET}
  ${DIM}$${RESET} skills sync                           ${DIM}# sync all skills${RESET}
  ${DIM}$${RESET} skills sync --dry-run                 ${DIM}# preview changes${RESET}
  ${DIM}$${RESET} skills sync --force                   ${DIM}# force reinstall all${RESET}
  ${DIM}$${RESET} skills sync my-skill                  ${DIM}# sync specific skill${RESET}
  ${DIM}$${RESET} skills sync skill1 skill2             ${DIM}# sync multiple skills${RESET}
  ${DIM}$${RESET} skills sync -y                        ${DIM}# sync without prompts${RESET}
  ${DIM}$${RESET} skills sync -g                        ${DIM}# sync global skills${RESET}

Discover more skills at ${TEXT}https://skills.sh/${RESET}
`);
}

// ============================================
// Main
// ============================================

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showBanner();
    return;
  }

  const command = args[0];
  const restArgs = args.slice(1);

  switch (command) {
    case 'find':
    case 'search':
    case 'f':
    case 's':
      showLogo();
      console.log();
      await runFind(restArgs);
      break;
    case 'init':
      showLogo();
      console.log();
      runInit(restArgs);
      break;
    case 'experimental_install': {
      showLogo();
      await runInstallFromLock(restArgs);
      break;
    }
    case 'i':
    case 'install':
    case 'a':
    case 'add': {
      showLogo();
      const { source: addSource, options: addOpts } = parseAddOptions(restArgs);
      await runAdd(addSource, addOpts);
      break;
    }
    case 'remove':
    case 'rm':
    case 'r':
      // Check for --help or -h flag
      if (restArgs.includes('--help') || restArgs.includes('-h')) {
        showRemoveHelp();
        break;
      }
      const { skills, options: removeOptions } = parseRemoveOptions(restArgs);
      await removeCommand(skills, removeOptions);
      break;
    case 'sync': {
      await runSyncCommand(restArgs);
      break;
    }
    case 'experimental_sync': {
      showLogo();
      const { options: experimentalSyncOptions } = parseExperimentalSyncOptions(restArgs);
      await runSync(restArgs, experimentalSyncOptions);
      break;
    }
    case 'list':
    case 'ls':
      await runList(restArgs);
      break;
    case 'check':
      runCheck(restArgs);
      break;
    case 'update':
    case 'upgrade':
      runUpdate();
      break;
    case 'config':
    case 'cfg':
      // Check for --help or -h flag
      if (restArgs.includes('--help') || restArgs.includes('-h')) {
        showConfigHelp();
        break;
      }
      runConfig(restArgs);
      break;
    case '--help':
    case '-h':
      showHelp();
      break;
    case '--version':
    case '-v':
      console.log(VERSION);
      break;

    default:
      console.log(`Unknown command: ${command}`);
      console.log(`Run ${BOLD}skills --help${RESET} for usage.`);
  }
}

main();
