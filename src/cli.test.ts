import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { runCli, runCliOutput, stripLogo, hasLogo } from './test-utils.ts';

describe('skills CLI', () => {
  describe('--help', () => {
    it('should display help message', () => {
      const output = runCliOutput(['--help']);
      expect(output).toContain('Usage: skills <command> [options]');
      expect(output).toContain('Manage Skills:');
      expect(output).toContain('init [name]');
      expect(output).toContain('add <package>');
      expect(output).toContain('check');
      expect(output).toContain('update');
      expect(output).toContain('Add Options:');
      expect(output).toContain('-g, --global');
      expect(output).toContain('-a, --agent');
      expect(output).toContain('-s, --skill');
      expect(output).toContain('-l, --list');
      expect(output).toContain('-y, --yes');
      expect(output).toContain('--all');
    });

    it('should show same output for -h alias', () => {
      const helpOutput = runCliOutput(['--help']);
      const hOutput = runCliOutput(['-h']);
      expect(hOutput).toBe(helpOutput);
    });
  });

  describe('--version', () => {
    it('should display version number', () => {
      const output = runCliOutput(['--version']);
      expect(output.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should match package.json version', () => {
      const output = runCliOutput(['--version']);
      const pkg = JSON.parse(
        readFileSync(join(import.meta.dirname, '..', 'package.json'), 'utf-8')
      );
      expect(output.trim()).toBe(pkg.version);
    });
  });

  describe('no arguments', () => {
    it('should display banner', () => {
      const output = stripLogo(runCliOutput([]));
      expect(output).toContain('The open agent skills ecosystem');
      expect(output).toContain('npx skills add');
      expect(output).toContain('npx skills check');
      expect(output).toContain('npx skills update');
      expect(output).toContain('npx skills init');
      expect(output).toContain('skills.sh');
    });
  });

  describe('unknown command', () => {
    it('should show error for unknown command', () => {
      const output = runCliOutput(['unknown-command']);
      expect(output).toMatchInlineSnapshot(`
        "Unknown command: unknown-command
        Run skills --help for usage.
        "
      `);
    });
  });

  describe('logo display', () => {
    it('should not display logo for list command', () => {
      const output = runCliOutput(['list']);
      expect(hasLogo(output)).toBe(false);
    });

    it('should not display logo for check command', () => {
      // Note: check command makes GitHub API calls, so we just verify initial output
      const output = runCliOutput(['check']);
      expect(hasLogo(output)).toBe(false);
    }, 60000);

    it('should not display logo for update command', () => {
      // Note: update command makes GitHub API calls, so we just verify initial output
      const output = runCliOutput(['update']);
      expect(hasLogo(output)).toBe(false);
    }, 60000);
  });

  describe('non-GitHub update behavior', () => {
    function createHomeWithLock(lockData: unknown): string {
      const homeDir = mkdtempSync(join(tmpdir(), 'skills-cli-home-'));
      const agentsDir = join(homeDir, '.agents');
      mkdirSync(agentsDir, { recursive: true });
      writeFileSync(
        join(agentsDir, '.skill-lock.json'),
        JSON.stringify(lockData, null, 2),
        'utf-8'
      );
      return homeDir;
    }

    it('check shows manual-update guidance for non-GitHub sources', () => {
      const lock = {
        version: 3,
        skills: {
          'private-skill': {
            source: 'git@git.example.com:team/private-skills.git',
            sourceType: 'git',
            sourceUrl: 'git@git.example.com:team/private-skills.git',
            skillFolderHash: '',
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      const homeDir = createHomeWithLock(lock);
      try {
        const result = runCli(['check'], process.cwd(), {
          HOME: homeDir,
          USERPROFILE: homeDir,
          HOMEDRIVE: 'C:',
          HOMEPATH: '\\',
        });
        expect(result.stdout).toContain('manual update');
        expect(result.stdout).toContain('private-skill');
      } finally {
        rmSync(homeDir, { recursive: true, force: true });
      }
    });

    it('update reports non-GitHub entries as manually updatable', () => {
      const lock = {
        version: 3,
        skills: {
          'private-skill': {
            source: 'git@git.example.com:team/private-skills.git',
            sourceType: 'git',
            sourceUrl: 'git@git.example.com:team/private-skills.git',
            skillFolderHash: '',
            installedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        },
      };

      const homeDir = createHomeWithLock(lock);
      try {
        const result = runCli(['update'], process.cwd(), {
          HOME: homeDir,
          USERPROFILE: homeDir,
          HOMEDRIVE: 'C:',
          HOMEPATH: '\\',
        });
        expect(result.stdout).toContain('require manual update');
      } finally {
        rmSync(homeDir, { recursive: true, force: true });
      }
    });
  });
});
