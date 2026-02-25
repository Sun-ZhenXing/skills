import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { existsSync } from 'node:fs';

// Import after mocking
import {
  getConfigDir,
  getConfigPath,
  readConfig,
  writeConfig,
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
  type ConfigKey,
} from './config.ts';

describe('config', () => {
  let tempDir: string;
  let originalHome: string | undefined;
  let originalXdgConfigHome: string | undefined;
  let originalLocalAppData: string | undefined;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(async () => {
    // Save original environment
    originalHome = process.env.HOME;
    originalXdgConfigHome = process.env.XDG_CONFIG_HOME;
    originalLocalAppData = process.env.LOCALAPPDATA;
    originalEnv = { ...process.env };

    // Clear environment variables that affect config path
    delete process.env.XDG_CONFIG_HOME;
    delete process.env.LOCALAPPDATA;
    delete process.env.SKILLS_REGISTRY;
    delete process.env.SKILLS_TIMEOUT;
    delete process.env.SKILLS_TELEMETRY;

    // Create temp directory for tests
    tempDir = await mkdtemp(join(tmpdir(), 'skills-config-test-'));

    // Mock homedir to return temp directory
    process.env.HOME = tempDir;
    process.env.USERPROFILE = tempDir;
  });

  afterEach(async () => {
    // Restore original environment
    if (originalHome !== undefined) {
      process.env.HOME = originalHome;
    } else {
      delete process.env.HOME;
    }
    if (originalXdgConfigHome !== undefined) {
      process.env.XDG_CONFIG_HOME = originalXdgConfigHome;
    } else {
      delete process.env.XDG_CONFIG_HOME;
    }
    if (originalLocalAppData !== undefined) {
      process.env.LOCALAPPDATA = originalLocalAppData;
    } else {
      delete process.env.LOCALAPPDATA;
    }

    // Restore other env vars
    process.env = originalEnv;

    // Clean up temp directory
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('getConfigDir', () => {
    it('returns XDG_CONFIG_HOME path when set', () => {
      process.env.XDG_CONFIG_HOME = '/xdg/config';
      const result = getConfigDir();
      expect(result).toBe(join('/xdg/config', 'skills'));
    });

    it('returns LOCALAPPDATA path on Windows', () => {
      process.env.LOCALAPPDATA = 'C:\\Users\\test\\AppData\\Local';
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'win32' });

      try {
        const result = getConfigDir();
        expect(result).toBe(join('C:\\Users\\test\\AppData\\Local', 'skills'));
      } finally {
        if (originalPlatform) {
          Object.defineProperty(process, 'platform', originalPlatform);
        }
      }
    });

    it('returns ~/.config/skills on macOS/Linux when XDG_CONFIG_HOME not set', () => {
      // Get the current HOME value for comparison
      const homeDir = process.env.HOME || process.env.USERPROFILE;
      const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
      Object.defineProperty(process, 'platform', { value: 'linux' });

      try {
        const result = getConfigDir();
        // The result should include .config/skills in the path
        expect(result).toContain('.config');
        expect(result).toContain('skills');
        expect(result.endsWith(join('.config', 'skills'))).toBe(true);
      } finally {
        if (originalPlatform) {
          Object.defineProperty(process, 'platform', originalPlatform);
        }
      }
    });
  });

  describe('getConfigPath', () => {
    it('returns config.json in config directory', () => {
      const result = getConfigPath();
      expect(result).toContain('config.json');
    });
  });

  describe('readConfig', () => {
    it('returns empty object when config file does not exist', () => {
      const result = readConfig();
      expect(result).toEqual({});
    });

    it('reads and parses valid config file', async () => {
      const configDir = getConfigDir();
      await mkdir(configDir, { recursive: true });
      const config = { registry: 'https://custom.registry.com', timeout: 60 };
      await writeFile(join(configDir, 'config.json'), JSON.stringify(config), 'utf-8');

      const result = readConfig();
      expect(result).toEqual(config);
    });

    it('returns empty object for invalid JSON', async () => {
      const configDir = getConfigDir();
      await mkdir(configDir, { recursive: true });
      await writeFile(join(configDir, 'config.json'), 'not valid json', 'utf-8');

      const result = readConfig();
      expect(result).toEqual({});
    });

    it('returns empty object for non-object JSON', async () => {
      const configDir = getConfigDir();
      await mkdir(configDir, { recursive: true });
      await writeFile(join(configDir, 'config.json'), '"string"', 'utf-8');

      const result = readConfig();
      expect(result).toEqual({});
    });
  });

  describe('writeConfig', () => {
    it('writes config to file', async () => {
      const config = { registry: 'https://test.com', telemetry: false };
      writeConfig(config);

      const configPath = getConfigPath();
      const content = await readFile(configPath, 'utf-8');
      expect(JSON.parse(content)).toEqual(config);
    });

    it('creates directories if needed', async () => {
      const config = { timeout: 120 };
      writeConfig(config);

      const configPath = getConfigPath();
      expect(existsSync(configPath)).toBe(true);
    });
  });

  describe('getConfigValue', () => {
    it('returns default value when not set', () => {
      const result = getConfigValue('registry');
      expect(result.value).toBe('https://skills.sh/');
      expect(result.source).toBe('default');
    });

    it('returns file value when set in config', async () => {
      const configDir = getConfigDir();
      await mkdir(configDir, { recursive: true });
      await writeFile(
        join(configDir, 'config.json'),
        JSON.stringify({ registry: 'https://file.value.com' }),
        'utf-8'
      );

      const result = getConfigValue('registry');
      expect(result.value).toBe('https://file.value.com');
      expect(result.source).toBe('file');
    });

    it('returns environment value when set', async () => {
      process.env.SKILLS_REGISTRY = 'https://env.value.com';

      const result = getConfigValue('registry');
      expect(result.value).toBe('https://env.value.com');
      expect(result.source).toBe('env');
    });

    it('environment takes precedence over file', async () => {
      process.env.SKILLS_REGISTRY = 'https://env.value.com';

      const configDir = getConfigDir();
      await mkdir(configDir, { recursive: true });
      await writeFile(
        join(configDir, 'config.json'),
        JSON.stringify({ registry: 'https://file.value.com' }),
        'utf-8'
      );

      const result = getConfigValue('registry');
      expect(result.value).toBe('https://env.value.com');
      expect(result.source).toBe('env');
    });

    it('parses timeout as number from environment', () => {
      process.env.SKILLS_TIMEOUT = '60';

      const result = getConfigValue('timeout');
      expect(result.value).toBe(60);
      expect(typeof result.value).toBe('number');
    });

    it('parses telemetry as boolean from environment', () => {
      process.env.SKILLS_TELEMETRY = 'false';

      const result = getConfigValue('telemetry');
      expect(result.value).toBe(false);
      expect(typeof result.value).toBe('boolean');
    });
  });

  describe('getAllConfigValues', () => {
    it('returns all config values with sources', () => {
      const result = getAllConfigValues();

      expect(result.registry.value).toBeDefined();
      expect(result['update-registry'].value).toBeDefined();
      expect(result.timeout.value).toBeDefined();
      expect(result.telemetry.value).toBeDefined();
    });
  });

  describe('setConfigValue', () => {
    it('sets a config value', () => {
      setConfigValue('registry', 'https://new.registry.com');

      const result = getConfigValue('registry');
      expect(result.value).toBe('https://new.registry.com');
      expect(result.source).toBe('file');
    });

    it('updates existing config value', async () => {
      setConfigValue('timeout', 30);
      setConfigValue('timeout', 60);

      const result = getConfigValue('timeout');
      expect(result.value).toBe(60);
    });
  });

  describe('unsetConfigValue', () => {
    it('removes a config value', () => {
      setConfigValue('registry', 'https://test.com');
      const existed = unsetConfigValue('registry');

      expect(existed).toBe(true);
      const result = getConfigValue('registry');
      expect(result.value).toBe('https://skills.sh/'); // back to default
      expect(result.source).toBe('default');
    });

    it('returns false when key does not exist', () => {
      const existed = unsetConfigValue('registry');
      expect(existed).toBe(false);
    });
  });

  describe('validateConfigValue', () => {
    describe('registry', () => {
      it('validates valid HTTPS URL', () => {
        const result = validateConfigValue('registry', 'https://example.com');
        expect(result.valid).toBe(true);
        expect(result.warning).toBeUndefined();
      });

      it('validates valid HTTP URL', () => {
        const result = validateConfigValue('registry', 'http://example.com');
        expect(result.valid).toBe(true);
      });

      it('invalidates malformed URL', () => {
        const result = validateConfigValue('registry', 'not-a-url');
        expect(result.valid).toBe(false);
        expect(result.warning).toContain('Invalid URL');
      });

      it('invalidates non-HTTP protocol', () => {
        const result = validateConfigValue('registry', 'ftp://example.com');
        expect(result.valid).toBe(false);
        expect(result.warning).toContain('Invalid protocol');
      });
    });

    describe('timeout', () => {
      it('validates positive number', () => {
        const result = validateConfigValue('timeout', '60');
        expect(result.valid).toBe(true);
      });

      it('invalidates non-numeric value', () => {
        const result = validateConfigValue('timeout', 'abc');
        expect(result.valid).toBe(false);
        expect(result.warning).toContain('must be a number');
      });

      it('invalidates negative number', () => {
        const result = validateConfigValue('timeout', '-1');
        expect(result.valid).toBe(false);
        expect(result.warning).toContain('positive number');
      });

      it('invalidates zero', () => {
        const result = validateConfigValue('timeout', '0');
        expect(result.valid).toBe(false);
        expect(result.warning).toContain('positive number');
      });
    });

    describe('telemetry', () => {
      it('validates true', () => {
        const result = validateConfigValue('telemetry', 'true');
        expect(result.valid).toBe(true);
      });

      it('validates false', () => {
        const result = validateConfigValue('telemetry', 'false');
        expect(result.valid).toBe(true);
      });

      it('validates 1', () => {
        const result = validateConfigValue('telemetry', '1');
        expect(result.valid).toBe(true);
      });

      it('validates 0', () => {
        const result = validateConfigValue('telemetry', '0');
        expect(result.valid).toBe(true);
      });

      it('invalidates other values', () => {
        const result = validateConfigValue('telemetry', 'maybe');
        expect(result.valid).toBe(false);
        expect(result.warning).toContain('true or false');
      });
    });
  });

  describe('formatConfigValue', () => {
    it('formats string value', () => {
      expect(formatConfigValue('test')).toBe('test');
    });

    it('formats number value', () => {
      expect(formatConfigValue(42)).toBe('42');
    });

    it('formats true boolean', () => {
      expect(formatConfigValue(true)).toBe('true');
    });

    it('formats false boolean', () => {
      expect(formatConfigValue(false)).toBe('false');
    });

    it('formats undefined as empty string', () => {
      expect(formatConfigValue(undefined)).toBe('');
    });
  });

  describe('isValidConfigKey', () => {
    it('returns true for valid keys', () => {
      expect(isValidConfigKey('registry')).toBe(true);
      expect(isValidConfigKey('timeout')).toBe(true);
      expect(isValidConfigKey('telemetry')).toBe(true);
    });

    it('returns false for invalid keys', () => {
      expect(isValidConfigKey('invalid')).toBe(false);
      expect(isValidConfigKey('')).toBe(false);
    });
  });

  describe('getValidConfigKeys', () => {
    it('returns all valid config keys', () => {
      const keys = getValidConfigKeys();
      expect(keys).toContain('registry');
      expect(keys).toContain('timeout');
      expect(keys).toContain('telemetry');
    });
  });

  describe('getDefaultValue', () => {
    it('returns default registry', () => {
      expect(getDefaultValue('registry')).toBe('https://skills.sh/');
      expect(getDefaultValue('update-registry')).toBe('https://add-skill.vercel.sh');
    });

    it('returns default timeout', () => {
      expect(getDefaultValue('timeout')).toBe(30);
    });

    it('returns default telemetry', () => {
      expect(getDefaultValue('telemetry')).toBe(true);
    });
  });

  describe('getEnvVarName', () => {
    it('returns correct env var for registry', () => {
      expect(getEnvVarName('registry')).toBe('SKILLS_REGISTRY');
    });

    it('returns correct env var for timeout', () => {
      expect(getEnvVarName('timeout')).toBe('SKILLS_TIMEOUT');
    });

    it('returns correct env var for telemetry', () => {
      expect(getEnvVarName('telemetry')).toBe('SKILLS_TELEMETRY');
    });
  });
});
