/**
 * Application Configuration
 * Re-exports from shared storage module
 */

// Re-export types and functions from shared storage
export {
  getConfig,
  updateConfig as saveConfig,
  resetConfig,
  getLogs,
  addLog,
  clearLogs,
  onConfigChanged,
  defaultAppConfig as defaultConfig,
} from '../../shared/storage';

export type { LogEntry } from '../../shared/storage';

// Re-export types from types/config
export type { LoggingConfig, BridgeConfig, AppConfig, TimeoutConfig, ConcurrencyConfig, getDefaultConfig } from '../../types/config';

// Keep loadConfig as an alias for getConfig for backward compatibility
import { getConfig as _getConfig, defaultAppConfig } from '../../shared/storage';

export async function loadConfig(): Promise<ReturnType<typeof _getConfig>> {
  return await _getConfig();
}
