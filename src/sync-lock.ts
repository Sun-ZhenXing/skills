import { access, readdir, stat, cp, rm, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { tmpdir } from 'os';
import type { LocalSkillLockEntry, LocalSkillLockFile } from './local-lock.ts';
import { readLocalLock, writeLocalLock, computeSkillFolderHash } from './local-lock.ts';
import { getCanonicalSkillsDir } from './installer.ts';
import { AGENTS_DIR, SKILLS_SUBDIR } from './constants.ts';
import { homedir } from 'os';
import { cloneRepo, cleanupTempDir, resolveGitHubUrl } from './git.ts';
import { discoverSkills } from './skills.ts';

const execAsync = promisify(spawn);

/**
 * Represents the synchronization status of a skill
 */
export type SkillSyncStatus = 'missing' | 'modified' | 'up-to-date' | 'orphaned';

/**
 * Detailed information about a skill's sync status
 */
export interface SkillSyncInfo {
  name: string;
  status: SkillSyncStatus;
  entry?: LocalSkillLockEntry;
  currentHash?: string;
  expectedHash?: string;
  path?: string;
}

/**
 * Result of detecting sync status for all skills
 */
export interface SyncStatusResult {
  missing: SkillSyncInfo[];
  modified: SkillSyncInfo[];
  upToDate: SkillSyncInfo[];
  orphaned: SkillSyncInfo[];
  all: SkillSyncInfo[];
}

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Preview changes without applying them */
  dryRun?: boolean;
  /** Force reinstallation of all skills */
  force?: boolean;
  /** Skip confirmation prompts */
  yes?: boolean;
  /** Specific skills to sync (empty = all) */
  skillNames?: string[];
  /** Current working directory */
  cwd?: string;
  /** Global installation flag */
  global?: boolean;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  installed: string[];
  updated: string[];
  upToDate: string[];
  failed: Array<{ name: string; error: string }>;
  orphaned: string[];
}

/**
 * Detect the synchronization status of all skills.
 * Compares the local lock file with the actual state of skills on disk.
 */
export async function detectSyncStatus(options: SyncOptions = {}): Promise<SyncStatusResult> {
  const { cwd = process.cwd(), global = false } = options;
  const lock = await readLocalLock(cwd);
  const skillsDir = getCanonicalSkillsDir(global, cwd);

  const result: SyncStatusResult = {
    missing: [],
    modified: [],
    upToDate: [],
    orphaned: [],
    all: [],
  };

  // Check skills in lock file
  for (const [name, entry] of Object.entries(lock.skills)) {
    const skillPath = join(skillsDir, name);
    const info = await computeSkillStatus(name, entry, skillPath);
    result.all.push(info);

    switch (info.status) {
      case 'missing':
        result.missing.push(info);
        break;
      case 'modified':
        result.modified.push(info);
        break;
      case 'up-to-date':
        result.upToDate.push(info);
        break;
    }
  }

  // Find orphaned skills (local skills not in lock file)
  try {
    const localSkills = await readdir(skillsDir);
    for (const skillName of localSkills) {
      if (!(skillName in lock.skills)) {
        const skillPath = join(skillsDir, skillName);
        const statInfo = await stat(skillPath);
        if (statInfo.isDirectory()) {
          const info: SkillSyncInfo = {
            name: skillName,
            status: 'orphaned',
            path: skillPath,
          };
          result.orphaned.push(info);
          result.all.push(info);
        }
      }
    }
  } catch {
    // Directory doesn't exist or is empty
  }

  return result;
}

/**
 * Compute the sync status for a single skill.
 */
export async function computeSkillStatus(
  name: string,
  entry: LocalSkillLockEntry,
  skillPath: string
): Promise<SkillSyncInfo> {
  try {
    await access(skillPath);
  } catch {
    return {
      name,
      status: 'missing',
      entry,
      expectedHash: entry.computedHash,
      path: skillPath,
    };
  }

  // Compute current hash
  const currentHash = await computeSkillFolderHash(skillPath);
  const expectedHash = entry.computedHash;

  if (currentHash === expectedHash) {
    return {
      name,
      status: 'up-to-date',
      entry,
      currentHash,
      expectedHash,
      path: skillPath,
    };
  } else {
    return {
      name,
      status: 'modified',
      entry,
      currentHash,
      expectedHash,
      path: skillPath,
    };
  }
}

/**
 * Synchronize a single skill from its source.
 */
export async function syncSkill(
  name: string,
  entry: LocalSkillLockEntry,
  options: SyncOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const { cwd = process.cwd(), global = false, dryRun = false } = options;
  const skillsDir = getCanonicalSkillsDir(global, cwd);
  const skillPath = join(skillsDir, name);

  if (dryRun) {
    return { success: true };
  }

  try {
    // Remove existing skill if present
    try {
      await access(skillPath);
      await rm(skillPath, { recursive: true, force: true });
    } catch {
      // Skill doesn't exist, that's fine
    }

    // Ensure skills directory exists
    await mkdir(skillsDir, { recursive: true });

    // Install based on source type
    switch (entry.sourceType) {
      case 'github':
      case 'gitlab':
      case 'git':
        await syncGitSkill(name, entry, skillPath);
        break;
      case 'node_modules':
        await syncNodeModulesSkill(name, entry, skillPath, cwd);
        break;
      case 'local':
        await syncLocalSkill(name, entry, skillPath);
        break;
      default:
        return { success: false, error: `Unknown source type: ${entry.sourceType}` };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Synchronize a skill from a git repository.
 * Clones the repo to a temp directory, finds the skill, and copies only that skill.
 */
async function syncGitSkill(
  name: string,
  entry: LocalSkillLockEntry,
  skillPath: string
): Promise<void> {
  // Resolve GitHub shorthand to full URL
  const gitUrl = resolveGitHubUrl(entry.source);
  const ref = entry.resolvedRef || entry.declaredRef;

  // Clone to temp directory
  const { tempDir } = await cloneRepo(gitUrl, ref);

  try {
    // Discover skills in the cloned repo
    const skills = await discoverSkills(tempDir, undefined, { includeInternal: false });

    // Find the skill with matching name
    const skill = skills.find((s) => s.name === name);
    if (!skill) {
      throw new Error(`Skill "${name}" not found in repository ${gitUrl}`);
    }

    // Remove existing skill directory if it exists
    await rm(skillPath, { recursive: true, force: true });
    await mkdir(skillPath, { recursive: true });

    // Copy only the skill directory to the target path
    await cp(skill.path, skillPath, { recursive: true });
  } finally {
    // Clean up temp directory
    await cleanupTempDir(tempDir);
  }
}

/**
 * Synchronize a skill from node_modules.
 */
async function syncNodeModulesSkill(
  name: string,
  entry: LocalSkillLockEntry,
  skillPath: string,
  cwd: string
): Promise<void> {
  const packageName = entry.source;
  const sourcePath = join(cwd, 'node_modules', packageName, '.agent', 'skills', name);

  try {
    await access(sourcePath);
  } catch {
    throw new Error(`Cannot find skill in node_modules: ${sourcePath}`);
  }

  await cp(sourcePath, skillPath, { recursive: true });
}

/**
 * Synchronize a skill from a local path.
 */
async function syncLocalSkill(
  name: string,
  entry: LocalSkillLockEntry,
  skillPath: string
): Promise<void> {
  const sourcePath = entry.source;

  try {
    await access(sourcePath);
  } catch {
    throw new Error(`Cannot find skill at local path: ${sourcePath}`);
  }

  await cp(sourcePath, skillPath, { recursive: true });
}

/**
 * Orchestrate the synchronization of all skills or selected skills.
 */
export async function syncAllSkills(options: SyncOptions = {}): Promise<SyncResult> {
  const { cwd = process.cwd(), skillNames = [], force = false, dryRun = false } = options;
  const lock = await readLocalLock(cwd);

  const result: SyncResult = {
    success: true,
    installed: [],
    updated: [],
    upToDate: [],
    failed: [],
    orphaned: [],
  };

  // Determine which skills to sync
  let skillsToSync: Array<{ name: string; entry: LocalSkillLockEntry }> = [];

  if (skillNames.length > 0) {
    // Sync specific skills
    for (const name of skillNames) {
      const entry = lock.skills[name];
      if (!entry) {
        result.failed.push({ name, error: 'Skill not found in lock file' });
        continue;
      }
      skillsToSync.push({ name, entry });
    }
  } else {
    // Sync all skills from lock file
    skillsToSync = Object.entries(lock.skills).map(([name, entry]) => ({ name, entry }));
  }

  if (skillsToSync.length === 0) {
    return result;
  }

  // Get sync status for all skills
  const statusResult = await detectSyncStatus(options);

  // Filter to skills that need syncing (unless force mode)
  const skillsNeedingSync = skillsToSync.filter(({ name }) => {
    if (force) return true;
    const info = statusResult.all.find((s) => s.name === name);
    return info?.status === 'missing' || info?.status === 'modified';
  });

  // Track up-to-date skills
  for (const { name } of skillsToSync) {
    const info = statusResult.all.find((s) => s.name === name);
    if (info?.status === 'up-to-date') {
      result.upToDate.push(name);
    }
  }

  // Track orphaned skills
  result.orphaned = statusResult.orphaned.map((s) => s.name);

  if (dryRun) {
    // In dry-run mode, just report what would be done
    for (const { name } of skillsNeedingSync) {
      const info = statusResult.all.find((s) => s.name === name);
      if (info?.status === 'missing') {
        result.installed.push(name);
      } else if (info?.status === 'modified' || force) {
        result.updated.push(name);
      }
    }
    return result;
  }

  // Perform actual sync
  for (const { name, entry } of skillsNeedingSync) {
    const info = statusResult.all.find((s) => s.name === name);
    const isNew = info?.status === 'missing';

    const syncResult = await syncSkill(name, entry, options);

    if (syncResult.success) {
      if (isNew) {
        result.installed.push(name);
      } else {
        result.updated.push(name);
      }

      // Update lock file with new hash
      try {
        const skillsDir = getCanonicalSkillsDir(options.global ?? false, cwd);
        const skillPath = join(skillsDir, name);
        const newHash = await computeSkillFolderHash(skillPath);
        lock.skills[name] = { ...entry, computedHash: newHash };
      } catch (error) {
        // Non-fatal: skill was synced but hash update failed
        console.warn(`Warning: Could not update hash for ${name}: ${error}`);
      }
    } else {
      result.failed.push({ name, error: syncResult.error || 'Unknown error' });
      result.success = false;
    }
  }

  // Write updated lock file
  if (!dryRun && (result.installed.length > 0 || result.updated.length > 0)) {
    try {
      await writeLocalLock(lock, cwd);
    } catch (error) {
      console.warn(`Warning: Could not update lock file: ${error}`);
      result.success = false;
    }
  }

  return result;
}

/**
 * Parse sync command options from CLI arguments.
 */
export function parseSyncOptions(args: string[]): SyncOptions {
  const options: SyncOptions = {
    skillNames: [],
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--global' || arg === '-g') {
      options.global = true;
    } else if (arg && !arg.startsWith('-')) {
      options.skillNames?.push(arg);
    }
  }

  return options;
}
