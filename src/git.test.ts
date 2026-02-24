import { afterEach, describe, expect, it, vi } from 'vitest';
import { rm } from 'fs/promises';
import simpleGit from 'simple-git';
import { cloneRepo, GitCloneError } from './git.ts';

vi.mock('simple-git', () => ({
  default: vi.fn(),
}));

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
});
