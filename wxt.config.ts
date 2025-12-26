import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'MCP in Browser',
    description: 'Browser automation extension that works with Claude Code via MCP',
    permissions: [
      'tabs',
      'activeTab',
      'storage',
      'scripting',
    ],
    host_permissions: ['<all_urls>'],
  },
  webExt: {
    disabled: false,
  },
});
