import { afterEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'fs/promises';
import simpleGit from 'simple-git';
import { cloneRepo, GitCloneError, isGitHubShorthand, resolveGitHubUrl } from './git.ts';

vi.mock('simple-git', () => ({
  default: vi.fn(),
}));

describe('isGitHubShorthand', () => {
  it('detects GitHub shorthand format (owner/repo)', () => {
    expect(isGitHubShorthand('wshobson/agents')).toBe(true);
    expect(isGitHubShorthand('vercel-labs/agent-skills')).toBe(true);
    expect(isGitHubShorthand('user/my-repo')).toBe(true);
    expect(isGitHubShorthand('org/some_repo')).toBe(true);
    expect(isGitHubShorthand('user123/repo456')).toBe(true);
  });

  it('rejects full HTTPS URLs', () => {
    expect(isGitHubShorthand('https://github.com/wshobson/agents.git')).toBe(false);
    expect(isGitHubShorthand('https://github.com/user/repo')).toBe(false);
    expect(isGitHubShorthand('http://github.com/user/repo.git')).toBe(false);
  });

  it('rejects SSH URLs', () => {
    expect(isGitHubShorthand('git@github.com:wshobson/agents.git')).toBe(false);
    expect(isGitHubShorthand('git@github.com:user/repo')).toBe(false);
  });

  it('rejects local paths with dot prefix', () => {
    expect(isGitHubShorthand('./local/path')).toBe(false);
    expect(isGitHubShorthand('../parent/repo')).toBe(false);
    expect(isGitHubShorthand('./my-repo')).toBe(false);
  });

  it('rejects absolute Unix paths', () => {
    expect(isGitHubShorthand('/home/user/repo')).toBe(false);
    expect(isGitHubShorthand('/path/to/skill')).toBe(false);
  });

  it('rejects Windows paths', () => {
    expect(isGitHubShorthand('C:\\Users\\repo')).toBe(false);
    expect(isGitHubShorthand('D:\\path\\to\\skill')).toBe(false);
    expect(isGitHubShorthand('C:/Users/repo')).toBe(false);
    expect(isGitHubShorthand('path\\to\\repo')).toBe(false);
  });

  it('rejects strings without slash', () => {
    expect(isGitHubShorthand('just-a-name')).toBe(false);
    expect(isGitHubShorthand('nonslash')).toBe(false);
  });

  it('rejects strings with multiple slashes', () => {
    expect(isGitHubShorthand('owner/repo/extra')).toBe(false);
    expect(isGitHubShorthand('a/b/c')).toBe(false);
  });
});

describe('resolveGitHubUrl', () => {
  it('converts GitHub shorthand to HTTPS URL', () => {
    expect(resolveGitHubUrl('wshobson/agents')).toBe('https://github.com/wshobson/agents.git');
    expect(resolveGitHubUrl('vercel-labs/agent-skills')).toBe(
      'https://github.com/vercel-labs/agent-skills.git'
    );
    expect(resolveGitHubUrl('user/my-repo')).toBe('https://github.com/user/my-repo.git');
  });

  it('preserves full HTTPS URLs unchanged', () => {
    expect(resolveGitHubUrl('https://github.com/wshobson/agents.git')).toBe(
      'https://github.com/wshobson/agents.git'
    );
    expect(resolveGitHubUrl('https://github.com/user/repo')).toBe('https://github.com/user/repo');
    expect(resolveGitHubUrl('https://gitlab.com/user/repo.git')).toBe(
      'https://gitlab.com/user/repo.git'
    );
  });

  it('preserves SSH URLs unchanged', () => {
    expect(resolveGitHubUrl('git@github.com:wshobson/agents.git')).toBe(
      'git@github.com:wshobson/agents.git'
    );
    expect(resolveGitHubUrl('git@github.com:user/repo')).toBe('git@github.com:user/repo');
  });

  it('preserves local paths unchanged', () => {
    expect(resolveGitHubUrl('./local/path')).toBe('./local/path');
    expect(resolveGitHubUrl('../parent/repo')).toBe('../parent/repo');
    expect(resolveGitHubUrl('/home/user/repo')).toBe('/home/user/repo');
    expect(resolveGitHubUrl('C:\\Users\\repo')).toBe('C:\\Users\\repo');
  });
});

describe('git clone behavior', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('checks out explicit ref after cloning generic git source', async () => {
    const clone = vi.fn().mockResolvedValue(undefined);
    const checkout = vi.fn().mockResolvedValue(undefined);
    const revparse = vi.fn().mockResolvedValue('abc123\n');

    const simpleGitMock = vi.mocked(simpleGit);
    simpleGitMock.mockImplementationOnce(() => ({ clone }) as any);
    simpleGitMock.mockImplementationOnce(() => ({ checkout, revparse }) as any);

    const result = await cloneRepo('https://git.example.com/team/skills.git', 'release/v1');

    expect(clone).toHaveBeenCalledWith(
      'https://git.example.com/team/skills.git',
      result.tempDir,
      []
    );
    expect(checkout).toHaveBeenCalledWith('release/v1');
    expect(result.resolvedRevision).toBe('abc123');

    await rm(result.tempDir, { recursive: true, force: true });
  });

  it('maps authentication failures to actionable GitCloneError', async () => {
    const clone = vi.fn().mockRejectedValue(new Error('Authentication failed'));
    vi.mocked(simpleGit).mockImplementation(() => ({ clone }) as any);

    await expect(cloneRepo('git@git.example.com:team/private.git')).rejects.toMatchObject({
      name: 'GitCloneError',
      isAuthError: true,
      isUnreachableError: false,
    } satisfies Partial<GitCloneError>);
  });

  it('maps unreachable repository failures to actionable GitCloneError', async () => {
    const clone = vi.fn().mockRejectedValue(new Error('Could not resolve host: git.example.com'));
    vi.mocked(simpleGit).mockImplementation(() => ({ clone }) as any);

    await expect(cloneRepo('https://git.example.com/team/private.git')).rejects.toMatchObject({
      name: 'GitCloneError',
      isAuthError: false,
      isUnreachableError: true,
    } satisfies Partial<GitCloneError>);
  });

  it('resolves GitHub shorthand to full URL before cloning', async () => {
    const clone = vi.fn().mockResolvedValue(undefined);
    const revparse = vi.fn().mockResolvedValue('abc123\n');

    const simpleGitMock = vi.mocked(simpleGit);
    simpleGitMock.mockImplementationOnce(() => ({ clone }) as any);
    simpleGitMock.mockImplementationOnce(() => ({ revparse }) as any);

    const result = await cloneRepo('wshobson/agents');

    expect(clone).toHaveBeenCalledWith('https://github.com/wshobson/agents.git', result.tempDir, [
      '--depth',
      '1',
    ]);

    await rm(result.tempDir, { recursive: true, force: true });
  });

  it('preserves full URLs without modification', async () => {
    const clone = vi.fn().mockResolvedValue(undefined);
    const revparse = vi.fn().mockResolvedValue('abc123\n');

    const simpleGitMock = vi.mocked(simpleGit);
    simpleGitMock.mockImplementationOnce(() => ({ clone }) as any);
    simpleGitMock.mockImplementationOnce(() => ({ revparse }) as any);

    const result = await cloneRepo('https://github.com/wshobson/agents.git');

    expect(clone).toHaveBeenCalledWith('https://github.com/wshobson/agents.git', result.tempDir, [
      '--depth',
      '1',
    ]);

    await rm(result.tempDir, { recursive: true, force: true });
  });
});
