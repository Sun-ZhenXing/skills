import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { access, readdir, stat, cp, rm, mkdir, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import {
  detectSyncStatus,
  computeSkillStatus,
  syncSkill,
  syncAllSkills,
  parseSyncOptions,
  type SyncOptions,
} from './sync-lock.ts';
import type { LocalSkillLockEntry, LocalSkillLockFile } from './local-lock.ts';
import * as localLock from './local-lock.ts';

// Mock fs/promises
vi.mock('fs/promises');

// Mock git.ts module
vi.mock('./git.ts', () => ({
  cloneRepo: vi.fn(),
  cleanupTempDir: vi.fn(),
  resolveGitHubUrl: vi.fn((url: string) => url),
}));

// Mock skills.ts module
vi.mock('./skills.ts', () => ({
  discoverSkills: vi.fn(),
}));

// Mock local-lock module
vi.mock('./local-lock.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./local-lock.ts')>();
  return {
    ...actual,
    readLocalLock: vi.fn(),
    writeLocalLock: vi.fn(),
    computeSkillFolderHash: vi.fn(),
  };
});

describe('sync-lock', () => {
  const mockCwd = '/test/project';
  const mockSkillsDir = '/test/project/.agents/skills';

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseSyncOptions', () => {
    it('should parse empty args', () => {
      const options = parseSyncOptions([]);
      expect(options.skillNames).toEqual([]);
      expect(options.dryRun).toBeUndefined();
      expect(options.force).toBeUndefined();
      expect(options.yes).toBeUndefined();
      expect(options.global).toBeUndefined();
    });

    it('should parse --dry-run flag', () => {
      const options = parseSyncOptions(['--dry-run']);
      expect(options.dryRun).toBe(true);
    });

    it('should parse -d flag', () => {
      const options = parseSyncOptions(['-d']);
      expect(options.dryRun).toBe(true);
    });

    it('should parse --force flag', () => {
      const options = parseSyncOptions(['--force']);
      expect(options.force).toBe(true);
    });

    it('should parse -f flag', () => {
      const options = parseSyncOptions(['-f']);
      expect(options.force).toBe(true);
    });

    it('should parse --yes flag', () => {
      const options = parseSyncOptions(['--yes']);
      expect(options.yes).toBe(true);
    });

    it('should parse -y flag', () => {
      const options = parseSyncOptions(['-y']);
      expect(options.yes).toBe(true);
    });

    it('should parse --global flag', () => {
      const options = parseSyncOptions(['--global']);
      expect(options.global).toBe(true);
    });

    it('should parse -g flag', () => {
      const options = parseSyncOptions(['-g']);
      expect(options.global).toBe(true);
    });

    it('should parse skill names', () => {
      const options = parseSyncOptions(['skill-a', 'skill-b']);
      expect(options.skillNames).toEqual(['skill-a', 'skill-b']);
    });

    it('should parse mixed args', () => {
      const options = parseSyncOptions(['--dry-run', 'skill-a', '-y', 'skill-b']);
      expect(options.dryRun).toBe(true);
      expect(options.yes).toBe(true);
      expect(options.skillNames).toEqual(['skill-a', 'skill-b']);
    });
  });

  describe('computeSkillStatus', () => {
    const mockEntry: LocalSkillLockEntry = {
      source: 'github.com/owner/repo',
      sourceType: 'github',
      computedHash: 'abc123',
    };

    it('should return missing status when skill directory does not exist', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      const result = await computeSkillStatus('my-skill', mockEntry, '/path/to/skill');

      expect(result.status).toBe('missing');
      expect(result.name).toBe('my-skill');
      expect(result.expectedHash).toBe('abc123');
    });

    it('should return up-to-date status when hashes match', async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(localLock.computeSkillFolderHash).mockResolvedValue('abc123');

      const result = await computeSkillStatus('my-skill', mockEntry, '/path/to/skill');

      expect(result.status).toBe('up-to-date');
      expect(result.currentHash).toBe('abc123');
      expect(result.expectedHash).toBe('abc123');
    });

    it('should return modified status when hashes do not match', async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(localLock.computeSkillFolderHash).mockResolvedValue('def456');

      const result = await computeSkillStatus('my-skill', mockEntry, '/path/to/skill');

      expect(result.status).toBe('modified');
      expect(result.currentHash).toBe('def456');
      expect(result.expectedHash).toBe('abc123');
    });
  });

  describe('detectSyncStatus', () => {
    const mockLockFile: LocalSkillLockFile = {
      version: 1,
      skills: {
        'up-to-date-skill': {
          source: 'github.com/owner/repo',
          sourceType: 'github',
          computedHash: 'hash1',
        },
        'modified-skill': {
          source: 'github.com/owner/repo',
          sourceType: 'github',
          computedHash: 'hash2',
        },
        'missing-skill': {
          source: 'github.com/owner/repo',
          sourceType: 'github',
          computedHash: 'hash3',
        },
      },
    };

    beforeEach(() => {
      vi.mocked(localLock.readLocalLock).mockResolvedValue(mockLockFile);
      vi.mocked(readdir).mockResolvedValue(['orphaned-skill'] as any);
      vi.mocked(stat).mockImplementation(async (path) => {
        if (String(path).includes('orphaned-skill')) {
          return { isDirectory: () => true } as any;
        }
        return { isDirectory: () => false } as any;
      });
    });

    it('should categorize all skills correctly', async () => {
      vi.mocked(access)
        .mockResolvedValueOnce(undefined) // up-to-date-skill exists
        .mockResolvedValueOnce(undefined) // modified-skill exists
        .mockRejectedValueOnce(new Error('ENOENT')); // missing-skill does not exist

      vi.mocked(localLock.computeSkillFolderHash)
        .mockResolvedValueOnce('hash1') // up-to-date-skill matches
        .mockResolvedValueOnce('different-hash'); // modified-skill doesn't match

      const result = await detectSyncStatus({ cwd: mockCwd });

      expect(result.upToDate).toHaveLength(1);
      expect(result.upToDate[0]?.name).toBe('up-to-date-skill');

      expect(result.modified).toHaveLength(1);
      expect(result.modified[0]?.name).toBe('modified-skill');

      expect(result.missing).toHaveLength(1);
      expect(result.missing[0]?.name).toBe('missing-skill');

      expect(result.orphaned).toHaveLength(1);
      expect(result.orphaned[0]?.name).toBe('orphaned-skill');
    });

    it('should handle empty lock file', async () => {
      vi.mocked(localLock.readLocalLock).mockResolvedValue({
        version: 1,
        skills: {},
      });

      const result = await detectSyncStatus({ cwd: mockCwd });

      expect(result.missing).toHaveLength(0);
      expect(result.modified).toHaveLength(0);
      expect(result.upToDate).toHaveLength(0);
    });

    it('should handle skills directory that does not exist', async () => {
      vi.mocked(readdir).mockRejectedValue(new Error('ENOENT'));

      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      const result = await detectSyncStatus({ cwd: mockCwd });

      expect(result.orphaned).toHaveLength(0);
    });
  });

  describe('syncSkill', () => {
    const mockEntry: LocalSkillLockEntry = {
      source: 'github.com/owner/repo',
      sourceType: 'github',
      computedHash: 'abc123',
    };

    beforeEach(() => {
      vi.mocked(rm).mockResolvedValue(undefined);
      vi.mocked(mkdir).mockResolvedValue(undefined);
    });

    it('should return success in dry-run mode without making changes', async () => {
      const result = await syncSkill('my-skill', mockEntry, { dryRun: true });

      expect(result.success).toBe(true);
      expect(rm).not.toHaveBeenCalled();
      expect(mkdir).not.toHaveBeenCalled();
    });

    it('should handle git-based skill sync', async () => {
      const { cloneRepo, cleanupTempDir } = await import('./git.ts');
      const { discoverSkills } = await import('./skills.ts');

      const mockTempDir = '/tmp/skills-123';
      vi.mocked(cloneRepo).mockResolvedValue({ tempDir: mockTempDir });
      vi.mocked(cleanupTempDir).mockResolvedValue(undefined);
      vi.mocked(discoverSkills).mockResolvedValue([
        {
          name: 'my-skill',
          path: `${mockTempDir}/skills/my-skill`,
          description: 'Test skill',
        } as any,
      ]);
      vi.mocked(rm).mockResolvedValue(undefined);
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(cp).mockResolvedValue(undefined);

      const result = await syncSkill('my-skill', mockEntry, { cwd: mockCwd });

      expect(result.success).toBe(true);
      expect(cloneRepo).toHaveBeenCalledWith('github.com/owner/repo', undefined);
      expect(discoverSkills).toHaveBeenCalledWith(mockTempDir, undefined, {
        includeInternal: false,
      });
      expect(cp).toHaveBeenCalledWith(`${mockTempDir}/skills/my-skill`, expect.any(String), {
        recursive: true,
      });
      expect(cleanupTempDir).toHaveBeenCalledWith(mockTempDir);
    });

    it('should handle node_modules skill sync', async () => {
      const nodeModulesEntry: LocalSkillLockEntry = {
        source: 'my-package',
        sourceType: 'node_modules',
        computedHash: 'abc123',
      };

      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(cp).mockResolvedValue(undefined);

      const result = await syncSkill('my-skill', nodeModulesEntry, { cwd: mockCwd });

      expect(result.success).toBe(true);
      expect(cp).toHaveBeenCalledWith(expect.stringContaining('node_modules'), expect.any(String), {
        recursive: true,
      });
      const cpCall = vi.mocked(cp).mock.calls[0];
      expect(cpCall?.[0]).toContain('my-package');
      expect(cpCall?.[0]).toContain('.agent');
      expect(cpCall?.[0]).toContain('my-skill');
    });

    it('should handle local path skill sync', async () => {
      const localEntry: LocalSkillLockEntry = {
        source: '/local/path/to/skill',
        sourceType: 'local',
        computedHash: 'abc123',
      };

      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(cp).mockResolvedValue(undefined);

      const result = await syncSkill('my-skill', localEntry, { cwd: mockCwd });

      expect(result.success).toBe(true);
      expect(cp).toHaveBeenCalledWith('/local/path/to/skill', expect.any(String), {
        recursive: true,
      });
    });

    it('should return error for unknown source type', async () => {
      const unknownEntry: LocalSkillLockEntry = {
        source: 'unknown',
        sourceType: 'unknown' as any,
        computedHash: 'abc123',
      };

      const result = await syncSkill('my-skill', unknownEntry, { cwd: mockCwd });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown source type');
    });

    it('should handle git clone failure', async () => {
      const { cloneRepo } = await import('./git.ts');
      vi.mocked(cloneRepo).mockRejectedValue(new Error('Git clone failed: repository not found'));

      const result = await syncSkill('my-skill', mockEntry, { cwd: mockCwd });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Git clone failed');
    });

    it('should handle missing node_modules source', async () => {
      const nodeModulesEntry: LocalSkillLockEntry = {
        source: 'missing-package',
        sourceType: 'node_modules',
        computedHash: 'abc123',
      };

      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      const result = await syncSkill('my-skill', nodeModulesEntry, { cwd: mockCwd });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Cannot find skill in node_modules');
    });
  });

  describe('syncAllSkills', () => {
    const mockLockFile: LocalSkillLockFile = {
      version: 1,
      skills: {
        'skill-a': {
          source: 'github.com/owner/repo',
          sourceType: 'github',
          computedHash: 'hash-a',
        },
        'skill-b': {
          source: 'github.com/owner/repo',
          sourceType: 'github',
          computedHash: 'hash-b',
        },
      },
    };

    beforeEach(() => {
      vi.mocked(localLock.readLocalLock).mockResolvedValue(mockLockFile);
      vi.mocked(localLock.writeLocalLock).mockResolvedValue(undefined);
      vi.mocked(readdir).mockResolvedValue([]);
    });

    it('should sync all skills in dry-run mode', async () => {
      vi.mocked(access)
        .mockRejectedValueOnce(new Error('ENOENT')) // skill-a missing
        .mockResolvedValueOnce(undefined); // skill-b exists

      vi.mocked(localLock.computeSkillFolderHash).mockResolvedValue('hash-b');

      const result = await syncAllSkills({ cwd: mockCwd, dryRun: true });

      expect(result.installed).toContain('skill-a');
      expect(result.upToDate).toContain('skill-b');
      expect(localLock.writeLocalLock).not.toHaveBeenCalled();
    });

    it('should sync specific skills only', async () => {
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      const result = await syncAllSkills({
        cwd: mockCwd,
        skillNames: ['skill-a'],
        dryRun: true,
      });

      expect(result.installed).toContain('skill-a');
      expect(result.installed).not.toContain('skill-b');
    });

    it('should handle skill not found in lock file', async () => {
      const result = await syncAllSkills({
        cwd: mockCwd,
        skillNames: ['non-existent-skill'],
        dryRun: true,
      });

      expect(result.failed).toHaveLength(1);
      expect(result.failed[0]?.name).toBe('non-existent-skill');
      expect(result.failed[0]?.error).toBe('Skill not found in lock file');
    });

    it('should force sync all skills when force flag is set', async () => {
      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(localLock.computeSkillFolderHash).mockResolvedValue('hash-a');

      const result = await syncAllSkills({ cwd: mockCwd, force: true, dryRun: true });

      expect(result.updated).toContain('skill-a');
      expect(result.updated).toContain('skill-b');
    });

    it('should return empty result when no skills in lock file', async () => {
      vi.mocked(localLock.readLocalLock).mockResolvedValue({
        version: 1,
        skills: {},
      });

      const result = await syncAllSkills({ cwd: mockCwd });

      expect(result.installed).toHaveLength(0);
      expect(result.updated).toHaveLength(0);
      expect(result.success).toBe(true);
    });
  });
});
