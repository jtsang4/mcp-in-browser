/**
 * Background Script - WXT Entry Point
 *
 * This file uses the new modular architecture from src/background/
 */

import { defineBackground } from 'wxt/utils/define-background';
import { initialize } from '../src/background';

// Initialize the modular background system
export default defineBackground(() => {
  console.log('[Background] MCP in Browser initialized');
  
  // Initialize the modular background system within the service worker context
  initialize().catch((error) => {
    console.error('[Background] Failed to initialize:', error);
  });
});

