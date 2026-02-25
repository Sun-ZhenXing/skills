import * as p from '@clack/prompts';
import pc from 'picocolors';
import { readLocalLock } from './local-lock.ts';
import { runAdd } from './add.ts';
import { runSync, parseSyncOptions } from './sync.ts';
import { getUniversalAgents } from './agents.ts';
import type { LocalSkillLockEntry } from './local-lock.ts';

/**
 * Check if a source is in shorthand format (owner/repo).
 * Returns true for format like "owner/repo", false for full URLs or other formats.
 */
function isGitShorthand(source: string): boolean {
  // Shorthand format: owner/repo (contains / but no protocol or @ before the /)
  // Exclude: URLs (http://, https://, git://, ssh://), SSH format (git@host:path)
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return false;
  }
  if (source.startsWith('git://') || source.startsWith('ssh://')) {
    return false;
  }
  if (source.includes('@') && source.includes(':')) {
    // Likely SSH format like git@github.com:owner/repo.git
    return false;
  }
  // Must contain exactly one / with no protocol
  return source.includes('/') && !source.includes('://');
}

/**
 * Convert shorthand owner/repo format to full HTTPS URL.
 * For GitHub/GitLab sources, assumes GitHub as the default host.
 * For generic git sources, returns the source as-is.
 */
function convertShorthandToUrl(source: string, sourceType: string): string {
  // Only convert shorthand for GitHub/GitLab sources
  if (sourceType !== 'github' && sourceType !== 'gitlab') {
    return source;
  }
  if (isGitShorthand(source)) {
    return `https://github.com/${source}.git`;
  }
  return source;
}

/**
 * Build the source string with ref appended if available.
 * Format: source@ref
 */
function buildSourceWithRef(source: string, entry: LocalSkillLockEntry): string {
  const ref = entry.declaredRef ?? entry.resolvedRef;
  if (ref) {
    return `${source}@${ref}`;
  }
  return source;
}

/**
 * Install all skills from the local skills-lock.json.
 * Groups skills by source and calls `runAdd` for each group.
 *
 * Only installs to .agents/skills/ (universal agents) -- the canonical
 * project-level location. Does not install to agent-specific directories.
 *
 * node_modules skills are handled via experimental_sync.
 */
export async function runInstallFromLock(args: string[]): Promise<void> {
  const cwd = process.cwd();
  const lock = await readLocalLock(cwd);
  const skillEntries = Object.entries(lock.skills);

  if (skillEntries.length === 0) {
    p.log.warn('No project skills found in skills-lock.json');
    p.log.info(
      `Add project-level skills with ${pc.cyan('npx @alexsun-top/skills add <package>')} (without ${pc.cyan('-g')})`
    );
    return;
  }

  // Only install to .agents/skills/ (universal agents)
  const universalAgentNames = getUniversalAgents();

  // Separate node_modules skills from remote skills
  const nodeModuleSkills: string[] = [];
  const bySource = new Map<
    string,
    { sourceType: string; skills: string[]; declaredRef?: string; resolvedRef?: string }
  >();

  for (const [skillName, entry] of skillEntries) {
    if (entry.sourceType === 'node_modules') {
      nodeModuleSkills.push(skillName);
      continue;
    }

    const existing = bySource.get(entry.source);
    if (existing) {
      existing.skills.push(skillName);
    } else {
      bySource.set(entry.source, {
        sourceType: entry.sourceType,
        skills: [skillName],
        declaredRef: entry.declaredRef,
        resolvedRef: entry.resolvedRef,
      });
    }
  }

  const remoteCount = skillEntries.length - nodeModuleSkills.length;
  if (remoteCount > 0) {
    p.log.info(
      `Restoring ${pc.cyan(String(remoteCount))} skill${remoteCount !== 1 ? 's' : ''} from skills-lock.json into ${pc.dim('.agents/skills/')}`
    );
  }

  // Install remote skills grouped by source
  for (const [source, { sourceType, skills, declaredRef, resolvedRef }] of bySource) {
    try {
      // Convert shorthand to full URL if needed (only for GitHub/GitLab)
      let fullSource = convertShorthandToUrl(source, sourceType);

      // Append ref if available
      const ref = declaredRef ?? resolvedRef;
      if (ref) {
        fullSource = `${fullSource}@${ref}`;
      }

      await runAdd([fullSource], {
        skill: skills,
        agent: universalAgentNames,
        yes: true,
      });
    } catch (error) {
      p.log.error(
        `Failed to install from ${pc.cyan(source)}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Handle node_modules skills via sync
  if (nodeModuleSkills.length > 0) {
    p.log.info(
      `${pc.cyan(String(nodeModuleSkills.length))} skill${nodeModuleSkills.length !== 1 ? 's' : ''} from node_modules`
    );
    try {
      const { options: syncOptions } = parseSyncOptions(args);
      await runSync(args, { ...syncOptions, yes: true, agent: universalAgentNames });
    } catch (error) {
      p.log.error(
        `Failed to sync node_modules skills: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
