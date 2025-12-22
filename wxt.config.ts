import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'Claude in Chrome',
    description: 'Browser automation extension that works with Claude Code via MCP',
    permissions: [
      'tabs',
      'activeTab',
      'storage',
      'sidePanel',
      'scripting',
    ],
    host_permissions: ['<all_urls>'],
    side_panel: {
      default_path: 'sidepanel.html',
    },
  },
  webExt: {
    disabled: false,
  },
});
