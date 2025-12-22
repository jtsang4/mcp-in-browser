# Claude in Chrome

A browser automation Chrome extension that works with Claude Code via the Model Context Protocol (MCP). This project provides similar functionality to the official Claude in Chrome extension, but allows you to use your own models and APIs.

## Features

- **Browser Automation Tools**: Navigate, click elements, fill forms, take screenshots
- **Side Panel Chat Interface**: Chat with AI directly in the browser side panel
- **MCP Server Integration**: Works with Claude Code via stdio transport
- **Content Script Automation**: Interact with any web page using CSS selectors
- **Tab Management**: List, activate, and manage browser tabs

## Architecture

```
┌─────────────────┐     stdio/HTTP      ┌──────────────────┐
│   Claude Code   │ ◄─────────────────► │   MCP Server     │
│   (MCP Host)    │                     │  (index.ts)      │
└─────────────────┘                     └────────┬─────────┘
                                                 │
                                                 │ chrome.runtime
                                                 │ (Extension Messaging)
                                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Chrome Extension                             │
├─────────────────┬─────────────────┬─────────────────────────────┤
│  Background.js  │  Content Script │      Side Panel            │
│  - Message hub  │  - DOM actions  │   - Chat UI               │
│  - Tab mgmt     │  - Click/Fill   │   - Tool display          │
│  - Screenshots  │  - Page content │   - Context view           │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Installation

### 1. Build the Extension

```bash
# Install dependencies
pnpm install

# Build for Chrome
pnpm run build

# Or run in development mode
pnpm run dev
```

### 2. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `.output/chrome-mv3` directory

### 3. Configure MCP Server for Claude Code

**Simpler Configuration (Recommended)**

Add to your Claude Code settings (`~/.config/claude-code/config.json` or similar):

```json
{
  "mcpServers": {
    "claude-in-chrome": {
      "command": "tsx",
      "args": ["/Users/jtsang/Documents/playground/claude-in-chrome/mcp-server/index.ts"]
    }
  }
}
```

**Alternative: Using pnpm**

```json
{
  "mcpServers": {
    "claude-in-chrome": {
      "command": "pnpm",
      "args": ["run", "mcp-server"],
      "cwd": "/Users/jtsang/Documents/playground/claude-in-chrome"
    }
  }
}
```

**Alternative: Using npx (no installation needed)**

```json
{
  "mcpServers": {
    "claude-in-chrome": {
      "command": "npx",
      "args": ["-y", "tsx", "/Users/jtsang/Documents/playground/claude-in-chrome/mcp-server/index.ts"]
    }
  }
}
```

> **Note**: Replace `/Users/jtsang/Documents/playground/claude-in-chrome` with your actual project path.

## Available Tools

The MCP server exposes the following tools to Claude Code:

| Tool | Description | Parameters |
|------|-------------|------------|
| `navigate` | Navigate to a URL | `url`, `tabId?` |
| `click` | Click an element | `selector`, `tabId?` |
| `fill` | Fill an input field | `selector`, `value`, `tabId?` |
| `get_page_content` | Get page text/HTML | `selector?`, `tabId?` |
| `screenshot` | Capture page screenshot | `tabId?`, `format?`, `quality?` |
| `list_tabs` | List all open tabs | `activeOnly?` |
| `activate_tab` | Switch to a tab | `tabId` |
| `reload` | Reload current/tab | `tabId?` |
| `query_selector` | Find element details | `selector`, `tabId?` |
| `query_selector_all` | Find all matching elements | `selector`, `tabId?` |
| `get_form_values` | Get form input values | `selector?`, `tabId?` |

## Development

```bash
# Development (with hot reload)
pnpm run dev           # Chrome
pnpm run dev:firefox   # Firefox

# Type checking
pnpm run compile

# Production builds
pnpm run build           # Chrome
pnpm run build:firefox   # Firefox

# Create distributable packages
pnpm run zip             # Chrome
pnpm run zip:firefox     # Firefox

# Run MCP server directly (for testing)
pnpm run mcp-server
```

## Project Structure

```
claude-in-chrome/
├── entrypoints/
│   ├── background.ts       # Service worker (message hub)
│   ├── content.ts          # Content script (DOM automation)
│   ├── sidepanel/          # Side panel chat UI
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── style.css
│   └── popup/              # Extension popup (optional)
├── messaging/
│   └── protocol.ts         # Type-safe messaging protocol
├── mcp-server/
│   └── index.ts            # MCP server implementation
├── types/
│   └── index.ts            # TypeScript definitions
├── wxt.config.ts           # WXT framework config
└── package.json
```

## Usage Example

Once configured with Claude Code, you can ask questions like:

- "Navigate to google.com"
- "Click the search button"
- "Fill in the email field with test@example.com"
- "Take a screenshot of the current page"
- "List all open tabs"
- "What's the title of the current page?"

## Permissions

The extension requires the following Chrome permissions:

- `tabs` - Access tab information and management
- `activeTab` - Interact with the active tab
- `storage` - Store preferences and state
- `sidePanel` - Show the side panel UI
- `scripting` - Inject content scripts
- `<all_urls>` - Access all websites for automation

## Security Considerations

- The extension content script runs on all websites
- Always review AI-generated automation commands before execution
- Sensitive page data (passwords, tokens) is accessible to content scripts
- MCP server communication should be secured in production

## Limitations

- Content scripts cannot interact with browser chrome UI (settings, extensions pages)
- Some websites may block content script injection (CSP)
- File:// URLs require special Chrome configuration

## Roadmap

- [ ] Add support for file uploads
- [ ] Implement drag-and-drop automation
- [ ] Add visual element selection
- [ ] Create recording/playback feature
- [ ] Add multi-step workflow support

## License

MIT

## Credits

- Built with [WXT](https://wxt.dev/) - Web Extension Tools
- Uses [Vue 3](https://vuejs.org/) for UI
- MCP implementation based on [Model Context Protocol](https://modelcontextprotocol.io/)
