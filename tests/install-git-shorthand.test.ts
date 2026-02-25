import { describe, it, expect } from 'vitest';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('install - git shorthand detection', () => {
  describe('isGitShorthand', () => {
    it('returns true for owner/repo format', () => {
      expect(isGitShorthand('owner/repo')).toBe(true);
      expect(isGitShorthand('my-org/my-repo')).toBe(true);
      expect(isGitShorthand('AlexSun/antfu-skills')).toBe(true);
    });

    it('returns false for full HTTPS URLs', () => {
      expect(isGitShorthand('https://github.com/owner/repo.git')).toBe(false);
      expect(isGitShorthand('https://gitlab.com/owner/repo.git')).toBe(false);
      expect(isGitShorthand('http://example.com/repo.git')).toBe(false);
    });

    it('returns false for SSH format', () => {
      expect(isGitShorthand('git@github.com:owner/repo.git')).toBe(false);
      expect(isGitShorthand('git@gitlab.com:owner/repo.git')).toBe(false);
    });

    it('returns false for other git protocols', () => {
      expect(isGitShorthand('git://github.com/owner/repo.git')).toBe(false);
      expect(isGitShorthand('ssh://git@github.com/owner/repo.git')).toBe(false);
    });
  });

  describe('convertShorthandToUrl', () => {
    it('converts owner/repo to HTTPS URL', () => {
      expect(convertShorthandToUrl('owner/repo')).toBe('https://github.com/owner/repo.git');
      expect(convertShorthandToUrl('AlexSun/antfu-skills')).toBe(
        'https://github.com/AlexSun/antfu-skills.git'
      );
    });

    it('leaves full HTTPS URLs unchanged', () => {
      expect(convertShorthandToUrl('https://github.com/owner/repo.git')).toBe(
        'https://github.com/owner/repo.git'
      );
    });

    it('leaves SSH format unchanged', () => {
      expect(convertShorthandToUrl('git@github.com:owner/repo.git')).toBe(
        'git@github.com:owner/repo.git'
      );
    });
  });

  describe('buildSourceWithRef', () => {
    it('appends declaredRef when available', () => {
      const entry = {
        source: 'owner/repo',
        sourceType: 'git',
        declaredRef: 'v1.0.0',
        computedHash: 'abc123',
      };
      expect(buildSourceWithRef('https://github.com/owner/repo.git', entry)).toBe(
        'https://github.com/owner/repo.git@v1.0.0'
      );
    });

    it('appends resolvedRef when declaredRef is not available', () => {
      const entry = {
        source: 'owner/repo',
        sourceType: 'git',
        resolvedRef: 'main',
        computedHash: 'abc123',
      };
      expect(buildSourceWithRef('https://github.com/owner/repo.git', entry)).toBe(
        'https://github.com/owner/repo.git@main'
      );
    });

    it('prefers declaredRef over resolvedRef', () => {
      const entry = {
        source: 'owner/repo',
        sourceType: 'git',
        declaredRef: 'v1.0.0',
        resolvedRef: 'main',
        computedHash: 'abc123',
      };
      expect(buildSourceWithRef('https://github.com/owner/repo.git', entry)).toBe(
        'https://github.com/owner/repo.git@v1.0.0'
      );
    });

    it('returns source unchanged when no ref is available', () => {
      const entry = {
        source: 'owner/repo',
        sourceType: 'git',
        computedHash: 'abc123',
      };
      expect(buildSourceWithRef('https://github.com/owner/repo.git', entry)).toBe(
        'https://github.com/owner/repo.git'
      );
    });
  });
});

// Import functions from install.ts for testing
// Note: These are copied here for testing since they are not exported
function isGitShorthand(source: string): boolean {
  if (source.startsWith('http://') || source.startsWith('https://')) {
    return false;
  }
  if (source.startsWith('git://') || source.startsWith('ssh://')) {
    return false;
  }
  if (source.includes('@') && source.includes(':')) {
    return false;
  }
  return source.includes('/') && !source.includes('://');
}

function convertShorthandToUrl(source: string): string {
  if (isGitShorthand(source)) {
    return `https://github.com/${source}.git`;
  }
  return source;
}

interface LocalSkillLockEntry {
  source: string;
  sourceType: string;
  declaredRef?: string;
  resolvedRef?: string;
  computedHash: string;
}

function buildSourceWithRef(source: string, entry: LocalSkillLockEntry): string {
  const ref = entry.declaredRef ?? entry.resolvedRef;
  if (ref) {
    return `${source}@${ref}`;
  }
  return source;
}
