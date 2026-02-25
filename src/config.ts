import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform } from 'os';

// ============================================
// Types
// ============================================

export interface Config {
  /** Default registry URL for skill discovery */
  registry?: string;
  /** Default timeout for network operations (seconds) */
  timeout?: number;
  /** Enable/disable telemetry */
  telemetry?: boolean;
}

export type ConfigKey = keyof Config;

export interface ConfigValueWithSource {
  value: string | number | boolean | undefined;
  source: 'env' | 'file' | 'default';
}

// ============================================
// Constants
// ============================================

const DEFAULT_CONFIG: Required<Config> = {
  registry: 'https://add-skill.vercel.sh',
  timeout: 30,
  telemetry: true,
};

const ENV_VAR_MAP: Record<ConfigKey, string> = {
  registry: 'SKILLS_REGISTRY',
  timeout: 'SKILLS_TIMEOUT',
  telemetry: 'SKILLS_TELEMETRY',
};

// ============================================
// Config File Path Resolution
// ============================================

/**
 * Get the config directory path following XDG Base Directory Specification
 * with fallback to legacy ~/.agents/ directory
 */
export function getConfigDir(): string {
  const home = homedir();

  // Check for XDG_CONFIG_HOME (Linux/macOS standard)
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return join(xdgConfigHome, 'skills');
  }

  // Windows: use LOCALAPPDATA
  if (platform() === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      return join(localAppData, 'skills');
    }
  }

  // macOS/Linux default: ~/.config/skills
  if (platform() !== 'win32') {
    return join(home, '.config', 'skills');
  }

  // Fallback to legacy location
  return join(home, '.agents');
}

/**
 * Get the full path to the config file
 */
export function getConfigPath(): string {
  const configDir = getConfigDir();
  return join(configDir, 'config.json');
}

// ============================================
// Config File Operations
// ============================================

/**
 * Read and parse the config file
 * Returns empty object if file doesn't exist or is invalid
 */
export function readConfig(): Config {
  const configPath = getConfigPath();

  try {
    if (!existsSync(configPath)) {
      return {};
    }

    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content) as unknown;

    // Validate that parsed value is an object
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn(`Warning: Invalid config file format at ${configPath}. Using empty config.`);
      return {};
    }

    return parsed as Config;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.warn(
        `Warning: Config file contains invalid JSON at ${configPath}. Using empty config.`
      );
    } else {
      console.warn(`Warning: Could not read config file at ${configPath}. Using empty config.`);
    }
    return {};
  }
}

/**
 * Write config to file, creating directories if needed
 */
export function writeConfig(config: Config): void {
  const configPath = getConfigPath();
  const configDir = dirname(configPath);

  // Create directory if it doesn't exist
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

// ============================================
// Config Value Operations
// ============================================

/**
 * Get a config value with environment variable override support
 * Priority: Environment variable > Config file > Default value
 */
export function getConfigValue(key: ConfigKey): ConfigValueWithSource {
  // Check environment variable first
  const envVar = ENV_VAR_MAP[key];
  const envValue = process.env[envVar];

  if (envValue !== undefined) {
    // Parse environment variable value based on expected type
    const parsedValue = parseConfigValue(key, envValue);
    return { value: parsedValue, source: 'env' };
  }

  // Check config file
  const config = readConfig();
  const fileValue = config[key];

  if (fileValue !== undefined) {
    return { value: fileValue, source: 'file' };
  }

  // Fall back to default
  return { value: DEFAULT_CONFIG[key], source: 'default' };
}

/**
 * Get all config values with their sources
 */
export function getAllConfigValues(): Record<ConfigKey, ConfigValueWithSource> {
  const result = {} as Record<ConfigKey, ConfigValueWithSource>;

  for (const key of Object.keys(DEFAULT_CONFIG) as ConfigKey[]) {
    result[key] = getConfigValue(key);
  }

  return result;
}

/**
 * Get just the value (without source info)
 */
export function getConfig(key: ConfigKey): string | number | boolean | undefined {
  return getConfigValue(key).value;
}

/**
 * Set a config value
 */
export function setConfigValue(key: ConfigKey, value: string | number | boolean): void {
  const config = readConfig();
  (config as Record<ConfigKey, string | number | boolean>)[key] = value;
  writeConfig(config);
}

/**
 * Unset (remove) a config value
 * Returns true if the key existed and was removed, false otherwise
 */
export function unsetConfigValue(key: ConfigKey): boolean {
  const config = readConfig();

  if (!(key in config)) {
    return false;
  }

  delete config[key];
  writeConfig(config);
  return true;
}

// ============================================
// Validation
// ============================================

/**
 * Validate a config value and return validation result
 */
export function validateConfigValue(
  key: ConfigKey,
  value: string
): { valid: boolean; warning?: string } {
  switch (key) {
    case 'registry': {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol)) {
          return {
            valid: false,
            warning: `Invalid protocol: ${url.protocol}. Only http and https are supported.`,
          };
        }
        return { valid: true };
      } catch {
        return { valid: false, warning: `Invalid URL format: ${value}` };
      }
    }

    case 'timeout': {
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, warning: `Timeout must be a number, got: ${value}` };
      }
      if (num <= 0) {
        return { valid: false, warning: `Timeout must be a positive number, got: ${value}` };
      }
      return { valid: true };
    }

    case 'telemetry': {
      if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return { valid: false, warning: `Telemetry must be true or false, got: ${value}` };
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse a config value from string to the appropriate type
 */
function parseConfigValue(key: ConfigKey, value: string): string | number | boolean {
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

/**
 * Convert a config value to string for display
 */
export function formatConfigValue(value: string | number | boolean | undefined): string {
  if (value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

/**
 * Check if a key is a valid config key
 */
export function isValidConfigKey(key: string): key is ConfigKey {
  return key in DEFAULT_CONFIG;
}

/**
 * Get the list of all valid config keys
 */
export function getValidConfigKeys(): ConfigKey[] {
  return Object.keys(DEFAULT_CONFIG) as ConfigKey[];
}

/**
 * Get the default value for a config key
 */
export function getDefaultValue(key: ConfigKey): string | number | boolean {
  return DEFAULT_CONFIG[key];
}

/**
 * Get the environment variable name for a config key
 */
export function getEnvVarName(key: ConfigKey): string {
  return ENV_VAR_MAP[key];
}
