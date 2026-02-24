import simpleGit from 'simple-git';
import { join, normalize, resolve, sep } from 'path';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';

const CLONE_TIMEOUT_MS = 60000; // 60 seconds

export class GitCloneError extends Error {
  readonly url: string;
  readonly isTimeout: boolean;
  readonly isAuthError: boolean;
  readonly isUnreachableError: boolean;

  constructor(
    message: string,
    url: string,
    isTimeout = false,
    isAuthError = false,
    isUnreachableError = false
  ) {
    super(message);
    this.name = 'GitCloneError';
    this.url = url;
    this.isTimeout = isTimeout;
    this.isAuthError = isAuthError;
    this.isUnreachableError = isUnreachableError;
  }
}

export async function cloneRepo(url: string, ref?: string): Promise<string> {
  const tempDir = await mkdtemp(join(tmpdir(), 'skills-'));
  const git = simpleGit({
    timeout: { block: CLONE_TIMEOUT_MS },
  });
  const cloneOptions = ref ? [] : ['--depth', '1'];
  const previousPromptValue = process.env.GIT_TERMINAL_PROMPT;
  process.env.GIT_TERMINAL_PROMPT = '0';

  try {
    await git.clone(url, tempDir, cloneOptions);

    if (ref) {
      const clonedRepo = simpleGit({
        baseDir: tempDir,
        timeout: { block: CLONE_TIMEOUT_MS },
      });
      await clonedRepo.checkout(ref);
    }

    return tempDir;
  } catch (error) {
    // Clean up temp dir on failure
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});

    const errorMessage = error instanceof Error ? error.message : String(error);
    const normalizedMessage = errorMessage.toLowerCase();
    const isTimeout = errorMessage.includes('block timeout') || errorMessage.includes('timed out');
    const isAuthError =
      errorMessage.includes('Authentication failed') ||
      errorMessage.includes('could not read Username') ||
      errorMessage.includes('Permission denied') ||
      errorMessage.includes('Repository not found');
    const isUnreachableError =
      normalizedMessage.includes('could not resolve host') ||
      normalizedMessage.includes('no route to host') ||
      normalizedMessage.includes('connection timed out') ||
      normalizedMessage.includes('failed to connect') ||
      normalizedMessage.includes('connection refused') ||
      normalizedMessage.includes('name or service not known') ||
      normalizedMessage.includes('unable to access');

    if (isTimeout) {
      throw new GitCloneError(
        `Clone timed out after 60s. This often happens with private repos that require authentication.\n` +
          `  Ensure you have access and your SSH keys or credentials are configured:\n` +
          `  - For SSH: ssh-add -l (to check loaded keys)\n` +
          `  - For HTTPS: gh auth status (if using GitHub CLI)`,
        url,
        true,
        false,
        false
      );
    }

    if (isAuthError) {
      throw new GitCloneError(
        `Authentication failed for ${url}.\n` +
          `  - For private repos, ensure you have access\n` +
          `  - For SSH: Check your keys with 'ssh -T git@github.com'\n` +
          `  - For HTTPS: Run 'gh auth login' or configure git credentials`,
        url,
        false,
        true,
        false
      );
    }

    if (isUnreachableError) {
      throw new GitCloneError(
        `Repository is unreachable: ${url}.\n` +
          `  - Verify the repository URL is correct\n` +
          `  - Check network connectivity and VPN/proxy settings\n` +
          `  - Confirm the Git host is accessible from your environment`,
        url,
        false,
        false,
        true
      );
    }

    throw new GitCloneError(`Failed to clone ${url}: ${errorMessage}`, url, false, false, false);
  } finally {
    if (previousPromptValue === undefined) {
      delete process.env.GIT_TERMINAL_PROMPT;
    } else {
      process.env.GIT_TERMINAL_PROMPT = previousPromptValue;
    }
  }
}

export async function cleanupTempDir(dir: string): Promise<void> {
  // Validate that the directory path is within tmpdir to prevent deletion of arbitrary paths
  const normalizedDir = normalize(resolve(dir));
  const normalizedTmpDir = normalize(resolve(tmpdir()));

  if (!normalizedDir.startsWith(normalizedTmpDir + sep) && normalizedDir !== normalizedTmpDir) {
    throw new Error('Attempted to clean up directory outside of temp directory');
  }

  await rm(dir, { recursive: true, force: true });
}
