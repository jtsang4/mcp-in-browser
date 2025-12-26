/**
 * Background Script - WXT Entry Point
 *
 * This file uses the new modular architecture from src/background/
 */

import { defineBackground } from 'wxt/utils/define-background';
import { initialize } from '../src/background';

// Initialize the modular background system
initialize().catch((error) => {
  console.error('[Background] Failed to initialize:', error);
});

export default defineBackground(() => {
  console.log('[Background] MCP in Browser initialized');
});

